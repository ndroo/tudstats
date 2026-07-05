import {
  el, svg, fmtInt, fmtDay, chartCard, lineChart, stackedColumns, hBars, sparkline,
  showTooltip, hideTooltip,
} from './charts.js';

const PLAYERS = [
  { name: 'ndroo', color: '#3987e5' },
  { name: 'Tnak9999', color: '#199e70' },
  { name: 'BLAKKOUT', color: '#c98500' },
];
const AGG = '#9085e9'; // team-aggregate hue (never a player)
const OUTCOME = { win: '#b7aef2', top10: '#9085e9', other: '#6a5ad0' };
const WEAPON_COLORS = ['#9085e9', '#e66767', '#008300', '#d55181'];
const OTHER = '#55534e';
const GOOD = '#4fd44f';
const BAD = '#e66767';

const MAP_ASSETS = {
  Baltic_Main: 'assets/maps/Erangel_Main.png',
  Erangel_Main: 'assets/maps/Erangel_Main.png',
  Desert_Main: 'assets/maps/Miramar_Main.png',
  Savage_Main: 'assets/maps/Sanhok_Main.png',
  DihorOtok_Main: 'assets/maps/Vikendi_Main.png',
  Summerland_Main: 'assets/maps/Karakin_Main.png',
  Chimera_Main: 'assets/maps/Paramo_Main.png',
  Tiger_Main: 'assets/maps/Taego_Main.png',
  Kiki_Main: 'assets/maps/Deston_Main.png',
  Neon_Main: 'assets/maps/Rondo_Main.png',
  Heaven_Main: 'assets/maps/Haven_Main.png',
};

const TYPE_LABEL = {
  official: 'Normal', airoyale: 'Casual', competitive: 'Ranked',
  seasonal: 'Event', event: 'Event', custom: 'Custom', arcade: 'Arcade',
};

const WEAPON_NAMES = {
  WeapHK416_C: 'M416', WeapAK47_C: 'AKM', WeapSCAR_L_C: 'SCAR-L', 'WeapSCAR-L_C': 'SCAR-L',
  WeapM16A4_C: 'M16A4', WeapBerylM762_C: 'Beryl M762', WeapMk47Mutant_C: 'Mk47 Mutant',
  WeapG36C_C: 'G36C', WeapQBZ95_C: 'QBZ95', WeapAUG_C: 'AUG', WeapACE32_C: 'ACE32',
  WeapK2_C: 'K2', WeapL6_C: 'FAMAS', WeapDuncansHK416_C: 'M416',
  WeapUMP_C: 'UMP45', WeapVector_C: 'Vector', WeapThompson_C: 'Tommy Gun',
  WeapUZI_C: 'Micro UZI', WeapMP5K_C: 'MP5K', WeapBizonPP19_C: 'PP-19 Bizon',
  WeapP90_C: 'P90', WeapMP9_C: 'MP9', WeapJS9_C: 'JS9',
  WeapKar98k_C: 'Kar98k', WeapM24_C: 'M24', WeapAWM_C: 'AWM', WeapMosinNagant_C: 'Mosin-Nagant',
  WeapWin94_C: 'Win94', WeapLynxAMR_C: 'Lynx AMR', WeapSKS_C: 'SKS', WeapMini14_C: 'Mini 14',
  WeapMk14_C: 'Mk14 EBR', WeapQBU88_C: 'QBU', WeapSLR_C: 'SLR', WeapVSS_C: 'VSS',
  WeapMk12_C: 'Mk12', WeapDragunov_C: 'Dragunov',
  WeapS1897_C: 'S1897', WeapS686_C: 'S686', WeapS12K_C: 'S12K', WeapDP12_C: 'DBS',
  WeapSawnoff_C: 'Sawed-off', WeapOriginS12_C: 'O12',
  WeapM249_C: 'M249', WeapDP28_C: 'DP-28', WeapMG3_C: 'MG3', WeapM134_C: 'Minigun',
  WeapM1911_C: 'P1911', WeapM9_C: 'P92', WeapNagantM1895_C: 'R1895', WeapRhino_C: 'R45',
  WeapG18_C: 'P18C', WeapDesertEagle_C: 'Deagle', WeapSkorpion_C: 'Skorpion',
  WeapCrossbow_1_C: 'Crossbow', WeapPanzerFaust100M1_C: 'Panzerfaust', WeapPanzerFaust100M_C: 'Panzerfaust',
  WeapMortar_C: 'Mortar', WeapM79_C: 'M79 Smoke',
  WeapPan_C: 'Pan', WeapMachete_C: 'Machete', WeapCowbar_C: 'Crowbar', WeapSickle_C: 'Sickle',
  ProjGrenade_C: 'Frag Grenade', ProjMolotov_C: 'Molotov', ProjC4_C: 'C4',
  ProjStickyGrenade_C: 'Sticky Bomb', ProjBluezoneGrenade_C: 'BZ Grenade',
  RedZoneBomb_C: 'Red Zone', Mortar_Projectile_C: 'Mortar', BattleRoyaleModeController_Def_C: 'Bluezone',
  PlayerMale_A_C: 'Fists', PlayerFemale_A_C: 'Fists', UltAIPawn_Base_Male_C: 'Fists', UltAIPawn_Base_Female_C: 'Fists',
};
const VEHICLE_HINTS = ['Uaz', 'Dacia', 'Buggy', 'Motorbike', 'Mirado', 'Rony', 'Coupe', 'Pickup', 'Niva', 'Porter',
  'Scooter', 'Bike', 'Boat', 'PG117', 'Aquarail', 'BRDM', 'Blanc', 'Motorglider', 'Airboat', 'Snowmobile', 'Snowbike',
  'Bear', 'Pillar', 'Food_Truck', 'ATV', 'Truck', 'Van', 'Tuk'];

function weaponName(id) {
  if (WEAPON_NAMES[id]) return WEAPON_NAMES[id];
  if (VEHICLE_HINTS.some((h) => id.toLowerCase().includes(h.toLowerCase()))) return 'Vehicle';
  return id.replace(/^(Weap|Proj|BP_)/, '').replace(/_C$/, '').replace(/_/g, ' ');
}

// ---------- state & data ----------

const state = {
  range: 'year',
  type: 'all',
  mapTab: null,
  mapLayer: 'heat',
  showAllMatches: false,
  showAllFills: false,
};

let ALL = [];
let META = {};
const imageCache = new Map();

async function boot() {
  const bust = `?v=${Date.now()}`;
  const [matches, meta] = await Promise.all([
    fetch(`data/matches.json${bust}`).then((r) => r.json()),
    fetch(`data/meta.json${bust}`).then((r) => r.json()).catch(() => ({})),
  ]);
  META = meta;
  ALL = matches
    .map((m) => ({ ...m, dateObj: new Date(m.date), isBR: m.matchType !== 'arcade' && !/tdm|teamdeathmatch/i.test(m.mode) }))
    .sort((a, b) => a.dateObj - b.dateObj);
  renderHeader();
  renderFilters();
  render();
}

const RANGES = [
  { key: '14d', label: '14d', days: 14 },
  { key: '30d', label: '30d', days: 30 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'year', label: 'This year', days: null },
  { key: 'all', label: 'All time', days: null },
];

function rangeBounds(key) {
  const now = new Date();
  const r = RANGES.find((x) => x.key === key);
  if (r?.days) {
    const from = new Date(now.getTime() - r.days * 86400000);
    return { from, to: now, days: r.days };
  }
  if (key === 'year') return { from: new Date(now.getFullYear(), 0, 1), to: now, days: null };
  return { from: null, to: now, days: null };
}

function currentSlice() {
  const { from } = rangeBounds(state.range);
  return ALL.filter((m) =>
    m.isBR &&
    (!from || m.dateObj >= from) &&
    (state.type === 'all' || m.matchType === state.type)
  );
}

// the window of equal length immediately before the current one, for deltas
function previousSlice() {
  const { from, days } = rangeBounds(state.range);
  if (!days || !from) return null;
  const prevFrom = new Date(from.getTime() - days * 86400000);
  return ALL.filter((m) =>
    m.isBR && m.dateObj >= prevFrom && m.dateObj < from &&
    (state.type === 'all' || m.matchType === state.type)
  );
}

// ---------- stat helpers ----------

const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
const fmt1 = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
const fmtPct = (n) => `${fmt1(n)}%`;

function teamStats(slice) {
  const s = { matches: slice.length, wins: 0, top10s: 0, placeSum: 0, kills: 0, best: null };
  for (const m of slice) {
    if (m.won) s.wins++;
    if (m.teamRank <= 10) s.top10s++;
    s.placeSum += m.teamRank;
    for (const [name, p] of Object.entries(m.players)) {
      s.kills += p.kills;
      if (!s.best || p.kills > s.best.kills) s.best = { kills: p.kills, name, match: m };
    }
  }
  s.winPct = pct(s.wins, s.matches);
  s.top10Pct = pct(s.top10s, s.matches);
  s.avgPlace = s.matches ? s.placeSum / s.matches : 0;
  return s;
}

function playerStats(slice, name) {
  const s = { games: 0, wins: 0, top10s: 0, kills: 0, deaths: 0, damage: 0, headshots: 0, longest: 0, survive: 0, mostKills: 0 };
  for (const m of slice) {
    const p = m.players[name];
    if (!p) continue;
    s.games++;
    if (m.won) s.wins++;
    if (m.teamRank <= 10) s.top10s++;
    s.kills += p.kills;
    if (p.died) s.deaths++;
    s.damage += p.damage;
    s.headshots += p.headshots;
    s.survive += p.timeSurvived;
    if (p.longestKill > s.longest) s.longest = p.longestKill;
    if (p.kills > s.mostKills) s.mostKills = p.kills;
  }
  s.kd = s.deaths ? s.kills / s.deaths : s.kills;
  s.adr = s.games ? s.damage / s.games : 0;
  s.winPct = pct(s.wins, s.games);
  s.top10Pct = pct(s.top10s, s.games);
  s.hsPct = pct(s.headshots, s.kills);
  s.avgSurvive = s.games ? s.survive / s.games : 0;
  return s;
}

// split a slice into n time buckets and evaluate a stat per bucket (for tile sparklines)
function bucketTrend(slice, n, statFn) {
  if (slice.length < 4) return [];
  const t0 = slice[0].dateObj.getTime();
  const t1 = slice[slice.length - 1].dateObj.getTime() + 1;
  const buckets = Array.from({ length: n }, () => []);
  for (const m of slice) {
    const i = Math.min(n - 1, Math.floor(((m.dateObj.getTime() - t0) / (t1 - t0)) * n));
    buckets[i].push(m);
  }
  return buckets.filter((b) => b.length).map(statFn);
}

function deltaBadge(cur, prev, { invert = false, suffix = '%' } = {}) {
  if (prev == null || !isFinite(prev) || prev === 0) return null;
  const change = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(change) || Math.abs(change) < 0.05) return null;
  const up = change > 0;
  const good = invert ? !up : up;
  return el('span', {
    class: 'delta',
    style: `color:${good ? GOOD : BAD}`,
    title: `vs previous period`,
  }, `${up ? '▲' : '▼'} ${fmt1(Math.abs(change))}${suffix}`);
}

const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

// ---------- header & filters ----------

function renderHeader() {
  const sub = document.getElementById('header-sub');
  sub.replaceChildren(
    ...PLAYERS.map((p) =>
      el('span', { class: 'player-key' }, [el('span', { class: 'dot', style: `background:${p.color}` }), p.name])
    ),
    el('span', { class: 'updated' },
      META.lastUpdated
        ? `${ALL.length} matches tracked · updated ${new Date(META.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
        : `${ALL.length} matches tracked`)
  );
}

function renderFilters() {
  const bar = document.getElementById('filters');
  const rangeSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Date range' },
    RANGES.map((r) =>
      el('button', {
        'aria-pressed': String(state.range === r.key),
        onclick: (ev) => {
          state.range = r.key;
          for (const b of ev.currentTarget.parentNode.children) b.setAttribute('aria-pressed', 'false');
          ev.currentTarget.setAttribute('aria-pressed', 'true');
          render();
        },
      }, r.label)
    )
  );

  const types = [...new Set(ALL.filter((m) => m.isBR).map((m) => m.matchType))];
  const typeSel = el('select', {
    'aria-label': 'Match type',
    onchange: (ev) => { state.type = ev.currentTarget.value; render(); },
  }, [
    el('option', { value: 'all' }, 'All match types'),
    ...types.map((t) => el('option', { value: t }, TYPE_LABEL[t] || t)),
  ]);

  bar.replaceChildren(rangeSeg, typeSel);
}

// ---------- KPI row ----------

function kpiTile({ label, value, note, delta, trend }) {
  return el('div', { class: 'tile' }, [
    el('div', { class: 'label' }, label),
    el('div', { class: 'value' }, value),
    (delta || note) ? el('div', { class: 'note' }, [delta, delta && note ? ' · ' : null, note]) : null,
    trend && trend.length > 3 ? el('div', { class: 'tile-spark' }, sparkline(trend, { width: 130, height: 26, accent: AGG })) : null,
  ]);
}

function renderKPIs(slice, prev) {
  const s = teamStats(slice);
  const p = prev && prev.length >= 3 ? teamStats(prev) : null;
  const tiles = [
    kpiTile({
      label: 'Matches', value: fmtInt(s.matches),
      delta: p && deltaBadge(s.matches, p.matches),
      trend: bucketTrend(slice, 12, (b) => b.length),
    }),
    kpiTile({
      label: 'Chicken dinners', value: `🍗 ${fmtInt(s.wins)}`,
      delta: p && deltaBadge(s.wins, p.wins),
      trend: bucketTrend(slice, 12, (b) => b.filter((m) => m.won).length),
    }),
    kpiTile({
      label: 'Win rate', value: fmtPct(s.winPct),
      delta: p && deltaBadge(s.winPct, p.winPct),
      trend: bucketTrend(slice, 12, (b) => pct(b.filter((m) => m.won).length, b.length)),
    }),
    kpiTile({
      label: 'Top-10 rate', value: fmtPct(s.top10Pct),
      delta: p && deltaBadge(s.top10Pct, p.top10Pct),
      trend: bucketTrend(slice, 12, (b) => pct(b.filter((m) => m.teamRank <= 10).length, b.length)),
    }),
    kpiTile({
      label: 'Avg placement', value: s.matches ? `#${fmt1(s.avgPlace)}` : '—',
      delta: p && deltaBadge(s.avgPlace, p.avgPlace, { invert: true }),
      trend: bucketTrend(slice, 12, (b) => b.reduce((t, m) => t + m.teamRank, 0) / b.length),
    }),
    kpiTile({
      label: 'Squad kills', value: fmtInt(s.kills),
      delta: p && deltaBadge(s.kills, p.kills),
      note: s.best?.kills ? `best: ${s.best.kills} (${s.best.name})` : null,
      trend: bucketTrend(slice, 12, (b) => b.reduce((t, m) => t + Object.values(m.players).reduce((x, q) => x + q.kills, 0), 0)),
    }),
  ];
  return el('section', { class: 'kpis' }, tiles);
}

// ---------- player cards ----------

function statCell(label, value, delta) {
  return el('div', { class: 'stat' }, [
    el('div', { class: 'v' }, [value, delta ? el('span', { class: 'stat-delta' }, [' ', delta]) : null]),
    el('div', { class: 'k' }, label),
  ]);
}

function renderPlayers(slice, prev) {
  const cards = PLAYERS.map((pl) => {
    const s = playerStats(slice, pl.name);
    const p = prev && prev.length >= 3 ? playerStats(prev, pl.name) : null;
    const dmgHistory = slice.filter((m) => m.players[pl.name]).map((m) => m.players[pl.name].damage).slice(-14);
    return el('div', { class: 'player-card' }, [
      el('div', { class: 'bar', style: `background:${pl.color}` }),
      el('div', { class: 'inner' }, [
        el('h3', {}, [el('span', { class: 'dot', style: `background:${pl.color}` }), pl.name,
          el('span', { class: 'pill', style: 'margin-left:auto' }, `${s.games} games`)]),
        el('div', { class: 'stats' }, [
          statCell('K/D', fmt1(s.kd), p && deltaBadge(s.kd, p.kd)),
          statCell('Avg damage', fmtInt(s.adr), p && deltaBadge(s.adr, p.adr)),
          statCell('Kills', fmtInt(s.kills), p && deltaBadge(s.kills, p.kills)),
          statCell('Win rate', fmtPct(s.winPct), p && deltaBadge(s.winPct, p.winPct)),
          statCell('Top-10 rate', fmtPct(s.top10Pct), p && deltaBadge(s.top10Pct, p.top10Pct)),
          statCell('Headshot %', fmtPct(s.hsPct), p && deltaBadge(s.hsPct, p.hsPct)),
          statCell('Longest kill', s.longest ? `${fmtInt(s.longest)}m` : '—', null),
          statCell('Most kills', fmtInt(s.mostKills), null),
          statCell('Avg survival', s.games ? fmtClock(s.avgSurvive) : '—', p && deltaBadge(s.avgSurvive, p.avgSurvive)),
        ]),
        dmgHistory.length > 3
          ? el('div', { class: 'spark' }, [
              el('div', { class: 'spark-label' }, 'damage, last games'),
              sparkline(dmgHistory, { width: 260, height: 34, accent: pl.color }),
            ])
          : null,
      ]),
    ]);
  });
  return el('section', { class: 'players' }, cards);
}

// ---------- time-series charts ----------

// matches cluster into evening sessions, so per-day averages read far better
// than per-match points on a time axis
function dailySeries(slice, statFn) {
  return PLAYERS.map((pl) => {
    const byDay = new Map();
    for (const m of slice) {
      const p = m.players[pl.name];
      if (!p) continue;
      const day = new Date(m.dateObj.getFullYear(), m.dateObj.getMonth(), m.dateObj.getDate()).getTime();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(statFn(p, m));
    }
    const pts = [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, vals]) => ({ x: new Date(day), y: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) }));
    return { name: pl.name, color: pl.color, points: pts };
  }).filter((s) => s.points.length);
}

function weekKey(d, monthly) {
  if (monthly) return new Date(d.getFullYear(), d.getMonth(), 1);
  const day = (d.getDay() + 6) % 7; // Monday start
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return monday;
}

function timeBuckets(slice) {
  if (!slice.length) return { buckets: [], monthly: false };
  const spanDays = (slice[slice.length - 1].dateObj - slice[0].dateObj) / 86400000;
  const monthly = spanDays > 120;
  const map = new Map();
  for (const m of slice) {
    const k = weekKey(m.dateObj, monthly).getTime();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(m);
  }
  const buckets = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([t, ms]) => ({
    start: new Date(t),
    label: monthly
      ? new Date(t).toLocaleDateString('en-US', { month: 'short' })
      : fmtDay(new Date(t)),
    matches: ms,
  }));
  return { buckets, monthly };
}

function renderCharts(slice) {
  const grid = el('section', { class: 'chart-grid' });

  // 1 — damage over time (per-day average per player)
  const dmgSeries = dailySeries(slice, (p) => p.damage);
  grid.append(chartCard({
    title: 'Average damage per match',
    hint: 'averaged per day played',
    span2: true,
    legend: PLAYERS.map((p) => ({ name: p.name, color: p.color })),
    table: {
      columns: ['Date', ...PLAYERS.map((p) => p.name)],
      rows: [...slice].reverse().map((m) => [
        m.dateObj.toLocaleDateString(),
        ...PLAYERS.map((p) => (m.players[p.name] ? fmtInt(m.players[p.name].damage) : '—')),
      ]),
    },
    render: (body) => lineChart(body, { series: dmgSeries }),
  }));

  // 2 — outcomes per week/month (ordinal ramp: brighter = better)
  const { buckets, monthly } = timeBuckets(slice);
  const outcomeBuckets = buckets.map((b) => {
    const wins = b.matches.filter((m) => m.won).length;
    const top10 = b.matches.filter((m) => !m.won && m.teamRank <= 10).length;
    return {
      label: b.label,
      title: monthly ? b.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `Week of ${fmtDay(b.start)}`,
      segments: [
        { name: 'Wins', color: OUTCOME.win, value: wins },
        { name: 'Top 10', color: OUTCOME.top10, value: top10 },
        { name: 'Other', color: OUTCOME.other, value: b.matches.length - wins - top10 },
      ],
    };
  });
  grid.append(chartCard({
    title: `Matches per ${monthly ? 'month' : 'week'}`,
    legend: [
      { name: 'Wins', color: OUTCOME.win, shape: 'rect' },
      { name: 'Top 10', color: OUTCOME.top10, shape: 'rect' },
      { name: 'Other', color: OUTCOME.other, shape: 'rect' },
    ],
    table: {
      columns: [monthly ? 'Month' : 'Week', 'Wins', 'Top 10', 'Other', 'Total'],
      rows: outcomeBuckets.map((b) => [
        b.title, ...b.segments.map((s) => fmtInt(s.value)), fmtInt(b.segments.reduce((a, s) => a + s.value, 0)),
      ]),
    },
    render: (body) => stackedColumns(body, { buckets: outcomeBuckets }),
  }));

  // 3 — placement spread
  const bins = [
    { label: '#1', test: (r) => r === 1 },
    { label: '2–5', test: (r) => r >= 2 && r <= 5 },
    { label: '6–10', test: (r) => r >= 6 && r <= 10 },
    { label: '11–20', test: (r) => r >= 11 && r <= 20 },
    { label: '21+', test: (r) => r >= 21 },
  ];
  const placeBuckets = bins.map((b) => ({
    label: b.label,
    title: `Placement ${b.label}`,
    segments: [{ name: 'Matches', color: AGG, value: slice.filter((m) => b.test(m.teamRank)).length }],
  }));
  grid.append(chartCard({
    title: 'Team placement spread',
    table: {
      columns: ['Placement', 'Matches', 'Share'],
      rows: placeBuckets.map((b) => [b.label, fmtInt(b.segments[0].value), fmtPct(pct(b.segments[0].value, slice.length))]),
    },
    render: (body) => stackedColumns(body, { buckets: placeBuckets }),
  }));

  // 4 — K/D trend per player
  const kdSeries = PLAYERS.map((pl) => ({
    name: pl.name,
    color: pl.color,
    points: buckets
      .map((b) => {
        const games = b.matches.filter((m) => m.players[pl.name]);
        if (!games.length) return null;
        const kills = games.reduce((a, m) => a + m.players[pl.name].kills, 0);
        const deaths = games.filter((m) => m.players[pl.name].died).length;
        return { x: b.start, y: Math.round((deaths ? kills / deaths : kills) * 100) / 100 };
      })
      .filter(Boolean),
  })).filter((s) => s.points.length);
  grid.append(chartCard({
    title: `K/D per ${monthly ? 'month' : 'week'}`,
    legend: PLAYERS.map((p) => ({ name: p.name, color: p.color })),
    table: {
      columns: [monthly ? 'Month' : 'Week', ...PLAYERS.map((p) => p.name)],
      rows: buckets.map((b) => [
        b.label,
        ...PLAYERS.map((pl) => {
          const games = b.matches.filter((m) => m.players[pl.name]);
          if (!games.length) return '—';
          const kills = games.reduce((a, m) => a + m.players[pl.name].kills, 0);
          const deaths = games.filter((m) => m.players[pl.name].died).length;
          return fmt1(deaths ? kills / deaths : kills);
        }),
      ]),
    },
    render: (body) => lineChart(body, { series: kdSeries, yFmt: fmt1 }),
  }));

  return grid;
}

// ---------- guns ----------

function weaponTotals(slice) {
  const agg = new Map();
  for (const m of slice) {
    if (!m.tele?.weapons) continue;
    for (const per of Object.values(m.tele.weapons)) {
      for (const [id, st] of Object.entries(per)) {
        const name = weaponName(id);
        const w = agg.get(name) || { kills: 0, knocks: 0, damage: 0, headshots: 0, longest: 0 };
        w.kills += st.kills; w.knocks += st.knocks; w.damage += st.damage; w.headshots += st.headshots;
        w.longest = Math.max(w.longest, st.longest);
        agg.set(name, w);
      }
    }
  }
  return [...agg.entries()]
    .map(([name, w]) => ({ name, ...w }))
    .sort((a, b) => b.kills - a.kills || b.damage - a.damage);
}

function renderGuns(slice) {
  const totals = weaponTotals(slice).filter((w) => w.kills > 0 || w.damage > 200);
  const grid = el('section', { class: 'chart-grid' });

  // overview: top weapons by kills
  const top = totals.slice(0, 8);
  grid.append(chartCard({
    title: 'Top weapons',
    hint: 'squad kills',
    table: {
      columns: ['Weapon', 'Kills', 'Knocks', 'Damage', 'HS kills', 'Longest'],
      rows: totals.slice(0, 20).map((w) => [w.name, fmtInt(w.kills), fmtInt(w.knocks), fmtInt(w.damage), fmtInt(w.headshots), w.longest ? `${w.longest}m` : '—']),
    },
    render: (body) => hBars(body, {
      items: top.map((w) => ({ label: w.name, value: w.kills, note: `${fmtInt(w.damage)} dmg` })),
      color: AGG,
    }),
  }));

  // over time: kills per bucket for the top 4 weapons + Other
  const { buckets, monthly } = timeBuckets(slice.filter((m) => m.tele?.weapons));
  const top4 = totals.slice(0, 4).map((w) => w.name);
  const gunBuckets = buckets.map((b) => {
    const counts = new Map();
    for (const m of b.matches) {
      for (const per of Object.values(m.tele.weapons)) {
        for (const [id, st] of Object.entries(per)) {
          const name = weaponName(id);
          counts.set(name, (counts.get(name) || 0) + st.kills);
        }
      }
    }
    let other = 0;
    for (const [name, v] of counts) if (!top4.includes(name)) other += v;
    return {
      label: b.label,
      title: monthly ? b.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `Week of ${fmtDay(b.start)}`,
      segments: [
        ...top4.map((name, i) => ({ name, color: WEAPON_COLORS[i], value: counts.get(name) || 0 })),
        { name: 'Other', color: OTHER, value: other },
      ],
    };
  });
  grid.append(chartCard({
    title: `Weapon kills per ${monthly ? 'month' : 'week'}`,
    legend: [
      ...top4.map((name, i) => ({ name, color: WEAPON_COLORS[i], shape: 'rect' })),
      { name: 'Other', color: OTHER, shape: 'rect' },
    ],
    table: {
      columns: [monthly ? 'Month' : 'Week', ...top4, 'Other'],
      rows: gunBuckets.map((b) => [b.title, ...b.segments.map((s) => fmtInt(s.value))]),
    },
    render: (body) => stackedColumns(body, { buckets: gunBuckets }),
  }));

  const section = el('section', { class: 'block' }, [
    el('div', { class: 'section-head' }, [el('h2', {}, 'Guns'), el('span', { class: 'desc' }, 'from match telemetry — kills, knocks and damage by weapon')]),
    grid,
  ]);
  return section;
}

// ---------- map heat ----------

const gridRef = (x, y) => `${String.fromCharCode(65 + Math.min(7, Math.floor(x * 8)))}${Math.min(7, Math.floor(y * 8)) + 1}`;

function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    }));
  }
  return imageCache.get(src);
}

const HEAT_STOPS = [
  [0.0, [106, 90, 208, 0]],
  [0.3, [106, 90, 208, 140]],
  [0.6, [144, 133, 233, 190]],
  [0.85, [183, 174, 242, 225]],
  [1.0, [236, 232, 255, 245]],
];

function heatColor(t) {
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [t1, c1] = HEAT_STOPS[i];
    const [t0, c0] = HEAT_STOPS[i - 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return c0.map((a, j) => Math.round(a + (c1[j] - a) * f));
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
}

async function drawMap(canvas, mapId, matches, layer) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width; // square, already scaled for DPR
  try {
    const img = await loadImage(MAP_ASSETS[mapId]);
    ctx.drawImage(img, 0, 0, size, size);
  } catch {
    ctx.fillStyle = '#222220';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = 'rgba(13,13,13,0.28)'; // dim the map so the data reads first
  ctx.fillRect(0, 0, size, size);

  if (layer === 'heat') {
    const res = 180;
    const off = document.createElement('canvas');
    off.width = off.height = res;
    const octx = off.getContext('2d');
    for (const m of matches) {
      for (const path of Object.values(m.tele?.paths || {})) {
        for (const [x, y] of path) {
          const g = octx.createRadialGradient(x * res, y * res, 0, x * res, y * res, 5);
          g.addColorStop(0, 'rgba(255,255,255,0.10)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          octx.fillStyle = g;
          octx.fillRect(x * res - 5, y * res - 5, 10, 10);
        }
      }
    }
    const data = octx.getImageData(0, 0, res, res);
    const out = octx.createImageData(res, res);
    for (let i = 0; i < res * res; i++) {
      const a = data.data[i * 4 + 3] / 255;
      if (a <= 0.01) continue;
      const t = Math.min(1, Math.pow(a * 2.2, 0.7));
      const [r, g, b, al] = heatColor(t);
      out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = al;
    }
    octx.putImageData(out, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, size, size);
  } else {
    const key = layer === 'landings' ? 'landings' : 'deaths';
    const r = Math.max(4, size / 150);
    for (const m of matches) {
      const spots = m.tele?.[key] || {};
      for (const pl of PLAYERS) {
        const spot = spots[pl.name];
        if (!spot) continue;
        ctx.beginPath();
        ctx.arc(spot[0] * size, spot[1] * size, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a19';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(spot[0] * size, spot[1] * size, r, 0, Math.PI * 2);
        ctx.fillStyle = pl.color;
        ctx.fill();
      }
    }
  }
}

function renderMaps(slice) {
  const teleMatches = slice.filter((m) => m.tele && MAP_ASSETS[m.mapId]);
  const byMap = new Map();
  for (const m of teleMatches) {
    if (!byMap.has(m.mapId)) byMap.set(m.mapId, []);
    byMap.get(m.mapId).push(m);
  }
  const mapsSorted = [...byMap.entries()].sort((a, b) => b[1].length - a[1].length);

  const card = el('div', { class: 'card' });
  card.append(
    el('h2', {}, 'Where we play'),
    el('div', { class: 'desc' }, 'movement heat, landing spots and death spots from telemetry')
  );

  if (!mapsSorted.length) {
    card.append(el('div', { class: 'empty' }, 'No location data in this range'));
    return el('section', { class: 'block' }, card);
  }

  if (!state.mapTab || !byMap.has(state.mapTab)) state.mapTab = mapsSorted[0][0];

  const tabs = el('div', { class: 'seg map-tabs', role: 'group', 'aria-label': 'Map' },
    mapsSorted.map(([mapId, ms]) =>
      el('button', {
        'aria-pressed': String(state.mapTab === mapId),
        onclick: () => { state.mapTab = mapId; render(); },
      }, `${ms[0].map} (${ms.length})`)
    )
  );

  const layers = [
    { key: 'heat', label: 'Time spent' },
    { key: 'landings', label: 'Landings' },
    { key: 'deaths', label: 'Deaths' },
  ];
  const layerSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Layer' },
    layers.map((l) =>
      el('button', {
        'aria-pressed': String(state.mapLayer === l.key),
        onclick: () => { state.mapLayer = l.key; render(); },
      }, l.label)
    )
  );

  const current = byMap.get(state.mapTab);

  // legend: players for marker layers, ramp for heat
  const legend = state.mapLayer === 'heat'
    ? el('div', { class: 'legend heat-legend' }, [
        el('span', { class: 'item' }, 'less time'),
        el('span', { class: 'ramp' }),
        el('span', { class: 'item' }, 'more time'),
      ])
    : el('div', { class: 'legend' }, PLAYERS.map((p) =>
        el('span', { class: 'item' }, [el('span', { class: 'dot', style: `background:${p.color}` }), p.name])
      ));

  const holder = el('div', { class: 'map-holder' });
  const cssSize = Math.min(680, Math.max(300, (card.clientWidth || document.getElementById('main').clientWidth || 800) - 34));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = el('canvas', { width: cssSize * dpr, height: cssSize * dpr, style: `width:${cssSize}px;height:${cssSize}px` });
  holder.append(canvas);
  drawMap(canvas, state.mapTab, current, state.mapLayer);

  // table twin: grid references per match
  const tableWrap = el('div', { class: 'table-scroll chart-table', hidden: '' });
  tableWrap.append(el('table', { class: 'data' }, [
    el('thead', {}, el('tr', {}, [el('th', {}, 'Date'), el('th', {}, 'Place'),
      ...PLAYERS.map((p) => el('th', {}, `${p.name} land`)), ...PLAYERS.map((p) => el('th', {}, `${p.name} death`))])),
    el('tbody', {}, [...current].reverse().map((m) => el('tr', {}, [
      el('td', {}, m.dateObj.toLocaleDateString()),
      el('td', {}, `#${m.teamRank}`),
      ...PLAYERS.map((p) => el('td', {}, m.tele.landings?.[p.name] ? gridRef(...m.tele.landings[p.name]) : '—')),
      ...PLAYERS.map((p) => el('td', {}, m.tele.deaths?.[p.name] ? gridRef(...m.tele.deaths[p.name]) : '—')),
    ]))),
  ]));

  const tableToggle = el('button', {
    class: 'table-toggle', 'aria-pressed': 'false',
    onclick: () => {
      const show = tableToggle.getAttribute('aria-pressed') !== 'true';
      tableToggle.setAttribute('aria-pressed', String(show));
      holder.hidden = show;
      tableWrap.hidden = !show;
    },
  }, 'Table');

  card.append(
    el('div', { class: 'map-controls' }, [tabs, layerSeg, tableToggle]),
    legend,
    holder,
    tableWrap
  );
  return el('section', { class: 'block' }, card);
}

// ---------- fills (random teammates) ----------

function renderFills(slice) {
  const agg = new Map();
  for (const m of slice) {
    for (const f of m.fills) {
      const cur = agg.get(f.name) || { games: 0, wins: 0, kills: 0, damage: 0, last: null, lastMatch: null };
      cur.games++;
      if (m.won) cur.wins++;
      cur.kills += f.kills;
      cur.damage += f.damage;
      if (!cur.last || m.dateObj > cur.last) { cur.last = m.dateObj; cur.lastMatch = m; }
      agg.set(f.name, cur);
    }
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].games - a[1].games || b[1].last - a[1].last);
  const card = el('div', { class: 'card' });
  card.append(
    el('h2', {}, 'Squad-fill roulette'),
    el('div', { class: 'desc' }, `randoms we've been matched with — ${rows.length} of them`)
  );
  if (!rows.length) {
    card.append(el('div', { class: 'empty' }, 'No fill teammates in this range'));
    return el('section', { class: 'block' }, card);
  }
  const shown = state.showAllFills ? rows : rows.slice(0, 12);
  card.append(el('div', { class: 'table-scroll' }, el('table', { class: 'data' }, [
    el('thead', {}, el('tr', {}, ['Teammate', 'Games', 'Wins together', 'Avg kills', 'Avg damage', 'Last squad-up'].map((h) => el('th', {}, h)))),
    el('tbody', {}, shown.map(([name, s]) => el('tr', {}, [
      el('td', { class: 'strong' }, name),
      el('td', {}, fmtInt(s.games)),
      el('td', {}, s.wins ? `🍗 ${s.wins}` : '0'),
      el('td', {}, fmt1(s.kills / s.games)),
      el('td', {}, fmtInt(s.damage / s.games)),
      el('td', {}, s.last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    ]))),
  ])));
  if (rows.length > 12) {
    card.append(el('button', {
      class: 'show-more',
      onclick: () => { state.showAllFills = !state.showAllFills; render(); },
    }, state.showAllFills ? 'Show fewer' : `Show all ${rows.length}`));
  }
  return el('section', { class: 'block' }, card);
}

// ---------- match list ----------

function placeBadge(m) {
  if (m.won) return el('span', { class: 'badge win' }, '🍗 #1');
  if (m.teamRank <= 10) return el('span', { class: 'badge top10' }, `#${m.teamRank}`);
  return el('span', { class: 'badge rest' }, `#${m.teamRank}/${m.totalTeams}`);
}

function renderMatches(slice) {
  const card = el('div', { class: 'card' });
  card.append(el('h2', {}, 'Match log'), el('div', { class: 'desc' }, 'every game, newest first — player cells show kills · damage, replay opens on pubg.sh'));
  if (!slice.length) {
    card.append(el('div', { class: 'empty' }, 'No matches in this range'));
    return el('section', { class: 'block' }, card);
  }
  const rows = [...slice].reverse();
  const shown = state.showAllMatches ? rows : rows.slice(0, 15);
  card.append(el('div', { class: 'table-scroll' }, el('table', { class: 'data' }, [
    el('thead', {}, el('tr', {}, [
      'Date', 'Map', 'Mode', 'Place',
      ...PLAYERS.map((p) => p.name), 'Fills', 'Replay',
    ].map((h) => el('th', {}, h)))),
    el('tbody', {}, shown.map((m) => {
      const anchor = PLAYERS.find((p) => m.players[p.name]);
      return el('tr', {}, [
        el('td', {}, m.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
          m.dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })),
        el('td', { class: 'strong' }, m.map),
        el('td', {}, [
          m.mode.replace('-fpp', '').replace(/^\w/, (c) => c.toUpperCase()) + (m.mode.includes('fpp') ? ' FPP' : ''),
          ' ',
          TYPE_LABEL[m.matchType] && m.matchType !== 'official' ? el('span', { class: 'pill' }, TYPE_LABEL[m.matchType]) : null,
        ]),
        el('td', {}, placeBadge(m)),
        ...PLAYERS.map((p) => {
          const st = m.players[p.name];
          return el('td', {}, st ? `${st.kills} · ${fmtInt(st.damage)}` : '—');
        }),
        el('td', {}, m.fills.length ? m.fills.map((f) => f.name).join(', ') : '—'),
        el('td', {}, anchor
          ? el('a', {
              class: 'pill', target: '_blank', rel: 'noopener noreferrer',
              href: `https://pubg.sh/${encodeURIComponent(anchor.name)}/steam/${m.id}`,
            }, 'Replay ↗')
          : '—'),
      ]);
    })),
  ])));
  if (rows.length > 15) {
    card.append(el('button', {
      class: 'show-more',
      onclick: () => { state.showAllMatches = !state.showAllMatches; render(); },
    }, state.showAllMatches ? 'Show fewer' : `Show all ${rows.length}`));
  }
  return el('section', { class: 'block' }, card);
}

// ---------- render root ----------

function render() {
  const slice = currentSlice();
  const prev = previousSlice();
  const main = document.getElementById('main');
  main.replaceChildren(
    renderKPIs(slice, prev),
    renderPlayers(slice, prev),
    renderCharts(slice),
    renderGuns(slice),
    renderMaps(slice),
    renderFills(slice),
    renderMatches(slice)
  );
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 180);
});

boot().catch((err) => {
  document.getElementById('main').replaceChildren(
    el('div', { class: 'card' }, [el('h2', {}, 'Failed to load data'), el('div', { class: 'desc' }, String(err))])
  );
});
