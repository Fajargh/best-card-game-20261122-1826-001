# Ember Sigils

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Fajargh/best-card-game-20261122-1826-001/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Fajargh/best-card-game-20261122-1826-001/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

An original turn-based card duel: you and the rival summoner Vesk each hold 20 life.
Spend ember (it grows every turn), play sigil cards from your hand, and chain the same
element twice in a turn to **resonate** for +2 power. Flame burns, Tide shields, Leaf
heals, Stone shatters shield — and the rival shows its intent before it strikes, so
every hand is a decision you can read and counter.

## Run it

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests — every file the game loads lives under `game/`.

## How to play

- **Click a card** (or press `1–7`) to play it; each card costs ember.
- **Space** ends your turn. The rival then plays its hand — watch its intent line.
- **R** starts a new duel. **Enter** begins from the title screen.
- First summoner at 0 life loses. Playing two cards of the same element in one turn
  resonates: +2 damage, shield or heal. When a deck runs out it reshuffles from its
  discard pile.

## Files

- `game/index.html` — the page; `game/src/` — the game, split by job: `cards.js`
  (the catalogue), `state.js` (turns, rules, rival AI), `render.js` (canvas painting),
  `input.js` (mouse + keyboard), `shots.js` (screenshot scenes), `random.js`
  (seeded deals), `config.js` (numbers), `main.js` (boot + loop).
- `main.ts` — the make.fun hand-in program; `vendor/makefun-game.ts` — the kit library.
- `screenshots/` — title, table, win and loss, rendered by the game itself.

<sub>Entered on [make.fun](https://make.fun/?ref=8cvj6bwy&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
