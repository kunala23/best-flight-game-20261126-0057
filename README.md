# Merapi Courier — a flight game

[![Make the best flight game](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/kunala23/best-flight-game-20261126-0057/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/kunala23/best-flight-game-20261126-0057/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A bush-pilot flight game across the valley of Gunung Bara. Fly the little
red courier PK-MRP through golden rings, mind the fuel, and bring her home
to runway 09 — three sorties, from a dawn mail run to a gusty ridge flight
past the volcano.

## How to play

Serve `game/` with any static server (or run `node serve.ts`) and open it in
desktop Chrome. No network requests: every script, sound and pixel is made
by the game's own files.

- **W/S or ↑/↓** — throttle
- **←/→ or A/D** — pitch (climb / descend)
- **Space** — flaps (slower, steeper, safer landings)
- **P or Esc** — pause
- **Mouse** — menus, mission cards, buttons

## The game

- **Three sorties** with different goals: Dawn Mail Run (5 rings), River
  Medicine Drop (6 low rings, tight fuel), Volcano Ridge (7 rings in gusty
  air around the peak) — each ending in a landing on runway 09.
- **Honest flight model**: throttle buys speed, speed buys lift, lift buys
  climb. Fly too slow and she stalls and sinks; fly too hot and the fuel
  gauge falls faster than you do. Flaps add lift and drag for landing.
- **Fuel and damage are decisions**: hard landings and terrain scrapes hurt
  the airframe; running dry over the valley ends the sortie.
- **Scoring**: rings pay more for a centred pass, landings pay for runway
  centre and a soft touchdown, plus fuel and time bonuses.
- **The valley**: a seeded procedural world — volcano, river, rice
  terraces, a riverside town, pine hillsides, a hangar and a windsock —
  the same ground the plane flies over and can hit.
- **Instruments, lit**: altitude, airspeed, heading, vertical speed,
  artificial horizon, throttle, fuel, airframe condition, wind and flaps.
- **Sound**: engine drone, wind and ring chimes synthesised live with the
  Web Audio API — no audio files.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library.
- `game/index.html` + `game/src/` — the game: `config.js` (tuning and
  missions), `terrain.js` (the valley), `plane.js` (flight physics),
  `render.js` (canvas drawing and HUD), `input.js` (keyboard and mouse),
  `audio.js` (synthesised sound), `shots.js` (screenshot staging),
  `main.js` (loop and state machine).
- `screenshots/` — three real renders of the game in a browser:
  title, mid-flight through a ring, sortie complete.
- `serve.ts` — a tiny static server for local play.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `shots.json` — the `?shot=` scenes behind the screenshots.

Built as an entry for the [Make the best flight game](https://make.fun/c/best-flight-game-20261126-0057)
competition on [make.fun](https://make.fun).

## License

MIT — see `LICENSE`.
