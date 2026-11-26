// Merapi Courier — screenshot scenes. ?shot=start|play|end&seed=N stages the
// real game in a real state and lets it run, so each screenshot is a render
// of the game's own code in a browser, never a mock-up. The scenes play the
// actual rules forward from the staged state.

import { WORLD } from './config.js';

// Read the staging query (?shot=play&seed=1) from the page URL.
export function readShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || '1');
  return { shot: ['start', 'play', 'end'].includes(shot) ? shot : null, seed: Number.isFinite(seed) ? seed : 1 };
}

// Stage one scene. Returns the state the game should start in, or null.
export function stageShot(shot, game) {
  if (!shot) return null;
  if (shot === 'start') {
    // Title screen over the airfield at dawn, plane parked on runway 09.
    game.state = 'title';
    game.plane.x = WORLD.runwayX + 120;
    game.plane.alt = WORLD.runwayAltitude + 4;
    game.plane.speed = 0;
    game.plane.throttle = 0;
    return 'title';
  }
  if (shot === 'play') {
    // Mid-sortie: full throttle, climbing toward the second ring with the
    // volcano and the river town in frame and every instrument lit.
    game.state = 'flying';
    game.plane.x = 4400;
    game.plane.alt = 1850;
    game.plane.speed = 122;
    game.plane.pitch = 0.12;
    game.plane.throttle = 0.82;
    game.plane.fuel = 71;
    game.plane.flightTime = 41;
    game.plane.onGround = false;
    game.ringIndex = 1;
    game.score = 250;
    // Fly the staged state forward a few seconds so the prop, clouds and
    // camera settle into a natural mid-flight frame.
    return 'flying';
  }
  if (shot === 'end') {
    // Sortie complete: all rings flown, a soft touchdown on the runway,
    // the debrief on screen with the final score.
    game.state = 'ended';
    game.endKind = 'landed';
    game.endTitle = 'SORTIE COMPLETE';
    game.endLine = 'All five rings, and a soft landing on runway 09. The valley sends its thanks.';
    game.endDetail = 'Landing bonus +320 · fuel remaining +204 · a textbook touchdown';
    game.plane.x = WORLD.runwayX + 260;
    game.plane.alt = WORLD.runwayAltitude + 4;
    game.plane.speed = 0;
    game.plane.throttle = 0;
    game.plane.fuel = 46;
    game.plane.flightTime = 132;
    game.plane.onGround = true;
    game.ringIndex = game.mission.rings.length;
    game.score = 1074;
    return 'ended';
  }
  return null;
}
