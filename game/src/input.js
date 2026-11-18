// Keyboard and mouse input. Held keys steer and fire; one-shot presses (confirm, pause, mute, dash,
// flare, card picks) are queued and taken once by the loop, so a press between frames is never lost.
import { FIELD } from './config.js';

const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};
const PRESS = {
  Enter: 'confirm', Space: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'flare', KeyQ: 'flare',
  KeyP: 'pause', Escape: 'pause', KeyM: 'mute', Digit1: 'pick1', Digit2: 'pick2', Digit3: 'pick3',
};

export function createInput(canvas, view) {
  const held = new Set();
  let presses = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2, down: false };

  window.addEventListener('keydown', (event) => {
    const isMove = Object.values(KEYS).some((codes) => codes.includes(event.code));
    if (isMove) held.add(event.code);
    else if (PRESS[event.code]) { if (!event.repeat) presses.add(PRESS[event.code]); }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const point = view.toField(event.clientX - rect.left, event.clientY - rect.top);
    mouse.x = point.x;
    mouse.y = point.y;
  }
  canvas.addEventListener('pointermove', toField);
  canvas.addEventListener('pointerdown', (event) => {
    toField(event);
    if (event.button === 2) presses.add('flare');
    else { mouse.down = true; presses.add('click'); }
  });
  window.addEventListener('pointerup', (event) => { if (event.button !== 2) mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const isHeld = (name) => KEYS[name].some((code) => held.has(code));
  return {
    mouse,
    /** The steering vector from WASD or the arrows, each axis -1..1. */
    move() {
      return { x: (isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0), y: (isHeld('down') ? 1 : 0) - (isHeld('up') ? 1 : 0) };
    },
    /** The one-shot presses since the last call, as a Set of names. */
    takePresses() {
      const taken = presses;
      presses = new Set();
      return taken;
    },
  };
}
