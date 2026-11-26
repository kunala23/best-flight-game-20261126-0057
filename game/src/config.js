// Merapi Courier — tuning constants and the three sorties.
// All distances are metres, speeds are knots, altitudes are feet.
// The world is a side-view valley 24 km long; the runway sits near x = 600 m.

export const WORLD = {
  length: 24000,
  groundBase: 0,
  runwayX: 600,
  runwayLength: 520,
  runwayAltitude: 120,
  minSpeed: 55,
  maxSpeed: 190,
  stallSpeed: 58,
  maxAltitude: 9000,
  gravity: 9.8,
  fuelCapacity: 100,
};

export const PLANE_TUNING = {
  // How fast the nose follows the pitch input (rad per second at full deflection).
  pitchRate: 0.85,
  // Pitch authority fades when the wing is slow.
  minAuthoritySpeed: 60,
  // Drag grows with the square of speed; throttle fights it.
  dragCoefficient: 0.00042,
  thrustPerThrottle: 0.62,
  // Climb comes from pitch times speed; a slow wing cannot hold altitude.
  liftFactor: 1.9,
  stallSink: 26,
  // Fuel burn per second at full throttle, scaled down at idle.
  fuelBurnFull: 0.55,
  fuelBurnIdle: 0.06,
  // A touchdown softer than this vertical speed is a good landing.
  softTouchdown: 3.2,
  hardTouchdown: 7.5,
  // Damage taken from a hard landing or a terrain scrape.
  hardLandingDamage: 34,
  scrapeDamagePerSecond: 55,
};

export const SCORING = {
  ringBase: 100,
  ringCentreBonus: 150,
  landingBase: 200,
  landingCentreBonus: 120,
  softBonus: 80,
  fuelBonusPerUnit: 4,
  timeBonusPerSecond: 2,
};

// One sortie: a name, a briefing line, a fuel load, wind, and the rings to fly.
// Ring = { x, alt (feet), r (feet radius) }. The runway landing closes the sortie.
export const MISSIONS = [
  {
    id: 'dawn-mail',
    name: 'Sortie 1 — Dawn Mail Run',
    briefing:
      'Carry the dawn mail across the valley. Thread all five rings, then bring her home to the runway. Keep the speed above 60 knots and watch the fuel.',
    fuel: 100,
    wind: 4,
    gusts: 0,
    rings: [
      { x: 2600, alt: 1500, r: 260 },
      { x: 5200, alt: 2100, r: 240 },
      { x: 8100, alt: 1700, r: 240 },
      { x: 11200, alt: 2600, r: 260 },
      { x: 14500, alt: 1900, r: 240 },
    ],
    parSeconds: 150,
  },
  {
    id: 'river-medicine',
    name: 'Sortie 2 — River Medicine Drop',
    briefing:
      'Medicine for the riverside clinics. Fly low along the river — six rings, tight fuel, no room for sightseeing. A soft landing still counts double.',
    fuel: 78,
    wind: -6,
    gusts: 2,
    rings: [
      { x: 2300, alt: 900, r: 220 },
      { x: 4600, alt: 1100, r: 210 },
      { x: 6900, alt: 800, r: 210 },
      { x: 9300, alt: 1300, r: 220 },
      { x: 12100, alt: 950, r: 210 },
      { x: 15200, alt: 1200, r: 220 },
    ],
    parSeconds: 165,
  },
  {
    id: 'volcano-ridge',
    name: 'Sortie 3 — Volcano Ridge',
    briefing:
      'The ridge run past Gunung Bara. Seven rings in gusty air around the peak, then a landing in a crosswind. This is the one the old pilots talk about.',
    fuel: 100,
    wind: 9,
    gusts: 7,
    rings: [
      { x: 2400, alt: 2200, r: 250 },
      { x: 5000, alt: 3200, r: 240 },
      { x: 7800, alt: 4100, r: 250 },
      { x: 10600, alt: 4800, r: 260 },
      { x: 13400, alt: 3900, r: 240 },
      { x: 16200, alt: 2900, r: 240 },
      { x: 18800, alt: 2100, r: 250 },
    ],
    parSeconds: 210,
  },
];

export const PALETTE = {
  skyTop: '#7db8e8',
  skyMid: '#bcd9f2',
  skyLow: '#f6d9a8',
  duskTop: '#2c3e6b',
  duskMid: '#e08a5a',
  duskLow: '#f7c489',
  farHill: '#7d9bb8',
  nearHill: '#4d7a4a',
  valley: '#5d8a4d',
  terrace: '#7fae5f',
  river: '#5fa8d3',
  townRoof: '#c65b3c',
  townWall: '#f2e3c6',
  runway: '#3a3f46',
  runwayMark: '#f5f0dc',
  planeBody: '#e8442e',
  planeWing: '#f4f1e6',
  planeGlass: '#9fd4e8',
  hudPanel: 'rgba(8, 18, 34, 0.72)',
  hudText: '#eaf4ff',
  hudAmber: '#ffc857',
  hudGreen: '#7be495',
  hudRed: '#ff6b5e',
  ringGold: '#ffd166',
  ringGlow: 'rgba(255, 209, 102, 0.35)',
};
