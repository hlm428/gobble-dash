// A small seeded random number generator: the same seed gives the same run,
// which is what makes the screenshot scenes repeatable. Mulberry32, written
// here from the algorithm's definition (a 32-bit state, one multiply-xor
// mix per draw).

export function createRandom(seed) {
  let state = (seed | 0) >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry from a weighted list of [value, weight] pairs. */
export function pickWeighted(random, entries) {
  let total = 0;
  for (const [, weight] of entries) total += weight;
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
