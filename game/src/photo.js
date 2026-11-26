// The wildlife photo survey: the animals of the river and how a photo of one is scored.
// An animal is photographable while it is ahead of the plane and roughly on course; the
// viewfinder frames it, and Space snaps the photo. The score is the framing: how close
// the animal sits to the centre of the frame, and how close the plane is. One photo per
// animal — a second snap of the same animal scores nothing. Framing is measured from the
// plane's heading, so the world never needs the renderer's camera.

import { FOCAL, SCORE, WATER_Y } from './config.js';
import { animalLayout } from './river.js';

/** The animals of a leg, with their world positions and photo state. */
export function createAnimals(leg) {
  return leg.animals.map((animal, index) => {
    const pos = animalLayout(leg, animal);
    return {
      kind: animal.kind,
      label: animal.label,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      photographed: false,
      score: 0,
      phase: index * 2.1 + 0.7,
    };
  });
}

/** The nearest unphotographed animal ahead of the plane, or null. */
export function photoTarget(world) {
  const flight = world.flight;
  let best = null;
  let bestDist = 9000;
  for (const animal of world.animals) {
    if (animal.photographed) continue;
    const dz = animal.z - flight.z;
    if (dz < -200 || dz > 9000) continue;
    const dx = Math.abs(animal.x - flight.x);
    if (dx > 2600) continue;
    if (dz < bestDist) {
      bestDist = dz;
      best = animal;
    }
  }
  return best;
}

/** How tall an animal stands, in feet, for the frame size. */
function animalSize(animal) {
  if (animal.kind === 'dolphin') return 26;
  if (animal.kind === 'jaguar') return 30;
  if (animal.kind === 'macaw') return 34;
  return 24;
}

/** The animal's animated height: dolphins arc out of the water, macaws bob in flight. */
export function animalY(animal, time) {
  if (animal.kind === 'dolphin') {
    const arc = Math.sin(time * 1.1 + animal.phase);
    return Math.max(0, arc * arc * 26);
  }
  if (animal.kind === 'macaw') return Math.sin(time * 2.2 + animal.phase) * 14;
  return 0;
}

/**
 * Frame an animal in the viewfinder, from the plane's heading: how far off-centre it
 * sits, in screen pixels, and how big it looks. Returns null when it is behind the
 * plane. quality is perfect / good / ok / null (out of frame).
 */
export function frameAnimal(world, animal) {
  const flight = world.flight;
  const ax = animal.x - flight.x;
  const ay = animal.y + animalY(animal, world.time) - flight.y;
  const az = animal.z - flight.z;
  const sin = Math.sin(flight.heading);
  const cos = Math.cos(flight.heading);
  const forward = ax * sin + az * cos;
  if (forward < 200) return null;
  const lateral = ax * cos - az * sin;
  const latAngle = Math.atan2(lateral, forward);
  const vertAngle = Math.atan2(ay, forward);
  // 25 degrees sideways and 15 degrees up/down fill the frame.
  const err = Math.hypot((latAngle / 0.44) * 320, (vertAngle / 0.26) * 200);
  const dist = Math.hypot(ax, ay, az);
  const size = (animalSize(animal) * FOCAL) / forward;
  let quality = null;
  if (err < 70 && dist < 2600) quality = 'perfect';
  else if (err < 170 && dist < 4200) quality = 'good';
  else if (err < 340 && dist < 7000) quality = 'ok';
  return { err, dist, size, quality, forward, lateral };
}

/**
 * Snap a photo: score the framed animal, or nothing when no animal is in the frame.
 * Returns the event text for the loop to announce.
 */
export function snapPhoto(world, events) {
  const animal = photoTarget(world);
  if (!animal) {
    world.message = 'NO ANIMAL IN FRAME';
    world.messageUntil = world.legTime + 2;
    return;
  }
  const frame = frameAnimal(world, animal);
  if (!frame || !frame.quality) {
    world.message = `${animal.label.toUpperCase()} — TOO FAR, GET CLOSER`;
    world.messageUntil = world.legTime + 2;
    return;
  }
  animal.photographed = true;
  let points = SCORE.photoOk;
  let label = 'PHOTO OK';
  if (frame.quality === 'perfect') {
    points = SCORE.photoPerfect;
    label = 'PERFECT PHOTO';
  } else if (frame.quality === 'good') {
    points = SCORE.photoGood;
    label = 'GOOD PHOTO';
  }
  animal.score = points;
  world.score += points;
  world.legScore += points;
  world.photosTaken += 1;
  world.routePhotos += 1;
  events.photo = true;
  world.message = `${label} +${points} — ${animal.label}`;
  world.messageUntil = world.legTime + 3;
}

export { WATER_Y };
