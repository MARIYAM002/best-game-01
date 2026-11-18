# Lumen Reef

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/MARIYAM002/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/MARIYAM002/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**Lumen Reef** is an original neon arcade defense game built for make.fun's
[Make the best game](https://make.fun/bounty/best-game-01) bounty.

You are Luma, a lanternfish guarding the last glowing heart of the reef.
Ink wisps, darters and bulwarks drift in from the dark to snuff it out.
Swim, aim your light, and hold the reef through 10 waves — the final wave
brings the Gloomwhale itself. Clear it and the reef shines again; let the
heart's integrity fall to zero and the reef goes dark.

## How to play

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Shoot:** hold mouse button or Space
- **Pause:** P or Esc — **Mute:** M
- **Start / restart:** click or press Space

Collect the light motes fallen foes drop to build a combo (up to x5).
Grab power-ups: a shield bubble, rapid pulses, triple beams, and rare
heart blooms that mend the reef.

## Run it

Serve `game/` with any static server, then open `index.html` in desktop
Chrome. For local play:

```sh
node serve.ts
# open http://localhost:8080
```

No network is used: every file the game loads lives under `game/`, and all
art and sound are drawn and synthesised by the game's own code.

## Layout

- `game/` — the playable game (static files, ES modules)
- `game/src/` — one file per job: config, random, audio, input, world,
  render, shots, main
- `screenshots/` — title, gameplay, victory and game-over renders
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
