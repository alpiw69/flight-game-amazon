// The screenshot scenes behind ?shot=play|landing|storm|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot that aims at the next ring, the drop dock, the animal or the water landing,
// so the frame is what a real flight looks like and the same seed always gives the same
// frame. The autopilot also flies the whole route in the test harness.

import { STEP, WATER_Y } from './config.js';
import { frameAnimal, photoTarget } from './photo.js';
import { nextTarget, resetWorld, startLeg, stepWorld, terrainHeightAt } from './world.js';
import { riverCenterX } from './river.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE } from './render.js';

/** The autopilot's own memory: which toggles it has already flipped this leg. */
export function createAutopilot() {
  return { floatsSet: false, flapsSet: false, floatsRaised: false, legIndex: -1, photoCooldown: 0 };
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The controls for one step, as the world expects them: { pitch, bank, throttleDelta,
 * flaps, floats, brake, drop, photo }. The pilot follows the winding river by aiming at
 * the centreline ahead, dives to the animal for a photo, drops over the dock, and flies
 * a gentle descent with a flare for the water touchdown.
 */
export function autopilotControls(world, pilot) {
  const flight = world.flight;
  const leg = world.leg;
  const out = { pitch: 0, bank: 0, throttleDelta: 0, flaps: false, floats: false, brake: false, drop: false, photo: false };

  if (pilot.legIndex !== world.legIndex) {
    pilot.legIndex = world.legIndex;
    pilot.floatsSet = false;
    pilot.flapsSet = false;
    pilot.floatsRaised = false;
    pilot.photoCooldown = 0;
  }
  if (pilot.photoCooldown > 0) pilot.photoCooldown -= 1;

  if (world.phase === 'rollout') {
    out.throttleDelta = -1;
    out.brake = true;
    return out;
  }
  if (world.phase !== 'flying') return out;

  const target = nextTarget(world);
  const distToTarget = target.z - flight.z;

  // Water takeoff: full throttle, rotate past 85 kt, climb away.
  if (!flight.airborne) {
    out.throttleDelta = 1;
    out.pitch = flight.speed > 78 ? 0.8 : 0;
    return out;
  }

  // Floats up once the climb is established; they come back down on final.
  if (!pilot.floatsRaised && flight.speed > 150 && flight.floats) {
    out.floats = true;
    pilot.floatsRaised = true;
  }

  // Bank toward the target: the heading the target wants, corrected for the heading we
  // have. When the target is far, steer at the river centreline ahead instead, so the
  // plane follows the winding water instead of cutting across the forest.
  let aimX = target.x;
  if (distToTarget > 6000) {
    aimX = riverCenterX(flight.z + 3500);
  }
  const desiredHeading = Math.atan2(aimX - flight.x, Math.max(200, distToTarget));
  const headingError = angleDiff(desiredHeading, flight.heading);
  out.bank = clamp(headingError * 2.4, -1, 1);

  // Throttle: cruise speed on the way, approach speed on final.
  const onFinal = target.kind === 'landing' && distToTarget < 9000;
  const wantSpeed = onFinal ? 100 : leg.cruiseSpeed;
  out.throttleDelta = flight.speed < wantSpeed - 4 ? 1 : flight.speed > wantSpeed + 4 ? -1 : 0;

  // Altitude: hold the ring's height, the drop height, the photo height, or fly the descent.
  let desiredVs = 0;
  if (target.kind === 'ring') {
    desiredVs = clamp((target.y - flight.y) * 4.0, -3000, 3000);
  } else if (target.kind === 'drop') {
    desiredVs = clamp((800 - flight.y) * 1.0, -1500, 1500);
    // The crate keeps flying forward as it falls: drop where its landing point, not the
    // plane, is over the dock.
    const fallTime = Math.sqrt(Math.max(0, flight.y - WATER_Y) / 16);
    const landX = flight.x + flight.speed * 1.68781 * Math.sin(flight.heading) * fallTime;
    const landZ = flight.z + flight.speed * 1.68781 * Math.cos(flight.heading) * fallTime;
    if (Math.abs(landX - target.x) < 100 && Math.abs(landZ - target.z) < 100) {
      out.drop = true;
    }
  } else if (target.kind === 'animal') {
    // Dive or climb hard to the photo height: the window for a centred frame is short.
    desiredVs = clamp((target.y - flight.y) * 4.0, -3000, 3000);
    // Snap the photo when the animal is well framed.
    const animal = photoTarget(world);
    if (animal && pilot.photoCooldown === 0) {
      const frame = frameAnimal(world, animal);
      if (frame && (frame.quality === 'perfect' || (frame.quality === 'good' && frame.forward < 1500))) {
        out.photo = true;
        pilot.photoCooldown = 90;
      }
    }
  } else {
    // Landing: join a 3-degree glide line to the water and hold it down. The line itself
    // falls as the plane advances, so the command feeds that fall rate forward.
    const slope = 0.05;
    const glideAlt = WATER_Y + distToTarget * slope;
    const lineRate = slope * flight.speed * 1.68781 * 60;
    if (distToTarget > 400) {
      desiredVs = clamp(-lineRate + (glideAlt - flight.y) * 6.0, -1600, 800);
    } else if (distToTarget > 150) {
      desiredVs = -260;
    } else {
      // Flare: bleed the descent off right over the water for a soft touchdown.
      desiredVs = -200;
    }
  }
  // Pitch from the vertical speed we want: vs = speed * KT * sin(pitch) * 60.
  const vsPerSin = Math.max(3000, flight.speed * 1.68781 * 60);
  const sinPitch = clamp(desiredVs / vsPerSin, -0.24, 0.24);
  out.pitch = clamp(Math.asin(sinPitch) / (13 * (Math.PI / 180)), -1, 1);

  // Floats and flaps come out on final, once each.
  if (target.kind === 'landing' && distToTarget < 7000 && flight.y < 1200 && !pilot.floatsSet && !flight.floats) {
    out.floats = true;
    pilot.floatsSet = true;
  }
  if (target.kind === 'landing' && distToTarget < 5000 && flight.y < 1000 && !pilot.flapsSet && !flight.flaps) {
    out.flaps = true;
    pilot.flapsSet = true;
  }
  return out;
}

const PLAY_STOP_Z = 20200; // stop 1800 ft short of the second dolphin, framed gold in the viewfinder
const STORM_STOP_Z = 19000; // stop mid-squall, by the third ring
const END_LIMIT_SECONDS = 1500;

/**
 * Set `world` to the named scene (play, landing, storm or end; any other name is the
 * title) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const pilot = createAutopilot();

  if (name !== 'play' && name !== 'landing' && name !== 'storm' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // Dolphin survey: fly leg 2 until the second dolphin sits perfectly in the
    // viewfinder — and stop on that exact step, before the autopilot snaps the
    // photo, so the cover shows the gold frame and the dolphin in it.
    resetWorld(world);
    startLeg(world, 1);
    for (let i = 0; i < 60000; i += 1) {
      const animal = photoTarget(world);
      if (animal && animal.z > 18000) {
        const frame = frameAnimal(world, animal);
        if (frame && (frame.quality === 'perfect' || (frame.quality === 'good' && frame.forward < 2000))) break;
      }
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      if (world.flight.z >= PLAY_STOP_Z) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'landing') {
    // Night river: fly leg 5 all the way to the lit buoy lane, and catch the plane just
    // past the buoys on the water — floats down, spray up, village lights behind.
    resetWorld(world);
    startLeg(world, 4);
    for (let i = 0; i < 60000; i += 1) {
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      const f = world.flight;
      // Stop mid-rollout, once she has slowed and levelled off — still moving,
      // still throwing a little spray, floats down, buoys lit.
      if (world.phase === 'rollout' && f.speed < 75) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'storm') {
    // Storm squall: fly leg 4 into the weather, rain and fog around the rings.
    resetWorld(world);
    startLeg(world, 3);
    for (let i = 0; i < 60000; i += 1) {
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      if (world.flight.z >= STORM_STOP_Z) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // The river log: fly the whole route, leg by leg, and show what it added up to.
  resetWorld(world);
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const events = stepWorld(world, autopilotControls(world, pilot), STEP);
    if (world.finished || events.crashed) break;
  }
  return { screen: world.finished ? SCREEN_RESULTS : SCREEN_OVER, best: world.score };
}
