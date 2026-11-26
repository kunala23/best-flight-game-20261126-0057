// Merapi Courier — everything the pilot sees. One canvas, one painter's
// order: sky, sun, clouds, far hills, the volcano, the valley floor, the
// river, terraces, town, runway, rings, the aeroplane, then the HUD and the
// menu screens on top. The camera follows the plane and never fights it:
// it eases toward the aircraft and looks ahead in the direction of flight.

import { PALETTE, WORLD } from './config.js';
import { formatAltitude, formatSpeed, formatHeading, formatClock } from './terrain.js';

// Pixels per metre at the current zoom; altitude sets the scale so the
// ground stays readable from the runway to the ridge.
function zoomFor(altFeet) {
  if (altFeet < 900) return 0.55;
  if (altFeet < 2500) return 0.46;
  return 0.34;
}

export function makeCamera() {
  return { x: WORLD.runwayX, y: 400, zoom: 0.55 };
}

export function updateCamera(camera, plane, dt) {
  const targetZoom = zoomFor(plane.alt);
  camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt * 1.5);
  // Look ahead: the faster she flies, the more valley the pilot sees.
  const lookAhead = 260 + plane.speed * 1.6;
  const targetX = plane.x + lookAhead;
  const targetY = plane.alt;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 2.2);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 2.2);
}

// World (metres, feet) to screen pixels for the ground plane. The vertical
// scale is compressed (0.55 of the horizontal) so the valley floor stays in
// frame while the plane cruises a thousand feet above it.
function worldToScreen(camera, canvas, xMetres, altFeet) {
  const pxPerMetre = camera.zoom;
  const pxPerFoot = camera.zoom * 0.55;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.56;
  return {
    x: cx + (xMetres - camera.x) * pxPerMetre,
    y: cy - (altFeet - camera.y) * pxPerFoot,
  };
}

function drawSky(ctx, canvas, missionIndex, sun, t) {
  const warmth = sun.warmth;
  const top = missionIndex === 0 ? PALETTE.skyTop : PALETTE.duskTop;
  const mid = missionIndex === 0 ? PALETTE.skyMid : PALETTE.duskMid;
  const low = missionIndex === 0 ? PALETTE.skyLow : PALETTE.duskLow;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.55, mid);
  gradient.addColorStop(1, low);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // The sun, warm and low for the dawn and dusk sorties.
  const sunX = sun.x * canvas.width;
  const sunY = sun.y * canvas.height;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
  glow.addColorStop(0, `rgba(255, 236, 180, ${0.55 + warmth * 0.4})`);
  glow.addColorStop(1, 'rgba(255, 236, 180, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26 + warmth * 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, canvas, camera, terrain, t) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const cloud of terrain.clouds) {
    const drift = ((cloud.x + t * cloud.speed) % WORLD.length) - 600;
    const p = worldToScreen(camera, canvas, drift, cloud.alt);
    if (p.x < -400 || p.x > canvas.width + 400 || p.y < -120 || p.y > canvas.height) continue;
    const s = cloud.size * camera.zoom * 0.45;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.55, p.y + s * 0.08, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.55, p.y + s * 0.08, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarHills(ctx, canvas, camera, seed) {
  // Two parallax ridges, drawn from a sine sum so they never repeat visibly.
  const layers = [
    { colour: '#6f9a6a', base: 0.52, amp: 46, alpha: 0.55 },
    { colour: '#577e58', base: 0.58, amp: 70, alpha: 0.75 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.colour;
    ctx.globalAlpha = layer.alpha;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let sx = 0; sx <= canvas.width; sx += 16) {
      const worldX = camera.x + (sx - canvas.width / 2) / camera.zoom;
      const h =
        Math.sin(worldX * 0.00021 + seed) * layer.amp +
        Math.sin(worldX * 0.00053 + seed * 2.7) * layer.amp * 0.45;
      ctx.lineTo(sx, canvas.height * layer.base + h * camera.zoom * 2.4);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTerrain(ctx, canvas, camera, terrain) {
  const step = 14;
  const x0 = camera.x - canvas.width / 2 / camera.zoom - 200;
  const x1 = camera.x + canvas.width / 2 / camera.zoom + 200;

  // The valley floor: green below, terraced gold where the terraces sit.
  ctx.beginPath();
  let first = true;
  for (let x = x0; x <= x1; x += step) {
    const p = worldToScreen(camera, canvas, x, terrain.groundHeight(x));
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.lineTo(canvas.width + 40, canvas.height + 40);
  ctx.lineTo(-40, canvas.height + 40);
  ctx.closePath();
  const groundGrad = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
  groundGrad.addColorStop(0, PALETTE.valley);
  groundGrad.addColorStop(1, '#3c6b34');
  ctx.fillStyle = groundGrad;
  ctx.fill();

  // A darker grass lip along the top edge of the ground, so the horizon of
  // the valley reads as a ridge line instead of a flat cut.
  ctx.strokeStyle = '#2e5a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  first = true;
  for (let x = x0; x <= x1; x += step) {
    const p = worldToScreen(camera, canvas, x, terrain.groundHeight(x));
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // Pine trees standing on the hillsides.
  for (const tree of terrain.trees) {
    const p = worldToScreen(camera, canvas, tree.x, terrain.groundHeight(tree.x));
    if (p.x < -20 || p.x > canvas.width + 20 || p.y < -40 || p.y > canvas.height + 20) continue;
    const h = tree.h * camera.zoom;
    const w = h * 0.55;
    ctx.fillStyle = '#2e5a2a';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x - w / 2, p.y);
    ctx.lineTo(p.x + w / 2, p.y);
    ctx.closePath();
    ctx.fill();
  }

  // The volcano cone, shaded on its far side, with a smoke plume.
  const vp = worldToScreen(camera, canvas, terrain.volcanoX, terrain.groundHeight(terrain.volcanoX));
  if (vp.x > -500 && vp.x < canvas.width + 500) {
    const peak = worldToScreen(camera, canvas, terrain.volcanoX, terrain.volcanoPeak);
    const baseHalf = 2600 * camera.zoom;
    ctx.fillStyle = '#5a5148';
    ctx.beginPath();
    ctx.moveTo(vp.x - baseHalf, vp.y);
    ctx.lineTo(peak.x, peak.y);
    ctx.lineTo(vp.x + baseHalf, vp.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6e6258';
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y);
    ctx.lineTo(vp.x + baseHalf, vp.y);
    ctx.lineTo(vp.x + baseHalf * 0.35, vp.y);
    ctx.closePath();
    ctx.fill();
    // Snow and ash near the summit.
    ctx.fillStyle = '#e8e4da';
    ctx.beginPath();
    ctx.moveTo(peak.x - 26 * camera.zoom * 2, peak.y + 60 * camera.zoom);
    ctx.lineTo(peak.x, peak.y);
    ctx.lineTo(peak.x + 26 * camera.zoom * 2, peak.y + 60 * camera.zoom);
    ctx.lineTo(peak.x + 12 * camera.zoom * 2, peak.y + 78 * camera.zoom);
    ctx.lineTo(peak.x - 12 * camera.zoom * 2, peak.y + 78 * camera.zoom);
    ctx.closePath();
    ctx.fill();
  }

  // The river: a blue ribbon hugging the valley floor.
  ctx.strokeStyle = PALETTE.river;
  ctx.lineWidth = Math.max(3, 14 * camera.zoom);
  ctx.lineCap = 'round';
  ctx.beginPath();
  first = true;
  for (let x = x0; x <= x1; x += step) {
    const gy = terrain.groundHeight(x);
    const ry = terrain.riverY(x);
    const p = worldToScreen(camera, canvas, x, gy + 6 + ry * 30);
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  // Rice terraces: stepped gold-green bands on the hillsides.
  for (const terrace of terrain.terraces) {
    const p = worldToScreen(camera, canvas, terrace.x, terrain.groundHeight(terrace.x));
    if (p.x < -300 || p.x > canvas.width + 300) continue;
    const w = terrace.w * camera.zoom;
    for (let s = 0; s < terrace.steps; s++) {
      ctx.fillStyle = s % 2 === 0 ? PALETTE.terrace : '#6d9c52';
      const y = p.y - s * 5 * camera.zoom - 2;
      ctx.fillRect(p.x - w / 2, y, w, 4 * camera.zoom + 1);
    }
  }

  // The town: walls, pitched roofs, a church tower with a clock face.
  for (const house of terrain.town) {
    const gy = terrain.groundHeight(house.x);
    const p = worldToScreen(camera, canvas, house.x, gy);
    const w = house.w * camera.zoom;
    const h = house.h * camera.zoom;
    if (p.x < -120 || p.x > canvas.width + 120) continue;
    ctx.fillStyle = PALETTE.townWall;
    ctx.fillRect(p.x - w / 2, p.y - h, w, h);
    ctx.fillStyle = PALETTE.townRoof;
    ctx.beginPath();
    ctx.moveTo(p.x - w / 2 - 3, p.y - h);
    ctx.lineTo(p.x, p.y - h - w * 0.32);
    ctx.lineTo(p.x + w / 2 + 3, p.y - h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawAirfield(ctx, canvas, camera, terrain) {
  const gy = terrain.groundHeight(WORLD.runwayX);
  const start = worldToScreen(camera, canvas, WORLD.runwayX, gy);
  const end = worldToScreen(camera, canvas, WORLD.runwayX + WORLD.runwayLength, gy);
  const stripH = Math.max(5, 10 * camera.zoom);
  // Runway strip with centreline dashes and threshold bars.
  ctx.fillStyle = PALETTE.runway;
  ctx.fillRect(start.x, start.y - stripH, end.x - start.x, stripH * 2);
  ctx.fillStyle = PALETTE.runwayMark;
  const dashLen = 26 * camera.zoom;
  for (let x = start.x + 14; x < end.x - 14; x += dashLen * 2) {
    ctx.fillRect(x, start.y - 1.5, dashLen, 3);
  }
  ctx.fillRect(start.x + 4, start.y - stripH, 6, stripH * 2);
  ctx.fillRect(end.x - 10, start.y - stripH, 6, stripH * 2);
  // Runway number 09, painted at the threshold.
  ctx.fillStyle = PALETTE.runwayMark;
  ctx.font = `bold ${Math.max(10, 15 * camera.zoom)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('09', start.x + 34 * camera.zoom, start.y + 5);

  // Hangar with a red roof beside the strip.
  const hangar = worldToScreen(camera, canvas, terrain.airfield.hangarX, gy);
  const hw = 90 * camera.zoom;
  const hh = 46 * camera.zoom;
  ctx.fillStyle = '#8a7f70';
  ctx.fillRect(hangar.x - hw / 2, hangar.y - hh, hw, hh);
  ctx.fillStyle = '#b0483a';
  ctx.beginPath();
  ctx.moveTo(hangar.x - hw / 2 - 4, hangar.y - hh);
  ctx.quadraticCurveTo(hangar.x, hangar.y - hh - 26 * camera.zoom, hangar.x + hw / 2 + 4, hangar.y - hh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c2f36';
  ctx.fillRect(hangar.x - hw * 0.3, hangar.y - hh * 0.62, hw * 0.6, hh * 0.62);

  // Windsock: the orange cone points where the wind blows.
  const sock = worldToScreen(camera, canvas, terrain.airfield.windsockX, gy);
  const poleH = 34 * camera.zoom;
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = Math.max(2, 3 * camera.zoom);
  ctx.beginPath();
  ctx.moveTo(sock.x, sock.y);
  ctx.lineTo(sock.x, sock.y - poleH);
  ctx.stroke();
  ctx.fillStyle = '#ff7b2e';
  ctx.beginPath();
  ctx.moveTo(sock.x, sock.y - poleH);
  ctx.lineTo(sock.x + 26 * camera.zoom, sock.y - poleH + 5);
  ctx.lineTo(sock.x, sock.y - poleH + 10);
  ctx.closePath();
  ctx.fill();
}

function drawRings(ctx, canvas, camera, mission, ringIndex, t) {
  mission.rings.forEach((ring, i) => {
    if (i < ringIndex) return;
    const p = worldToScreen(camera, canvas, ring.x, ring.alt);
    const r = ring.r * camera.zoom * 0.9;
    if (p.x < -r - 80 || p.x > canvas.width + r + 80) return;
    const isNext = i === ringIndex;
    const pulse = isNext ? 1 + 0.08 * Math.sin(t * 4) : 1;
    ctx.save();
    ctx.globalAlpha = isNext ? 1 : 0.55;
    // Glow halo for the next ring only.
    if (isNext) {
      ctx.fillStyle = PALETTE.ringGlow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.25 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = isNext ? PALETTE.ringGold : '#c9d6e2';
    ctx.lineWidth = isNext ? 7 : 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isNext ? '#7a5b00' : '#5a6b7d';
    ctx.font = `bold ${Math.max(11, 16 * camera.zoom)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`RING ${i + 1}`, p.x, p.y - r - 10);
    ctx.restore();
  });
}

// The courier herself: a red high-wing bush plane, drawn in side view with
// a spinning prop, a lit cockpit, and a bank angle that follows the pitch.
export function drawPlane(ctx, canvas, camera, plane, t, terrain) {
  const p = worldToScreen(camera, canvas, plane.x, plane.alt);
  const scale = 1.15;
  const bank = plane.pitch * 0.9;

  // Shadow on the ground directly below, shrinking as she climbs.
  const groundAlt = terrain.groundHeight(plane.x);
  const groundY = worldToScreen(camera, canvas, plane.x, groundAlt).y;
  const shadowScale = Math.max(0.15, 1 - (plane.alt - groundAlt) / 6000);
  ctx.save();
  ctx.globalAlpha = 0.22 * shadowScale;
  ctx.fillStyle = '#1a2b1a';
  ctx.beginPath();
  ctx.ellipse(p.x, groundY - 4, 34 * shadowScale + 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-bank * 0.35);
  ctx.scale(scale, scale);

  // Tailplane and fin.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-30, -2);
  ctx.lineTo(-44, -14);
  ctx.lineTo(-38, -16);
  ctx.lineTo(-26, -6);
  ctx.closePath();
  ctx.fill();
  // Fuselage: a rounded courier body with a cheatline.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.planeWing;
  ctx.fillRect(-30, 2, 62, 3);
  // High wing.
  ctx.fillStyle = PALETTE.planeWing;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(10, -8);
  ctx.lineTo(6, -14);
  ctx.lineTo(-4, -14);
  ctx.closePath();
  ctx.fill();
  // Cockpit glass, lit warm from inside.
  ctx.fillStyle = PALETTE.planeGlass;
  ctx.beginPath();
  ctx.ellipse(14, -6, 9, 6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 200, 0.85)';
  ctx.beginPath();
  ctx.arc(15, -6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Fixed gear with wheel fairings.
  ctx.strokeStyle = '#2c2f36';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-10, 16);
  ctx.moveTo(12, 8);
  ctx.lineTo(12, 16);
  ctx.stroke();
  ctx.fillStyle = '#22252b';
  ctx.beginPath();
  ctx.arc(-10, 17, 4, 0, Math.PI * 2);
  ctx.arc(12, 17, 4, 0, Math.PI * 2);
  ctx.fill();
  // Propeller: a blurred disc plus two blades at the current angle.
  const propX = 36;
  ctx.fillStyle = 'rgba(60, 60, 70, 0.18)';
  ctx.beginPath();
  ctx.ellipse(propX, 0, 3, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(propX, 0);
  ctx.rotate(plane.propAngle);
  ctx.fillStyle = '#2c2f36';
  ctx.fillRect(-1.5, -17, 3, 34);
  ctx.restore();
  ctx.fillStyle = '#f4f1e6';
  ctx.beginPath();
  ctx.arc(propX, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // Registration on the tail: her call sign.
  ctx.fillStyle = '#f4f1e6';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PK-MRP', -24, 1);
  ctx.restore();
}

// ---- HUD ----

function hudPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(234, 244, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHud(ctx, canvas, game) {
  const { plane, mission, score, ringIndex } = game;
  const W = canvas.width;
  const H = canvas.height;

  // Top-left: the flight instruments, lit like a panel.
  hudPanel(ctx, 16, 14, 300, 132);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALTITUDE', 30, 36);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(formatAltitude(plane.alt), 30, 66);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('AIRSPEED', 30, 90);
  ctx.fillStyle = plane.speed < 62 && !plane.onGround ? PALETTE.hudRed : PALETTE.hudText;
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(formatSpeed(plane.speed), 30, 120);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('HEADING', 200, 36);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(formatHeading(plane.heading), 200, 64);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('VERT SPEED', 200, 90);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px system-ui, sans-serif';
  const vs = plane.verticalSpeed;
  ctx.fillText(`${vs >= 0 ? '+' : ''}${vs.toFixed(1)} ft/s`, 200, 118);

  // Artificial horizon: a small ball that rolls with the pitch.
  const ahX = 360;
  const ahY = 80;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ahX, ahY, 44, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#3d7ac2';
  ctx.fillRect(ahX - 46, ahY - 46, 92, 46 - plane.pitch * 60);
  ctx.fillStyle = '#8a6b42';
  ctx.fillRect(ahX - 46, ahY - plane.pitch * 60, 92, 46 + plane.pitch * 60);
  ctx.strokeStyle = '#eaf4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ahX - 44, ahY - plane.pitch * 60);
  ctx.lineTo(ahX + 44, ahY - plane.pitch * 60);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(234, 244, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ahX, ahY, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', ahX, ahY + 60);

  // Top-right: mission, rings, score, clock.
  hudPanel(ctx, W - 316, 14, 300, 132);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('MISSION', W - 300, 36);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(mission.name, W - 300, 58, 268);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('RINGS', W - 300, 84);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${ringIndex} / ${mission.rings.length}`, W - 300, 108);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('SCORE', W - 196, 84);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(String(score), W - 196, 108);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('TIME', W - 96, 84);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(formatClock(plane.flightTime), W - 96, 108);

  // Bottom-left: throttle lever and fuel gauge.
  hudPanel(ctx, 16, H - 108, 300, 92);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', 30, H - 84);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(30, H - 72, 180, 12);
  ctx.fillStyle = plane.throttle > 0.85 ? PALETTE.hudRed : PALETTE.hudGreen;
  ctx.fillRect(30, H - 72, 180 * plane.throttle, 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, 220, H - 60);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('FUEL', 30, H - 40);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(30, H - 30, 180, 12);
  ctx.fillStyle = plane.fuel < 20 ? PALETTE.hudRed : PALETTE.hudAmber;
  ctx.fillRect(30, H - 30, 180 * (plane.fuel / 100), 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 220, H - 18);

  // Bottom-right: airframe condition, wind, flaps.
  hudPanel(ctx, W - 316, H - 108, 300, 92);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AIRFRAME', W - 300, H - 84);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(W - 300, H - 72, 180, 12);
  const condition = 100 - plane.damage;
  ctx.fillStyle = condition < 30 ? PALETTE.hudRed : condition < 65 ? PALETTE.hudAmber : PALETTE.hudGreen;
  ctx.fillRect(W - 300, H - 72, 180 * (condition / 100), 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`${Math.round(condition)}%`, W - 110, H - 60);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`WIND ${game.wind >= 0 ? '+' : ''}${Math.round(game.wind)} kt  ·  FLAPS ${plane.flaps ? 'DOWN' : 'UP'}`, W - 300, H - 40);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('W/S throttle · ←/→ pitch · Space flaps · P pause', W - 300, H - 20);

  // Stall and damage warnings, flashing.
  if (plane.speed < 62 && !plane.onGround && Math.floor(game.t * 4) % 2 === 0) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — ADD THROTTLE, LOWER THE NOSE', W / 2, 190);
  } else if (plane.fuel < 15 && Math.floor(game.t * 4) % 2 === 0) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ LOW FUEL — LAND SOON', W / 2, 190);
  }
}

// ---- Screens ----

function screenShade(ctx, canvas, alpha) {
  ctx.fillStyle = `rgba(6, 14, 28, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTitle(ctx, canvas, game, buttons) {
  screenShade(ctx, canvas, 0.45);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('MERAPI COURIER', canvas.width / 2, 170);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('A bush-pilot flight game across the valley of Gunung Bara', canvas.width / 2, 214);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('Thread the golden rings. Mind the fuel. Bring her home to runway 09.', canvas.width / 2, 250);
  ctx.fillText('W/S or ↑/↓ throttle · ←/→ pitch · Space flaps · mouse works the menus', canvas.width / 2, 278);

  // Mission cards.
  game.missions.forEach((mission, i) => {
    const card = buttons[i];
    const hovered = card.hovered;
    ctx.fillStyle = hovered ? 'rgba(255, 209, 102, 0.22)' : PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w, card.h, 12);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#ffd166' : 'rgba(234, 244, 255, 0.3)';
    ctx.lineWidth = hovered ? 2.5 : 1;
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(mission.name, card.x + card.w / 2, card.y + 36);
    ctx.fillStyle = '#eaf4ff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`${mission.rings.length} rings · ${mission.fuel}% fuel · wind ${mission.wind >= 0 ? '+' : ''}${mission.wind} kt`, card.x + card.w / 2, card.y + 64);
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(mission.done ? '✓ COMPLETED' : 'Click to fly this sortie', card.x + card.w / 2, card.y + 90);
  });

  ctx.fillStyle = '#9db8d6';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('An original game — code-drawn art, synthesised sound, no files fetched from the network.', canvas.width / 2, canvas.height - 24);
}

function drawBriefing(ctx, canvas, game, buttons) {
  screenShade(ctx, canvas, 0.5);
  const mission = game.mission;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(mission.name, canvas.width / 2, 180);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '19px system-ui, sans-serif';
  const words = mission.briefing.split(' ');
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] + word + ' ';
    if (trial.length > 72) lines.push(word + ' ');
    else lines[lines.length - 1] = trial;
  }
  lines.forEach((line, i) => ctx.fillText(line.trim(), canvas.width / 2, 230 + i * 28));
  const button = buttons[0];
  ctx.fillStyle = button.hovered ? '#ffd166' : '#e8442e';
  ctx.beginPath();
  ctx.roundRect(button.x, button.y, button.w, button.h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + 38);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Press Enter or click TAKE OFF', canvas.width / 2, button.y + button.h + 36);
}

function drawPause(ctx, canvas, game, buttons) {
  screenShade(ctx, canvas, 0.55);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf4ff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', canvas.width / 2, 260);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#cfe3ff';
  ctx.fillText('The valley waits. The fuel does not burn while you think.', canvas.width / 2, 300);
  buttons.forEach((button) => {
    ctx.fillStyle = button.hovered ? '#ffd166' : 'rgba(8, 18, 34, 0.8)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.w, button.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 244, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = button.hovered ? '#1a2b1a' : '#eaf4ff';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(button.label, button.x + button.w / 2, button.y + 34);
  });
}

function drawEnd(ctx, canvas, game, buttons) {
  screenShade(ctx, canvas, 0.55);
  ctx.textAlign = 'center';
  const won = game.endKind === 'landed' || game.endKind === 'campaign';
  ctx.fillStyle = won ? '#7be495' : '#ff6b5e';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(game.endTitle, canvas.width / 2, 200);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(game.endLine, canvas.width / 2, 244);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`Score ${game.score}  ·  Rings ${game.ringIndex}/${game.mission.rings.length}  ·  Time ${formatClock(game.plane.flightTime)}`, canvas.width / 2, 292);
  if (game.endDetail) {
    ctx.fillStyle = '#cfe3ff';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(game.endDetail, canvas.width / 2, 324);
  }
  buttons.forEach((button) => {
    ctx.fillStyle = button.hovered ? '#ffd166' : 'rgba(8, 18, 34, 0.8)';
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.w, button.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 244, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = button.hovered ? '#1a2b1a' : '#eaf4ff';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(button.label, button.x + button.w / 2, button.y + 34);
  });
}

// The one entry point the main loop calls each frame.
export function renderFrame(ctx, canvas, game) {
  const { terrain, plane, camera, missionIndex, sun } = game;
  drawSky(ctx, canvas, missionIndex, sun, game.t);
  drawFarHills(ctx, canvas, camera, game.seed);
  drawClouds(ctx, canvas, camera, terrain, game.t);
  drawTerrain(ctx, canvas, camera, terrain);
  drawAirfield(ctx, canvas, camera, terrain);
  if (game.state === 'flying' || game.state === 'paused' || game.state === 'ended') {
    drawRings(ctx, canvas, camera, game.mission, game.ringIndex, game.t);
  }
  drawPlane(ctx, canvas, camera, plane, game.t, terrain);

  if (game.state === 'flying' || game.state === 'paused') {
    drawHud(ctx, canvas, game);
  }
  if (game.state === 'title') drawTitle(ctx, canvas, game, game.buttons);
  if (game.state === 'briefing') drawBriefing(ctx, canvas, game, game.buttons);
  if (game.state === 'paused') drawPause(ctx, canvas, game, game.buttons);
  if (game.state === 'ended') drawEnd(ctx, canvas, game, game.buttons);
}
