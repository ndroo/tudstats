# TUD STATS

PUBG squad tracker for **ndroo**, **Tnak9999** and **BLAKKOUT**, published at
https://ndroo.github.io/tudstats/.

A GitHub Actions cron job pulls new matches from the official PUBG API every
3 hours (the API only retains ~14 days of matches, so history accumulates in
this repo under `data/matches.json`). For each match it also parses the
telemetry event log to extract weapon stats, parachute landings, movement
paths and death locations. The site itself is fully static — plain HTML/JS
rendering SVG charts and canvas heatmaps from the committed JSON.

## Features

- Season/year overview with trend deltas vs the previous period
- Per-player cards: K/D, avg damage, win %, top-10 %, headshot %, longest kill
- Damage and K/D trends over time, matches by outcome, placement spread
- Gun stats: top weapons and weapon kills over time (from telemetry)
- Per-map heatmaps: time spent, landing spots, death spots
- "Squad-fill roulette": every random we've been matched with and how it went
- Match log with [pubg.sh](https://pubg.sh) replay links

## Setup (one time)

1. **API key** — register at https://developer.pubg.com/ and create an app.
2. **Repo secret** — in GitHub: Settings → Secrets and variables → Actions →
   New repository secret, name `PUBG_API_KEY`, value = your key.
3. **GitHub Pages** — Settings → Pages → Source: *Deploy from a branch*,
   branch `main`, folder `/ (root)`.
4. Run the *Update PUBG stats* workflow once manually (Actions tab →
   Update PUBG stats → Run workflow), or just wait for the next cron tick.

## Local development

```sh
PUBG_API_KEY=... node scripts/fetch-stats.mjs   # refresh data/
python3 -m http.server 8000                      # then open http://localhost:8000
```

Tracked players and shard live in `data/config.json`. Map images are the
official low-res assets from [pubg/api-assets](https://github.com/pubg/api-assets)
(© KRAFTON).
