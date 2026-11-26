// Merapi Courier — the valley. One seeded height function drives the ground,
// the river, the rice terraces, the town and the volcano, so the terrain the
// pilot sees, the terrain the plane can hit, and the terrain the screenshots
// show are all the same ground.

import { makeNoise1D, makeRandom, hashInt, range } from './random.js';
import { WORLD } from './config.js';

// Altitude is feet; world x is metres. The ground rises from the runway
// plain (120 ft) toward the volcano at the far end of the valley.
export function buildTerrain(seed) {
  const rng = makeRandom(seed);
  const rolling = makeNoise1D(rng, 26, -100, 680);
  const detail = makeNoise1D(rng, 64, -60, 60);

  // The volcano: a broad cone centred near x = 19800 m, peak about 5200 ft.
  const volcanoX = 19800;
  const volcanoPeak = 5200;

  function groundHeight(x) {
    const clamped = Math.max(0, Math.min(WORLD.length, x));
    // A slow climb along the valley, steeper as the volcano approaches.
    const climb = 1500 * Math.pow(clamped / WORLD.length, 1.7);
    const dx = clamped - volcanoX;
    const cone = volcanoPeak * Math.exp(-(dx * dx) / (2 * 2600 * 2600));
    const hills = rolling(clamped / WORLD.length) * (0.35 + 0.65 * (clamped / WORLD.length));
    const bump = detail(clamped / WORLD.length);
    // The runway plain is flattened so takeoffs and landings are fair.
    const nearRunway = Math.max(0, 1 - Math.abs(clamped - WORLD.runwayX) / 900);
    const flat = WORLD.runwayAltitude;
    const rough = WORLD.runwayAltitude + climb + cone + hills + bump;
    return flat * nearRunway + rough * (1 - nearRunway);
  }

  // The river winds down the valley floor, roughly following the low ground.
  function riverY(x) {
    const t = x / WORLD.length;
    return 0.42 + 0.1 * Math.sin(t * 9.1 + 1.3) + 0.05 * Math.sin(t * 23.7);
  }

  // Rice terraces step down the hillsides in three bands.
  const terraces = [];
  for (let i = 0; i < 46; i++) {
    const x = 1400 + hashInt(i * 7 + 1, seed) * 19000;
    const y = 0.55 + hashInt(i * 7 + 2, seed) * 0.3;
    terraces.push({
      x,
      y,
      w: 120 + hashInt(i * 7 + 3, seed) * 260,
      steps: 3 + Math.floor(hashInt(i * 7 + 4, seed) * 4),
    });
  }

  // The town: a cluster of rooftops on the flat near x = 9800 m.
  const town = [];
  const townRng = makeRandom(seed + 77);
  for (let i = 0; i < 26; i++) {
    town.push({
      x: 8800 + townRng() * 1900,
      w: 26 + townRng() * 42,
      h: 22 + townRng() * 34,
      roof: townRng() > 0.5,
    });
  }

  // Drifting clouds, placed by seed so the sky is identical every run.
  const clouds = [];
  for (let i = 0; i < 22; i++) {
    clouds.push({
      x: hashInt(i * 3 + 11, seed) * WORLD.length,
      alt: 2600 + hashInt(i * 3 + 12, seed) * 4200,
      size: 260 + hashInt(i * 3 + 13, seed) * 520,
      speed: 6 + hashInt(i * 3 + 14, seed) * 14,
    });
  }

  // Pine trees scattered on the hillsides, so the ground reads as land
  // rather than a flat slab from the air.
  const trees = [];
  for (let i = 0; i < 170; i++) {
    trees.push({
      x: 900 + hashInt(i * 5 + 21, seed) * 22000,
      h: 26 + hashInt(i * 5 + 22, seed) * 42,
    });
  }

  // A windsock and a hangar mark the airfield.
  const airfield = {
    hangarX: WORLD.runwayX - 260,
    windsockX: WORLD.runwayX + WORLD.runwayLength + 120,
  };

  return { groundHeight, riverY, terraces, town, clouds, trees, airfield, volcanoX, volcanoPeak };
}

// Where the sun sits for the time of day the sortie flies in.
export function sunPosition(missionIndex, t) {
  const base = [
    { x: 0.82, y: 0.2, warmth: 0.55 },
    { x: 0.5, y: 0.12, warmth: 0.9 },
    { x: 0.16, y: 0.3, warmth: 0.7 },
  ][missionIndex % 3];
  return { x: base.x, y: base.y + 0.02 * Math.sin(t * 0.05), warmth: base.warmth };
}

export function formatAltitude(feet) {
  return `${Math.max(0, Math.round(feet)).toLocaleString('en-US')} ft`;
}

export function formatSpeed(knots) {
  return `${Math.max(0, Math.round(knots))} kt`;
}

export function formatHeading(degrees) {
  const d = ((Math.round(degrees) % 360) + 360) % 360;
  return `${String(d).padStart(3, '0')}°`;
}

export function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { range };
