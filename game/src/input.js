// Merapi Courier — keyboard and mouse. The keyboard flies the plane; the
// mouse works the menus, the mission cards and the throttle slider on the
// pause screen. Nothing here needs a network or a pointer lock.

export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    throttleUp: false,
    throttleDown: false,
    pitchUp: false,
    pitchDown: false,
    flapsToggle: false,
    // Mouse position in canvas pixels, and a click queue the game drains.
    mouseX: 0,
    mouseY: 0,
    clicks: [],
    // Keys pressed since the last drain (for menu shortcuts).
    pressed: new Set(),
  };

  function readKeys() {
    input.throttleUp = keys.has('KeyW') || keys.has('ArrowUp');
    input.throttleDown = keys.has('KeyS') || keys.has('ArrowDown');
    input.pitchUp = keys.has('ArrowLeft') || keys.has('KeyA');
    input.pitchDown = keys.has('ArrowRight') || keys.has('KeyD');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.pressed.add(event.code);
      if (event.code === 'Space') input.flapsToggle = true;
    }
    keys.add(event.code);
    readKeys();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    readKeys();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    readKeys();
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.clicks.push({ x: p.x, y: p.y });
  });

  // Drain one-shot key presses; call once per frame after the game reads them.
  input.drainPressed = function drainPressed() {
    const out = new Set(input.pressed);
    input.pressed.clear();
    return out;
  };

  input.drainClicks = function drainClicks() {
    const out = input.clicks.slice();
    input.clicks.length = 0;
    return out;
  };

  return input;
}

// A rectangular button: hit-test plus a hover state for the renderer.
export function makeButton(x, y, w, h, label, action) {
  return { x, y, w, h, label, action };
}

export function buttonHit(button, px, py) {
  return px >= button.x && px <= button.x + button.w && py >= button.y && py <= button.y + button.h;
}

export function buttonHovered(button, mx, my) {
  return buttonHit(button, mx, my);
}
