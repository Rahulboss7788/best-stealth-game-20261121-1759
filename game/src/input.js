// Keyboard and pointer input. Held keys steer the thief; one-shot presses (start,
// restart, pause, mute) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. A mouse click sets a
// walk-to target; any keypress cancels it, so keyboard and mouse share the same move.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

/**
 * `toField` converts a client (mouse) position to field coordinates; the renderer
 * supplies it so a click lands where the player sees it.
 */
export function createInput(canvas, toField) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  let clickTarget = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    clickTarget = null;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toField(event.clientX, event.clientY);
    if (point.x >= 0 && point.x <= FIELD.width && point.y >= 0 && point.y <= FIELD.height) {
      clickTarget = point;
    }
    actions |= ACTION_CONFIRM;
  });

  return {
    /** A unit-ish move vector from the held keys, or toward the click target. */
    move(player) {
      const kx = (right ? 1 : 0) - (left ? 1 : 0);
      const ky = (down ? 1 : 0) - (up ? 1 : 0);
      if (kx !== 0 || ky !== 0) {
        clickTarget = null;
        const len = Math.sqrt(kx * kx + ky * ky);
        return { x: kx / len, y: ky / len };
      }
      if (clickTarget) {
        const dx = clickTarget.x - player.x;
        const dy = clickTarget.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          clickTarget = null;
          return { x: 0, y: 0 };
        }
        return { x: dx / dist, y: dy / dist };
      }
      return { x: 0, y: 0 };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
