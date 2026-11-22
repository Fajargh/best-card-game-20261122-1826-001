// A tiny seeded random number generator (mulberry32) so a ?seed=N run of the game
// always deals, draws and aims the same way. One job: deterministic randomness.
export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(max) {
      return Math.floor(this.next() * max);
    },
    pick(list) {
      return list[this.int(list.length)];
    },
  };
}

/** Fisher-Yates shuffle of a copy of `list`, using the seeded generator. */
export function shuffle(list, random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = random.int(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
