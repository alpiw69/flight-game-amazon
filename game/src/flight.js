// The flight model: one modern amphibious seaplane, flown by pitch, bank and throttle.
// All speeds in knots, altitudes in feet, angles in degrees. The world calls stepFlight
// once per fixed step with the pilot's controls; the plane answers with how it actually
// flies — the water takeoff with spray and planing, the stall, the flare onto the river,
// and the fuel burn. Floats down means she can land on water; floats up is faster but
// a water touchdown then is a ditch.

import { KT, PLANE, WATER_Y } from './config.js';

const DEG = Math.PI / 180;

/** A fresh seaplane, floating on the river at the leg start, ready to go. */
export function createFlightState(leg) {
  return {
    x: 0,
    y: WATER_Y,
    z: -2600,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    vs: 0,
    fuel: PLANE.fuelStart,
    damage: 0,
    flaps: false,
    floats: true,
    brake: false,
    onWater: true,
    airborne: false,
    // True once the floats leave the river; used for the rotate cue.
    rotated: false,
    // True while the floats are planing on the water (spray on).
    planing: false,
  };
}

/**
 * Advance the seaplane one step. controls: { pitch (-1..1, + is climb), bank (-1..1),
 * throttleDelta (-1..1), gustPitch, gustBank } in degrees of disturbance. Returns nothing;
 * the state is updated.
 */
export function stepFlight(state, controls, dt, weather) {
  // Throttle answers the lever; an empty tank answers nothing.
  if (state.fuel > 0) {
    state.throttle = clamp(state.throttle + controls.throttleDelta * dt * 0.55, 0, 1);
  } else {
    state.throttle = 0;
  }

  // Speed chases the throttle: slower with flaps, slower with the floats down, slower
  // still in a climb, and dragging on the water until she planes.
  const drag = (state.flaps ? 0.82 : 1) * (state.floats ? 0.9 : 1) * (state.onWater ? 0.55 : 1);
  const top = state.floats ? PLANE.maxSpeed : PLANE.maxSpeedClean;
  const target = PLANE.stallSpeed + state.throttle * (top - PLANE.stallSpeed) * drag;
  let speed = state.speed + (target - state.speed) * Math.min(1, dt * 0.35);
  speed += (state.pitch < 0 ? 14 : 0) * dt;
  speed -= (state.pitch > 0 ? 8 : 0) * dt;
  state.speed = Math.max(0, speed);

  // Water drag at idle: a floating plane slows on her own, so a water rollout ends.
  if (state.onWater && state.throttle < 0.1) state.speed = Math.max(0, state.speed - 14 * dt);

  const stalled = state.speed < PLANE.stallSpeed && !state.onWater;

  // Pitch and bank chase the stick, with the gust shaking them. A stalled wing drops the nose.
  const pitchTarget = stalled
    ? -6
    : controls.pitch * PLANE.maxPitch + (controls.gustPitch || 0);
  const bankTarget = controls.bank * PLANE.maxBank + (controls.gustBank || 0);
  state.pitch = approach(state.pitch, clamp(pitchTarget, -PLANE.maxPitch - 4, PLANE.maxPitch + 4), 24 * dt);
  state.roll = approach(state.roll, clamp(bankTarget, -PLANE.maxBank - 6, PLANE.maxBank + 6), 62 * dt);

  // A banked wing turns the nose: heading follows the roll.
  const turnRate = state.roll * 0.32 * (state.speed / 200);
  state.heading += turnRate * DEG * dt;

  // Vertical speed is the speed times the climb angle.
  state.vs = state.speed * KT * Math.sin(state.pitch * DEG) * 60;

  if (state.onWater) {
    // On the river she taxis: she planes past 55 kt (spray on), and lifts off past
    // rotation speed with the nose up.
    state.vs = 0;
    state.planing = state.speed > 55;
    if (state.speed > PLANE.rotateSpeed && state.pitch > 4) {
      state.onWater = false;
      state.airborne = true;
      state.rotated = true;
      state.planing = false;
    }
  } else {
    state.y += (state.vs / 60) * dt;
  }

  // Forward motion, along the heading.
  const forward = state.speed * KT * Math.cos(state.pitch * DEG);
  state.x += forward * Math.sin(state.heading) * dt;
  state.z += forward * Math.cos(state.heading) * dt;

  // Fuel burns with the throttle; flaps cost a little more.
  const burn = PLANE.burnIdle + state.throttle * (PLANE.burnFull - PLANE.burnIdle);
  state.fuel = Math.max(0, state.fuel - burn * (state.flaps ? 1.12 : 1) * dt);
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function approach(value, target, step) {
  if (value < target) return Math.min(target, value + step);
  if (value > target) return Math.max(target, value - step);
  return value;
}
