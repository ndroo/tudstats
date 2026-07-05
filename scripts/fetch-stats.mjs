#!/usr/bin/env node
// Fetches recent matches for the tracked players from the official PUBG API
// and merges them into data/matches.json. For each match it also downloads
// the telemetry file and extracts weapon stats, parachute landings, movement
// paths and death locations for the tracked players.
//
// The PUBG API only retains matches for ~14 days, so this runs on a schedule
// (GitHub Actions) to accumulate history over time.
//
// Usage: PUBG_API_KEY=... node scripts/fetch-stats.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const matchesFile = path.join(dataDir, 'matches.json');
const metaFile = path.join(dataDir, 'meta.json');

const config = JSON.parse(readFileSync(path.join(dataDir, 'config.json'), 'utf8'));

const API_KEY = process.env.PUBG_API_KEY;
if (!API_KEY) {
  console.error('PUBG_API_KEY is not set.');
  process.exit(1);
}

const API = `https://api.pubg.com/shards/${config.shard}`;
const HEADERS = {
  Accept: 'application/vnd.api+json',
  Authorization: `Bearer ${API_KEY}`,
};

const MAP_NAMES = {
  Baltic_Main: 'Erangel',
  Erangel_Main: 'Erangel',
  Desert_Main: 'Miramar',
  Savage_Main: 'Sanhok',
  DihorOtok_Main: 'Vikendi',
  Summerland_Main: 'Karakin',
  Tiger_Main: 'Taego',
  Kiki_Main: 'Deston',
  Chimera_Main: 'Paramo',
  Heaven_Main: 'Haven',
  Neon_Main: 'Rondo',
  Range_Main: 'Camp Jackal',
};

// World size in cm (PUBG coordinates), used to normalize positions to 0..1.
const MAP_SIZES = {
  Baltic_Main: 816000,
  Erangel_Main: 816000,
  Desert_Main: 816000,
  Tiger_Main: 816000,
  Kiki_Main: 816000,
  Neon_Main: 816000,
  DihorOtok_Main: 612000,
  Savage_Main: 408000,
  Chimera_Main: 306000,
  Summerland_Main: 204000,
  Heaven_Main: 102000,
};

const PATH_SAMPLE_MS = 20000; // one movement point per player per 20s

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, headers = HEADERS, attempt = 0) {
  const res = await fetch(url, { headers });
  if (res.status === 429 && attempt < 3) {
    const wait = 15000 * (attempt + 1);
    console.log(`Rate limited, retrying in ${wait / 1000}s...`);
    await sleep(wait);
    return get(url, headers, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function pickStats(s) {
  return {
    kills: s.kills,
    assists: s.assists,
    dbnos: s.DBNOs,
    damage: Math.round(s.damageDealt),
    headshots: s.headshotKills,
    longestKill: Math.round(s.longestKill),
    revives: s.revives,
    timeSurvived: Math.round(s.timeSurvived),
    winPlace: s.winPlace,
    died: s.deathType !== 'alive',
  };
}

// Builds one match record. Tracked players' full stats are keyed by their
// canonical name; everyone else on their roster(s) is recorded as a "fill".
function parseMatch(match, canonicalNames) {
  const attrs = match.data.attributes;
  if (attrs.mapName === 'Range_Main') return null; // training range

  const byLower = new Map(canonicalNames.map((n) => [n.toLowerCase(), n]));
  const participants = new Map();
  const rosters = [];
  let telemetryUrl = null;
  for (const inc of match.included) {
    if (inc.type === 'participant') participants.set(inc.id, inc.attributes.stats);
    else if (inc.type === 'roster') rosters.push(inc);
    else if (inc.type === 'asset' && inc.attributes?.URL) telemetryUrl = inc.attributes.URL;
  }

  const players = {};
  const fills = [];
  let primary = null; // roster with the most tracked players
  for (const roster of rosters) {
    const members = roster.relationships.participants.data
      .map((p) => participants.get(p.id))
      .filter(Boolean);
    const ours = members.filter((s) => byLower.has(s.name.toLowerCase()));
    if (!ours.length) continue;
    if (!primary || ours.length > primary.ours.length) primary = { roster, ours };
    for (const s of members) {
      const canonical = byLower.get(s.name.toLowerCase());
      if (canonical) players[canonical] = pickStats(s);
      else fills.push({ name: s.name, kills: s.kills, damage: Math.round(s.damageDealt), dbnos: s.DBNOs });
    }
  }
  if (!primary) return null;

  return {
    record: {
      id: match.data.id,
      date: attrs.createdAt,
      map: MAP_NAMES[attrs.mapName] || attrs.mapName,
      mapId: attrs.mapName,
      mode: attrs.gameMode,
      matchType: attrs.matchType,
      duration: attrs.duration,
      totalTeams: rosters.length,
      teamRank: primary.roster.attributes.stats.rank,
      won: primary.roster.attributes.won === 'true',
      players,
      fills,
    },
    telemetryUrl,
  };
}

// Extracts tracked-player detail from a telemetry event log: weapon stats,
// landing spots, movement paths and death locations (normalized to 0..1).
function parseTelemetry(events, canonicalNames, mapId) {
  const size = MAP_SIZES[mapId];
  const byLower = new Map(canonicalNames.map((n) => [n.toLowerCase(), n]));
  const norm = size
    ? (loc) => [Math.round((loc.x / size) * 1000) / 1000, Math.round((loc.y / size) * 1000) / 1000]
    : null;

  const landings = {};
  const deaths = {};
  const paths = {};
  const weapons = {};
  const landedAt = {};
  const lastSample = {};

  const weaponEntry = (player, causer) => {
    const w = ((weapons[player] ??= {})[causer] ??= { kills: 0, knocks: 0, damage: 0, headshots: 0, longest: 0 });
    return w;
  };

  for (const ev of events) {
    switch (ev._T) {
      case 'LogParachuteLanding': {
        const name = byLower.get(ev.character?.name?.toLowerCase());
        if (!name) break;
        landedAt[name] = Date.parse(ev._D);
        if (norm && ev.character.location) landings[name] = norm(ev.character.location);
        break;
      }
      case 'LogPlayerPosition': {
        const name = byLower.get(ev.character?.name?.toLowerCase());
        if (!name || !norm || !ev.character.location) break;
        const t = Date.parse(ev._D);
        // only after this player hit the ground (skips lobby + plane)
        if (!(landedAt[name] <= t)) break;
        if (lastSample[name] && t - lastSample[name] < PATH_SAMPLE_MS) break;
        lastSample[name] = t;
        (paths[name] ??= []).push(norm(ev.character.location));
        break;
      }
      case 'LogPlayerKillV2': {
        const victim = byLower.get(ev.victim?.name?.toLowerCase());
        if (victim && norm && ev.victim.location) deaths[victim] = norm(ev.victim.location);
        const killer = byLower.get(ev.killer?.name?.toLowerCase());
        if (killer && ev.finishDamageInfo && ev.killer?.teamId !== ev.victim?.teamId) {
          let info = ev.finishDamageInfo;
          // Bleed-out finishes are credited to the knocker but recorded with a
          // player-pawn "weapon" and zero damage; the real weapon is the one
          // that caused the knock. Keep the pawn only for true melee punches.
          const pawnFinish = /^(PlayerMale|PlayerFemale|UltAIPawn)/.test(info.damageCauserName || '');
          if (ev.dBNODamageInfo?.damageCauserName &&
              (info.damageTypeCategory === 'Damage_Groggy' || (pawnFinish && info.damageTypeCategory !== 'Damage_Melee'))) {
            info = ev.dBNODamageInfo;
          }
          const w = weaponEntry(killer, info.damageCauserName || 'Unknown');
          w.kills += 1;
          if (info.damageReason === 'HeadShot') w.headshots += 1;
          const dist = Math.round((info.distance || 0) / 100);
          if (dist > w.longest) w.longest = dist;
        }
        break;
      }
      case 'LogPlayerMakeGroggy': {
        const name = byLower.get(ev.attacker?.name?.toLowerCase());
        if (name && ev.attacker?.teamId !== ev.victim?.teamId) {
          weaponEntry(name, ev.damageCauserName || 'Unknown').knocks += 1;
        }
        break;
      }
      case 'LogPlayerTakeDamage': {
        const name = byLower.get(ev.attacker?.name?.toLowerCase());
        if (name && ev.attacker?.teamId !== ev.victim?.teamId && ev.damage > 0) {
          weaponEntry(name, ev.damageCauserName || 'Unknown').damage += ev.damage;
        }
        break;
      }
    }
  }

  for (const perPlayer of Object.values(weapons)) {
    for (const w of Object.values(perPlayer)) w.damage = Math.round(w.damage);
  }
  return { landings, deaths, paths, weapons };
}

// --- main ---

const existing = existsSync(matchesFile) ? JSON.parse(readFileSync(matchesFile, 'utf8')) : [];
const known = new Set(existing.map((m) => m.id));

const filter = config.players.map(encodeURIComponent).join(',');
const lookup = await get(`${API}/players?filter%5BplayerNames%5D=${filter}`);

const foundNames = lookup.data.map((p) => p.attributes.name);
for (const name of config.players) {
  if (!foundNames.includes(name)) console.warn(`Warning: player "${name}" not found on shard ${config.shard}`);
}

const matchIds = new Set();
for (const player of lookup.data) {
  for (const m of player.relationships.matches.data) matchIds.add(m.id);
}
const newIds = [...matchIds].filter((id) => !known.has(id));
console.log(`${matchIds.size} recent matches, ${newIds.length} new.`);

const added = [];
for (const id of newIds) {
  try {
    const parsed = parseMatch(await get(`${API}/matches/${id}`), config.players);
    if (!parsed) continue;
    const { record, telemetryUrl } = parsed;
    if (telemetryUrl) {
      try {
        const events = await get(telemetryUrl, { Accept: 'application/vnd.api+json', 'Accept-Encoding': 'gzip' });
        record.tele = parseTelemetry(events, config.players, record.mapId);
      } catch (err) {
        console.warn(`Telemetry failed for ${id}: ${err.message}`);
        record.tele = null;
      }
    }
    added.push(record);
    console.log(`+ ${record.date} ${record.map} #${record.teamRank}`);
  } catch (err) {
    console.warn(`Skipping match ${id}: ${err.message}`);
  }
  await sleep(250);
}

// lifetime career stats (whole PUBG career — the match list above only ever
// covers the API's 14-day retention window)
const lifetime = {};
for (const player of lookup.data) {
  try {
    await sleep(6500); // players/seasons endpoints share the 10 req/min budget
    const res = await get(`${API}/players/${player.id}/seasons/lifetime`);
    lifetime[player.attributes.name] = res.data.attributes.gameModeStats;
  } catch (err) {
    console.warn(`Lifetime stats failed for ${player.attributes.name}: ${err.message}`);
  }
}
if (Object.keys(lifetime).length) {
  writeFileSync(
    path.join(dataDir, 'lifetime.json'),
    JSON.stringify({ fetchedAt: new Date().toISOString(), players: lifetime }) + '\n'
  );
}

const merged = [...existing, ...added].sort((a, b) => new Date(b.date) - new Date(a.date));
writeFileSync(matchesFile, JSON.stringify(merged) + '\n');
writeFileSync(
  metaFile,
  JSON.stringify({ lastUpdated: new Date().toISOString(), matchCount: merged.length }, null, 2) + '\n'
);
console.log(`Added ${added.length} matches. Total: ${merged.length}.`);
