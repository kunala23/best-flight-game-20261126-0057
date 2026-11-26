// Merapi Courier — the aeroplane. A light propeller courier with honest
// trade-offs: throttle buys speed, speed buys lift, lift buys climb, and
// fuel buys all of it. Fly too slow and she sinks; fly too hot and the
// fuel gauge is the only thing falling faster than you are.

import { PLANE_TUNING, WORLD } from './config.js';

export function makePlane(mission) {
  return {
    // Position along the valley (m) and height above sea level (ft).
    x: WORLD.runwayX + 40,
    alt: WORLD.runwayAltitude + 4,
    // Speed in knots, pitch in radians (positive = nose up).
    speed: 0,
    pitch: 0,
    // 0..1 throttle lever, 0..100 fuel, 0..100 airframe condition.
    throttle: 0,
    fuel: mission.fuel,
    damage: 0,
    // Vertical speed in ft/s, for the variometer and the landing call.
    verticalSpeed: 0,
    // Heading is fixed east for the valley run, with a wind drift readout.
    heading: 90,
    // Flaps add lift and drag for the landing: slower, steeper, safer.
    flaps: false,
    // Propeller angle, spun by the renderer.
    propAngle: 0,
    // True while the wheels are on the ground.
    onGround: true,
    // Seconds since the sortie started.
    flightTime: 0,
  };
}

// One physics step. dt is seconds. input is { throttleUp, throttleDown,
// pitchUp, pitchDown, flaps }. wind is knots of headwind, gust is extra.
export function stepPlane(plane, input, terrain, dt, wind, gust) {
  const t = PLANE_TUNING;
  plane.flightTime += dt;

  // Throttle lever moves at a fixed rate; it never jumps.
  if (input.throttleUp) plane.throttle = Math.min(1, plane.throttle + dt * 0.55);
  if (input.throttleDown) plane.throttle = Math.max(0, plane.throttle - dt * 0.7);
  if (input.flapsToggle) {
    plane.flaps = !plane.flaps;
    input.flapsToggle = false;
  }

  // Pitch authority needs airflow over the wing.
  const authority = Math.min(1, Math.max(0.12, (plane.speed - 20) / (t.minAuthoritySpeed - 20)));
  const pitchInput = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
  plane.pitch += pitchInput * t.pitchRate * authority * dt;
  // The nose settles gently toward level when the stick is centred.
  if (pitchInput === 0) plane.pitch *= Math.pow(0.55, dt);
  plane.pitch = Math.max(-0.5, Math.min(0.55, plane.pitch));

  // Speed: thrust minus drag, minus the cost of climbing.
  const drag = t.dragCoefficient * plane.speed * plane.speed;
  const flapDrag = plane.flaps ? 0.35 * plane.speed * 0.02 : 0;
  const climbCost = Math.max(0, Math.sin(plane.pitch)) * plane.speed * 0.055;
  const thrust = t.thrustPerThrottle * plane.throttle * 100;
  const windEffect = (wind + gust) * 0.02;
  plane.speed += (thrust - drag - flapDrag - climbCost) * dt * 0.24 - windEffect * dt;
  plane.speed = Math.max(0, Math.min(WORLD.maxSpeed + 12, plane.speed));

  // Lift: enough speed and the wing holds the nose's climb; too little and
  // she sinks no matter where the nose points. Flaps help at low speed.
  const liftSpeed = plane.flaps ? plane.speed + 14 : plane.speed;
  const lift = Math.max(0, liftSpeed - 42) * t.liftFactor * Math.sin(plane.pitch);
  const stalling = liftSpeed < WORLD.stallSpeed;
  const sink = stalling ? t.stallSink : 0;
  const climbRate = lift * 2.4 - sink - (plane.onGround ? 0 : 1.2);
  plane.verticalSpeed = climbRate;
  plane.alt += climbRate * dt;

  // Forward motion, in metres: a knot is ~0.514 m/s.
  plane.x += plane.speed * 0.51444 * dt;
  if (plane.x > WORLD.length - 200) plane.x = WORLD.length - 200;

  // Fuel: the lever position decides the burn.
  const burn = t.fuelBurnIdle + (t.fuelBurnFull - t.fuelBurnIdle) * plane.throttle;
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0) plane.throttle = Math.max(plane.throttle - dt * 0.4, 0);

  // Propeller spins with the engine.
  plane.propAngle += (2 + plane.throttle * 38) * dt;

  // Ground contact: the runway plain and the valley floor.
  const ground = terrain.groundHeight(plane.x);
  const gearAlt = ground + 4;
  if (plane.alt <= gearAlt) {
    plane.alt = gearAlt;
    if (!plane.onGround) {
      // Touchdown: judge it by the vertical speed at contact, kept for the
      // landing call after verticalSpeed itself is zeroed below.
      const impact = Math.abs(plane.verticalSpeed);
      plane.touchdownVs = impact;
      if (impact > t.hardTouchdown || plane.speed > 150) {
        plane.damage += t.hardLandingDamage;
      }
      plane.verticalSpeed = 0;
    }
    plane.onGround = true;
    // Rolling friction bleeds speed; brakes (pitch down) help.
    plane.speed = Math.max(0, plane.speed - (input.pitchDown ? 26 : 9) * dt);
    plane.pitch = 0;
  } else {
    plane.onGround = false;
  }

  // Terrain scrape while airborne: a hilltop clips the belly.
  if (!plane.onGround && plane.alt < ground + 2) {
    plane.alt = ground + 2;
    plane.damage += t.scrapeDamagePerSecond * dt;
    plane.speed = Math.max(40, plane.speed - 30 * dt);
  }

  plane.alt = Math.min(WORLD.maxAltitude, plane.alt);
  return plane;
}

export function planeIsDestroyed(plane) {
  return plane.damage >= 100 || (plane.fuel <= 0 && plane.speed < 20 && !plane.onGround);
}

export function landingQuality(plane, terrain) {
  const runwayStart = WORLD.runwayX;
  const runwayEnd = WORLD.runwayX + WORLD.runwayLength;
  const onRunway = plane.x >= runwayStart && plane.x <= runwayEnd;
  const centre = 1 - Math.abs(plane.x - (runwayStart + WORLD.runwayLength / 2)) / (WORLD.runwayLength / 2);
  return { onRunway, centre: Math.max(0, centre), soft: (plane.touchdownVs || 0) <= 3.2 };
}
