// Keyboard and pointer input. Held keys give a duck state; one-shot presses
// (jump, start, restart, pause, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never counted
// twice. Clicking a menu button is a pointer press on that button's rect;
// a click anywhere else during play jumps.

export const ACTION_JUMP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const CONFIRM = new Set(['Enter']);
const DUCK = new Set(['ArrowDown', 'KeyS']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(target) {
  let ducking = false;
  let actions = 0;
  /** The last pointer position, for button hover/click hit-testing. */
  let pointer = { x: -1, y: -1 };
  /**
   * The pending click (a pointerdown), as canvas pixels. A click is a
   * discrete event: it is set by pointerdown and consumed by takeClick.
   * pointerup does NOT clear it — a fast click's up event would otherwise
   * erase the down before the game loop reads it.
   */
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (CONFIRM.has(event.code) || RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DUCK.has(event.code)) {
      ducking = true;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (DUCK.has(event.code)) ducking = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    ducking = false;
  });

  function readPointer(event) {
    const rect = target.getBoundingClientRect();
    pointer = {
      x: (event.clientX - rect.left) * (target.width / rect.width),
      y: (event.clientY - rect.top) * (target.height / rect.height),
    };
  }
  target.addEventListener('pointermove', readPointer);
  target.addEventListener('pointerdown', (event) => {
    readPointer(event);
    click = { x: pointer.x, y: pointer.y };
    // A click during play is a jump; on menus it is a button press, which
    // the screen code decides from the pointer position.
    actions |= ACTION_JUMP | ACTION_CONFIRM;
  });

  return {
    /** True while a duck key is held. */
    isDucking() {
      return ducking;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last pointer position in canvas coordinates. */
    pointerPosition() {
      return pointer;
    },
    /** The pending click's position, or null; consumes it. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
