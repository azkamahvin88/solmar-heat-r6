// Keyboard and mouse input. Held keys steer; one-shot presses (start, pause,
// enter car, weapon, radio) are queued as flags and taken once by the loop,
// so a press between two frames is never lost or counted twice.
export const ACT_CONFIRM = 1, ACT_PAUSE = 2, ACT_ENTER = 4, ACT_WEAPON = 8,
  ACT_RADIO = 16, ACT_SHOOT = 32, ACT_MAP = 64, ACT_SAVE = 128;

const FWD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const WEAPON = new Set(['KeyQ']);
const RADIO = new Set(['KeyR']);
const MAP = new Set(['KeyM']);
const SAVE = new Set(['KeyF']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseDown = false;
  let dragX = 0, dragY = 0;

  window.addEventListener('keydown', (event) => {
    if (FWD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || RUN.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACT_CONFIRM; event.preventDefault(); }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACT_PAUSE; }
    else if (ENTER.has(event.code)) { if (!event.repeat) actions |= ACT_ENTER; }
    else if (WEAPON.has(event.code)) { if (!event.repeat) actions |= ACT_WEAPON; }
    else if (RADIO.has(event.code)) { if (!event.repeat) actions |= ACT_RADIO; }
    else if (MAP.has(event.code)) { if (!event.repeat) actions |= ACT_MAP; }
    else if (SAVE.has(event.code)) { if (!event.repeat) actions |= ACT_SAVE; }
    else if (event.code === 'Digit1') { if (!event.repeat) actions |= ACT_WEAPON; }
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); mouseDown = false; });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true; dragX = event.clientX; dragY = event.clientY;
    actions |= ACT_SHOOT;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  window.addEventListener('pointermove', (event) => {
    if (!mouseDown) return;
    canvas._orbitDx = (canvas._orbitDx || 0) + (event.clientX - dragX);
    canvas._orbitDy = (canvas._orbitDy || 0) + (event.clientY - dragY);
    dragX = event.clientX; dragY = event.clientY;
  });

  const has = (set) => { for (const c of set) if (held.has(c)) return true; return false; };
  return {
    forward() { return has(FWD); },
    back() { return has(BACK); },
    left() { return has(LEFT); },
    right() { return has(RIGHT); },
    run() { return has(RUN); },
    mouseHeld() { return mouseDown; },
    takeOrbit() {
      const dx = canvas._orbitDx || 0, dy = canvas._orbitDy || 0;
      canvas._orbitDx = 0; canvas._orbitDy = 0;
      return { dx, dy };
    },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
