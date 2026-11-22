# SOLMAR HEAT: Vice Coast

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/azkamahvin88/solmar-heat-r6/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/azkamahvin88/solmar-heat-r6/reward.svg)](https://make.fun/c/gta6-01)

An open-world crime game in the fictional beach city of **Solmar** — built for the
[make.fun gta6-01 competition](https://make.fun/c/gta6-01). Ten story missions, a
living city, and a five-star wanted system, playable in a desktop browser from
static files. No network requests: every script, texture and sound is in `game/`
(three.js is vendored under `game/vendor/`).

## What is in the game

- **A city that lives** — Solmar: beachfront boulevard with palms, marina pier and
  boats, downtown towers with lit windows, traffic, pedestrians who flee gunfire,
  street lamps and a sunset that never quite sets.
- **10 story missions** — from stealing your first wheels to *The Solmar Run*,
  a $2.4M finale with a helicopter overhead and a roadblock on the causeway.
  Tail jobs, shootouts, ramming, vault cracking, a two-minute five-star survival.
- **Dispatch that escalates** — patrol cars chase, PIT and ram; roadblocks at
  3 stars, the police helicopter with its searchlight at 3 stars and up; heat
  cools off when you break line of sight.
- **Crew, garage, standing** — hire Rio, Maya, Bruno and Lena (each with a real
  perk), buy five cars from the sedan to the Tempesta GT, and build standing
  across five districts.
- **Systems** — weapon wheel (pistol / SMG / shotgun / fists), three procedural
  radio stations, saves (autosave after every mission, F to save), health and
  armor, a live minimap, and a WASTED screen with a hospital bill.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

WASD move / drive · E enter or steal a car, start a mission at the gold marker ·
Click shoot · Q cycle weapon · R radio · F save · P pause · drag mouse to look.

## Screenshots

`1-cover.jpg` is the finale at its busiest — the last mission, five wanted stars,
the helicopter, a roadblock and $2,431,500 on the HUD. The rest show a harbor
shootout, the title over the living city, and the story-complete payoff. All four
are real renders of this code (`?shot=cover|play|start|end&seed=7`).

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output and writes
`dossier.json` with the vendored `vendor/makefun-game.ts` library.

## License

MIT — see [LICENSE](LICENSE). All city, character, vehicle, story, art and
music in this game is original; nothing is taken from any commercial game.
