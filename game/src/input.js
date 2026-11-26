// Keyboard and pointer input. Held keys steer the seaplane; one-shot presses (confirm,
// pause, flaps, floats, drop, photo) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FLAPS = 4;
export const ACTION_FLOATS = 8;
export const ACTION_DROP = 16;
export const ACTION_PHOTO = 32;

const PITCH_UP = new Set(['ArrowUp', 'KeyW']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyS']);
const BANK_LEFT = new Set(['ArrowLeft', 'KeyA']);
const BANK_RIGHT = new Set(['ArrowRight', 'KeyD']);
const THROTTLE_UP = new Set(['ShiftLeft', 'ShiftRight', 'Equal', 'NumpadAdd']);
const THROTTLE_DOWN = new Set(['ControlLeft', 'ControlRight', 'Minus', 'NumpadSubtract']);
const BRAKE = new Set(['KeyB']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const FLAPS = new Set(['KeyF']);
const FLOATS = new Set(['KeyG']);
const DROP = new Set(['KeyX']);

export function createInput(target) {
  let pitchUp = false;
  let pitchDown = false;
  let bankLeft = false;
  let bankRight = false;
  let throttleUp = false;
  let throttleDown = false;
  let brake = false;
  let actions = 0;

  function press(event, set, flag) {
    if (set.has(event.code)) {
      if (flag !== 0 && !event.repeat) actions |= flag;
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      // Space is confirm on menus, the camera shutter in flight, and the supply release
      // when a drop is armed; the loop picks by screen and by what is ahead.
      if (!event.repeat) actions |= ACTION_CONFIRM | ACTION_DROP | ACTION_PHOTO;
    } else if (PITCH_UP.has(event.code)) pitchUp = true;
    else if (PITCH_DOWN.has(event.code)) pitchDown = true;
    else if (BANK_LEFT.has(event.code)) bankLeft = true;
    else if (BANK_RIGHT.has(event.code)) bankRight = true;
    else if (THROTTLE_UP.has(event.code)) throttleUp = true;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = true;
    else if (BRAKE.has(event.code)) brake = true;
    else if (press(event, CONFIRM, ACTION_CONFIRM)) { /* queued */ }
    else if (press(event, PAUSE, ACTION_PAUSE)) { /* queued */ }
    else if (press(event, FLAPS, ACTION_FLAPS)) { /* queued */ }
    else if (press(event, FLOATS, ACTION_FLOATS)) { /* queued */ }
    else if (press(event, DROP, ACTION_DROP)) { /* queued */ }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (PITCH_UP.has(event.code)) pitchUp = false;
    else if (PITCH_DOWN.has(event.code)) pitchDown = false;
    else if (BANK_LEFT.has(event.code)) bankLeft = false;
    else if (BANK_RIGHT.has(event.code)) bankRight = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
    else if (BRAKE.has(event.code)) brake = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    pitchUp = false;
    pitchDown = false;
    bankLeft = false;
    bankRight = false;
    throttleUp = false;
    throttleDown = false;
    brake = false;
  });
  target.addEventListener('pointerdown', (event) => {
    // Clicking the big centre button confirms; anywhere else snaps a photo in flight.
    if (event.clientY > 520 && event.clientX > 480 && event.clientX < 800) actions |= ACTION_CONFIRM;
    else actions |= ACTION_PHOTO | ACTION_DROP;
  });

  return {
    /** -1 to 1: + is climb, - is descend. */
    pitch() {
      return (pitchUp ? 1 : 0) - (pitchDown ? 1 : 0);
    },
    /** -1 to 1: + is bank right, - is bank left. */
    bank() {
      return (bankRight ? 1 : 0) - (bankLeft ? 1 : 0);
    },
    /** -1 to 1: throttle lever movement for this frame. */
    throttleDelta() {
      return (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0);
    },
    brake() {
      return brake;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
