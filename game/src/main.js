// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, game over and the
// river log.
//
// ?seed=N fixes the weather and the forest. ?shot=play|landing|storm|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_DROP,
  ACTION_FLAPS,
  ACTION_FLOATS,
  ACTION_PAUSE,
  ACTION_PHOTO,
  createInput,
} from './input.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_RESULTS,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { autopilotControls, createAutopilot, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  renderer.snapCamera(world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const pilot = createAutopilot();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and the big events.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Flying the Amazon river run. Leg 1, Dawn Departure.');
  }

  function endGame(reason) {
    screen = SCREEN_OVER;
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    announce(`Flight ended. ${reason} Score ${world.score}. Best ${best}.`);
  }

  function showResults() {
    screen = SCREEN_RESULTS;
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    announce(`Route complete. Total score ${world.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_RESULTS) startGame();
      else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Flying.');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Flying.');
      }
    }
    if (screen === SCREEN_PLAY) {
      world.pendingFlaps = world.pendingFlaps || !!(actions & ACTION_FLAPS);
      world.pendingFloats = world.pendingFloats || !!(actions & ACTION_FLOATS);
      world.pendingDrop = world.pendingDrop || !!(actions & ACTION_DROP);
      world.pendingPhoto = world.pendingPhoto || !!(actions & ACTION_PHOTO);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the dawn leg flies itself behind the title.
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) resetWorld(world);
      return;
    }
    const controls = {
      pitch: input.pitch(),
      bank: input.bank(),
      throttleDelta: input.throttleDelta(),
      flaps: world.pendingFlaps === true,
      floats: world.pendingFloats === true,
      brake: input.brake(),
      drop: world.pendingDrop === true,
      photo: world.pendingPhoto === true,
    };
    world.pendingFlaps = false;
    world.pendingFloats = false;
    world.pendingDrop = false;
    world.pendingPhoto = false;
    const events = stepWorld(world, controls, STEP);
    if (events.ring) announce(`Ring. Score ${world.score}.`);
    else if (events.photo) announce(`${world.message} Score ${world.score}.`);
    else if (events.cargo) announce(`${world.cargoResult}. Score ${world.score}.`);
    else if (events.fuelEmpty) announce('Low fuel. Glide to the river.');
    else if (events.feat) announce(`Feat earned: ${events.feat}.`);
    if (events.crashed) endGame(world.crashReason);
    else if (world.finished) showResults();
    else if (events.legDone) announce(`Leg ${world.legIndex} complete. Score ${world.score}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best, STEP);
  }

  // Leaving the tab pauses a running game rather than letting the plane fly unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Amazon River Run. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
