// Merapi Courier — the game loop. A small state machine (title, briefing,
// flying, paused, ended) drives the plane, the rings, the landings and the
// score, and hands every frame to the renderer. Keyboard flies the plane;
// the mouse works the menus.

import { MISSIONS, SCORING, WORLD } from './config.js';
import { buildTerrain, sunPosition } from './terrain.js';
import { makePlane, stepPlane, planeIsDestroyed } from './plane.js';
import { makeInput, makeButton, buttonHit } from './input.js';
import { makeAudio } from './audio.js';
import { makeCamera, updateCamera, renderFrame } from './render.js';
import { readShotParams, stageShot } from './shots.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  canvas.width = 1280;
  canvas.height = 800;
}
fitCanvas();

const { shot, seed } = readShotParams();
const terrain = buildTerrain(seed);
const input = makeInput(canvas);
const audio = makeAudio();

const game = {
  seed,
  terrain,
  camera: makeCamera(),
  missions: MISSIONS.map((m) => ({ ...m, done: false })),
  missionIndex: 0,
  mission: MISSIONS[0],
  plane: makePlane(MISSIONS[0]),
  state: 'title',
  ringIndex: 0,
  score: 0,
  wind: MISSIONS[0].wind,
  gust: 0,
  t: 0,
  buttons: [],
  endKind: '',
  endTitle: '',
  endLine: '',
  endDetail: '',
  sun: sunPosition(0, 0),
  lastAlarm: 0,
  ringFlash: 0,
};

// ---- Buttons ----

function layoutTitleButtons() {
  game.buttons = game.missions.map((mission, i) => {
    const w = 340;
    const h = 108;
    const gap = 24;
    const total = game.missions.length * w + (game.missions.length - 1) * gap;
    const x = (canvas.width - total) / 2 + i * (w + gap);
    return { ...makeButton(x, 330, w, h, mission.name, `mission-${i}`), hovered: false };
  });
}

function layoutBriefingButtons() {
  game.buttons = [
    { ...makeButton(canvas.width / 2 - 140, 430, 280, 58, 'TAKE OFF', 'takeoff'), hovered: false },
  ];
}

function layoutPauseButtons() {
  game.buttons = [
    { ...makeButton(canvas.width / 2 - 300, 360, 280, 54, 'RESUME', 'resume'), hovered: false },
    { ...makeButton(canvas.width / 2 + 20, 360, 280, 54, 'QUIT TO MENU', 'quit'), hovered: false },
  ];
}

function layoutEndButtons() {
  const next = game.endKind === 'landed' && game.missionIndex < game.missions.length - 1;
  game.buttons = [
    { ...makeButton(canvas.width / 2 - 300, 380, 280, 54, next ? 'NEXT SORTIE' : 'FLY AGAIN', 'next'), hovered: false },
    { ...makeButton(canvas.width / 2 + 20, 380, 280, 54, 'BACK TO MENU', 'quit'), hovered: false },
  ];
}

function refreshHover() {
  for (const button of game.buttons) {
    button.hovered = buttonHit(button, input.mouseX, input.mouseY);
  }
}

// ---- Sortie flow ----

function startMission(index) {
  game.missionIndex = index;
  game.mission = game.missions[index];
  game.plane = makePlane(game.mission);
  game.ringIndex = 0;
  game.score = 0;
  game.wind = game.mission.wind;
  game.gust = 0;
  game.sun = sunPosition(index, 0);
  game.state = 'briefing';
  layoutBriefingButtons();
}

function takeOff() {
  game.state = 'flying';
  game.buttons = [];
  audio.unlock();
}

function endSortie(kind, title, line, detail) {
  game.endKind = kind;
  game.endTitle = title;
  game.endLine = line;
  game.endDetail = detail;
  game.state = 'ended';
  layoutEndButtons();
  audio.updateEngine(0, 0, false);
}

function finishLanding() {
  const plane = game.plane;
  const runwayCentre = WORLD.runwayX + WORLD.runwayLength / 2;
  const onRunway = plane.x >= WORLD.runwayX && plane.x <= WORLD.runwayX + WORLD.runwayLength;
  const centre = Math.max(0, 1 - Math.abs(plane.x - runwayCentre) / (WORLD.runwayLength / 2));
  const soft = Math.abs(plane.touchdownVs || 0) <= 3.2;
  let bonus = 0;
  let detail = '';
  if (onRunway) {
    bonus += SCORING.landingBase + Math.round(SCORING.landingCentreBonus * centre);
    detail = `On runway 09 · centre ${Math.round(centre * 100)}%`;
  } else {
    detail = 'Off the runway — a field landing still counts, barely';
  }
  if (soft) {
    bonus += SCORING.softBonus;
    detail += ' · soft touchdown';
  }
  const fuelBonus = Math.round(plane.fuel * SCORING.fuelBonusPerUnit);
  bonus += fuelBonus;
  const timeBonus = Math.max(0, Math.round((game.mission.parSeconds - plane.flightTime) * SCORING.timeBonusPerSecond));
  bonus += timeBonus;
  game.score += bonus;
  detail += ` · landing +${bonus} (fuel +${fuelBonus}, time +${timeBonus})`;
  game.missions[game.missionIndex].done = true;
  audio.thud(!soft);
  const allDone = game.missions.every((m) => m.done);
  if (allDone) {
    endSortie('campaign', 'CAMPAIGN COMPLETE', 'Three sorties, three landings. The valley flies because you do.', detail);
  } else {
    endSortie('landed', 'SORTIE COMPLETE', 'Rings flown, mail delivered, wheels down on runway 09.', detail);
  }
}

function crashPlane(reason) {
  audio.thud(true);
  endSortie('crashed', 'DOWN IN THE VALLEY', reason, `Score kept: ${game.score} · the courier walks home this time.`);
}

// ---- Rings ----

function checkRings() {
  const plane = game.plane;
  const ring = game.mission.rings[game.ringIndex];
  if (!ring || plane.onGround) return;
  const dxMetres = Math.abs(plane.x - ring.x);
  const dyFeet = Math.abs(plane.alt - ring.alt);
  // A ring is a hoop in the sky: pass through its disc, not just near it.
  const throughDisc = dxMetres < 90 && dyFeet < ring.r;
  if (!throughDisc) return;
  const centreError = dyFeet / ring.r;
  const centred = centreError < 0.35;
  const points = SCORING.ringBase + (centred ? SCORING.ringCentreBonus : Math.round(SCORING.ringCentreBonus * (1 - centreError)));
  game.score += points;
  game.ringIndex += 1;
  game.ringFlash = 1;
  audio.chime(centred);
  if (game.ringIndex >= game.mission.rings.length) {
    game.endLine = '';
  }
}

// ---- Per-frame update ----

function update(dt) {
  game.t += dt;
  game.sun = sunPosition(game.missionIndex, game.t);
  refreshHover();

  const pressed = input.drainPressed();
  const clicks = input.drainClicks();

  // Any click or key unlocks the synthesised audio (browsers require a gesture).
  if (clicks.length > 0 || pressed.size > 0) audio.unlock();

  if (game.state === 'title') {
    if (pressed.has('Enter') || pressed.has('Space')) startMission(0);
    for (const click of clicks) {
      for (const button of game.buttons) {
        if (buttonHit(button, click.x, click.y) && button.action.startsWith('mission-')) {
          startMission(Number(button.action.slice('mission-'.length)));
        }
      }
    }
    return;
  }

  if (game.state === 'briefing') {
    if (pressed.has('Enter') || pressed.has('Space')) takeOff();
    for (const click of clicks) {
      for (const button of game.buttons) {
        if (buttonHit(button, click.x, click.y) && button.action === 'takeoff') takeOff();
      }
    }
    return;
  }

  if (game.state === 'paused') {
    if (pressed.has('KeyP') || pressed.has('Escape')) {
      game.state = 'flying';
      game.buttons = [];
    }
    for (const click of clicks) {
      for (const button of game.buttons) {
        if (!buttonHit(button, click.x, click.y)) continue;
        if (button.action === 'resume') {
          game.state = 'flying';
          game.buttons = [];
        }
        if (button.action === 'quit') {
          game.state = 'title';
          layoutTitleButtons();
        }
      }
    }
    return;
  }

  if (game.state === 'ended') {
    if (pressed.has('Enter')) {
      game.state = 'title';
      layoutTitleButtons();
    }
    for (const click of clicks) {
      for (const button of game.buttons) {
        if (!buttonHit(button, click.x, click.y)) continue;
        if (button.action === 'quit') {
          game.state = 'title';
          layoutTitleButtons();
        }
        if (button.action === 'next') {
          const nextIndex = game.endKind === 'landed' && game.missionIndex < game.missions.length - 1
            ? game.missionIndex + 1
            : game.missionIndex;
          startMission(nextIndex);
        }
      }
    }
    return;
  }

  // Flying.
  if (pressed.has('KeyP') || pressed.has('Escape')) {
    game.state = 'paused';
    layoutPauseButtons();
    audio.updateEngine(0, 0, false);
    return;
  }

  // Gusts: slow sine swells, stronger on the volcano sortie.
  const gustAmp = game.mission.gusts;
  game.gust = gustAmp * Math.sin(game.t * 0.45) * Math.sin(game.t * 0.13 + 2);
  const plane = game.plane;
  const wasAirborne = !plane.onGround;
  stepPlane(plane, input, terrain, dt, game.wind, game.gust);
  updateCamera(game.camera, plane, dt);
  audio.updateEngine(plane.throttle, plane.speed, true);
  game.ringFlash = Math.max(0, game.ringFlash - dt * 2);

  checkRings();

  // Stall warning, throttled so it does not stutter.
  if (plane.speed < 60 && !plane.onGround && game.t - game.lastAlarm > 2.5) {
    game.lastAlarm = game.t;
    audio.alarm();
  }

  // Out of fuel over the valley: she glides, and the ground decides.
  if (plane.fuel <= 0 && plane.speed < 25 && !plane.onGround) {
    crashPlane('Out of fuel over the valley floor — the courier glided as far as she could.');
    return;
  }

  if (planeIsDestroyed(plane)) {
    if (plane.damage >= 100) {
      crashPlane('The airframe gave out — too many hard knocks for one little courier.');
    } else {
      crashPlane('She came down in the valley. The mail is wet, but the pilot is fine.');
    }
    return;
  }

  // A wheels-down stop on the runway after the rings closes the sortie.
  if (wasAirborne && plane.onGround && plane.speed < 12 && game.ringIndex >= game.mission.rings.length) {
    finishLanding();
    return;
  }
  // Landing early, before the rings: a gentle reminder, not a punishment.
  if (wasAirborne && plane.onGround && plane.speed < 12 && game.ringIndex < game.mission.rings.length) {
    game.endLine = '';
  }
}

// ---- Boot and loop ----

layoutTitleButtons();
const staged = stageShot(shot, game);
if (staged === 'ended') layoutEndButtons();
if (staged === 'briefing') layoutBriefingButtons();
if (staged === 'flying') {
  // Let the staged flight settle for a few seconds before the first frame
  // the screenshot takes, so the camera and the instruments read naturally.
  for (let i = 0; i < 240; i++) {
    stepPlane(game.plane, { throttleUp: false, throttleDown: false, pitchUp: false, pitchDown: false, flapsToggle: false }, terrain, 1 / 60, game.wind, 0);
    updateCamera(game.camera, game.plane, 1 / 60);
    game.t += 1 / 60;
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.0001, (now - last) / 1000));
  last = now;
  update(dt);
  renderFrame(ctx, canvas, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
