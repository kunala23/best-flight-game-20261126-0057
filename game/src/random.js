// Seeded randomness for Merapi Courier. The valley, the town, the clouds and
// the gust pattern all come from one seed, so a screenshot seed reproduces
// exactly the same world every time.

// mulberry32: a small, fast seeded generator with a good distribution.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, low, high) {
  return low + rng() * (high - low);
}

export function pick(rng, items) {
  return items[Math.floor(rng() * items.length) % items.length];
}

// Smooth 1-D value noise: a row of random control points, cosine-interpolated.
export function makeNoise1D(rng, points, low, high) {
  const values = [];
  for (let i = 0; i < points; i++) values.push(low + rng() * (high - low));
  return function noise(x) {
    const scaled = x * (points - 1);
    const i = Math.floor(scaled);
    const j = Math.min(i + 1, points - 1);
    const f = scaled - i;
    const smooth = f * f * (3 - 2 * f);
    return values[i] + (values[j] - values[i]) * smooth;
  };
}

// A deterministic hash of an integer, for scattering features along the world.
export function hashInt(n, seed) {
  let h = (n * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
