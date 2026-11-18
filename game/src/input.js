// Keyboard and mouse: WASD/arrows swim, the mouse aims, click or Space shoots,
// P/Esc pauses, M mutes. Actions are edge-triggered; movement is level-triggered.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let mouseSeen = false;

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseSeen = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = canvasPoint(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseSeen = true;
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** Normalised swim direction from the held movement keys. */
    direction() {
      let x = 0;
      let y = 0;
      held.forEach((code) => {
        const vector = MOVE_KEYS[code];
        if (vector) {
          x += vector[0];
          y += vector[1];
        }
      });
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** Aim point in canvas pixels; defaults ahead of the player until the mouse moves. */
    aim(fallbackX, fallbackY) {
      return mouseSeen ? { x: mouseX, y: mouseY } : { x: fallbackX, y: fallbackY };
    },
    shooting() {
      return mouseDown || held.has('Space');
    },
    /** One-shot actions since the last call; clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
