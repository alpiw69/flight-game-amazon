// The world: the Amazon river run, one leg at a time. It owns the flight state, the
// rings, the supply crates, the animals, the weather, the score and the feats, and it
// turns each fixed step into the events the loop announces: rings flown, photos snapped,
// crates dropped, water touchdowns, legs finished, crashes.

import { FEATS, KT, PLANE, SCORE, WATER_Y } from './config.js';
import { LEGS, animalLayout, fuelDockLayout, riverCenterX, riverHalf, villageLayout } from './river.js';
import { canopyHeightAt, forestCeiling, forestLayout, sandBarLayout } from './forest.js';
import { addRipple, burstSpray, createWater, stepWater, trailSpray } from './water.js';
import { createAnimals, snapPhoto } from './photo.js';
import { createFlightState, stepFlight } from './flight.js';
import { createRandom } from './random.js';

const GRAVITY = 32; // ft/s^2, for the supply crate
const LANDING_ZONE_START = 2200; // feet before the leg end where a water landing counts

export const EVENT_NONE = 0;

export function createWorld(random) {
  const world = {
    random,
    legIndex: 0,
    leg: LEGS[0],
    flight: null,
    rings: [],
    drops: [],
    crate: null,
    animals: [],
    forest: [],
    sandBars: [],
    villages: [],
    fuelDock: null,
    clouds: [],
    water: createWater(random),
    phase: 'flying',
    time: 0,
    legTime: 0,
    score: 0,
    legScore: 0,
    legStartDamage: 0,
    combo: 0,
    ringsHit: 0,
    photosTaken: 0,
    routePhotos: 0,
    routeAnimalTotal: LEGS.reduce((n, l) => n + l.animals.length, 0),
    feats: new Set(),
    legResults: [],
    message: '',
    messageUntil: 0,
    crashReason: '',
    landingVs: 0,
    landingQuality: '',
    cargoResult: '',
    lightningTimer: 5,
    lightningFlash: 0,
    bolt: null,
    rollout: 0,
    intermission: 0,
    finished: false,
    fuelWarned: false,
    refuelTimer: 0,
    refuelDone: false,
    rippleTimer: 0,
  };
  startLeg(world, 0);
  return world;
}

/** Begin a leg: fresh seaplane floating on the river, fresh rings, fresh weather. */
export function startLeg(world, legIndex) {
  const leg = LEGS[legIndex];
  // Airframe damage carries across legs; fuel is topped up at each station.
  const carriedDamage = world.flight ? world.flight.damage : 0;
  world.legIndex = legIndex;
  world.leg = leg;
  world.flight = createFlightState(leg);
  world.flight.damage = carriedDamage;
  world.flight.x = riverCenterX(-2600);
  world.fuelWarned = false;
  world.rings = leg.rings.map((ring) => ({ ...ring, passed: false, missed: false, done: false }));
  world.drops = leg.drops.map((drop) => {
    const village = leg.villages.find((v) => v.name === drop.village);
    const dock = village ? villageLayout(leg, village) : { dockX: riverCenterX(drop.z) };
    return { ...drop, x: dock.dockX, dropped: false, scored: false };
  });
  world.animals = createAnimals(leg);
  world.crate = null;
  world.phase = 'flying';
  world.legTime = 0;
  world.legScore = 0;
  world.legStartDamage = world.flight.damage;
  world.combo = 0;
  world.ringsHit = 0;
  world.photosTaken = 0;
  world.message = `LEG ${leg.id} — ${leg.name}: ${leg.from} to ${leg.to}`;
  world.messageUntil = 4;
  world.crashReason = '';
  world.landingVs = 0;
  world.landingQuality = '';
  world.cargoResult = '';
  world.lightningTimer = 4 + world.random() * 4;
  world.lightningFlash = 0;
  world.bolt = null;
  world.rollout = 0;
  world.intermission = 0;
  world.refuelTimer = 0;
  world.refuelDone = false;
  world.rippleTimer = 0;
  world.forest = forestLayout(leg, world.random);
  world.sandBars = sandBarLayout(leg);
  world.villages = leg.villages.map((village) => ({ ...village, ...villageLayout(leg, village) }));
  world.fuelDock = fuelDockLayout(leg);
  world.water = createWater(world.random);
  world.clouds = [];
  const cloudCount = leg.weather.rain > 0 ? 34 : 26;
  for (let i = 0; i < cloudCount; i += 1) {
    world.clouds.push({
      x: (world.random() * 2 - 1) * 15000,
      y: leg.weather.rain > 0 ? 1900 + world.random() * 2400 : 2600 + world.random() * 2800,
      z: world.random() * (leg.length + 6000),
      scale: 320 + world.random() * 620,
      shade: world.random(),
    });
  }
}

/** Terrain height in feet at (x, z): water, a sand bar, a village roof, or the canopy. */
export function terrainHeightAt(world, x, z) {
  const cx = riverCenterX(z);
  const half = riverHalf(z);
  for (const bar of world.sandBars) {
    if (Math.hypot(x - bar.x, z - bar.z) < bar.r) return WATER_Y + 8;
  }
  for (const village of world.villages) {
    if (Math.abs(x - village.houseX) < 500 && Math.abs(z - village.z) < 500) return WATER_Y + 90;
  }
  if (Math.abs(x - cx) > half) return canopyHeightAt(x, z);
  return WATER_Y;
}

/** What is under the plane at (x, z): water, a sand bar, a village, or the forest. */
export function terrainKindAt(world, x, z) {
  const cx = riverCenterX(z);
  const half = riverHalf(z);
  for (const bar of world.sandBars) {
    if (Math.hypot(x - bar.x, z - bar.z) < bar.r) return 'sand';
  }
  for (const village of world.villages) {
    if (Math.abs(x - village.houseX) < 500 && Math.abs(z - village.z) < 500) return 'village';
  }
  if (Math.abs(x - cx) > half) return 'forest';
  return 'water';
}

/** The crash line for going down at (x, z). */
export function crashLineAt(world, x, z) {
  const kind = terrainKindAt(world, x, z);
  if (kind === 'forest') return 'Flew into the rainforest canopy.';
  if (kind === 'village') return 'Came down on a village roof.';
  if (kind === 'sand') return 'Beached on a sand bar.';
  return 'Ditched in the river.';
}

/** The next ring still ahead, or null when the course is done. */
export function nextRing(world) {
  for (const ring of world.rings) {
    if (!ring.done && ring.z > world.flight.z) return ring;
  }
  return null;
}

/**
 * Where the pilot should aim next: the nearest unfinished objective ahead — a ring, a
 * drop dock, or an animal — then the water landing at the end of the leg.
 */
export function nextTarget(world) {
  const flight = world.flight;
  let best = null;
  let bestZ = Infinity;
  const ring = nextRing(world);
  if (ring && ring.z < bestZ) {
    bestZ = ring.z;
    best = { kind: 'ring', x: ring.x, y: ring.y, z: ring.z };
  }
  for (const drop of world.drops) {
    if (!drop.dropped && drop.z > flight.z && drop.z < bestZ) {
      bestZ = drop.z;
      best = { kind: 'drop', x: drop.x, y: 800, z: drop.z };
    }
  }
  for (const animal of world.animals) {
    if (!animal.photographed && animal.z > flight.z && animal.z < bestZ) {
      bestZ = animal.z;
      // Fly low for the photo: about 150 ft above the animal, so it can sit in the
      // centre of the viewfinder instead of far below it.
      best = { kind: 'animal', x: animal.x, y: animal.y + 150, z: animal.z };
    }
  }
  if (best) return best;
  return { kind: 'landing', x: riverCenterX(world.leg.length), y: WATER_Y, z: world.leg.length };
}

export function resetWorld(world) {
  world.score = 0;
  world.feats = new Set();
  world.legResults = [];
  world.finished = false;
  startLeg(world, 0);
}

/**
 * Advance the world one fixed step. controls is the pilot's input for this step:
 * { pitch, bank, throttleDelta, flaps, floats, brake, drop, photo }. Returns the events
 * of this step: { ring, ringMissed, landed, legDone, crashed, dropped, cargo, photo,
 * fuelEmpty, feat }.
 */
export function stepWorld(world, controls, dt) {
  const events = { ring: false, ringMissed: false, landed: false, legDone: false, crashed: false, dropped: false, cargo: false, photo: false, fuelEmpty: false, feat: '' };
  const flight = world.flight;
  const leg = world.leg;
  world.time += dt;
  world.legTime += dt;
  if (world.message && world.legTime > world.messageUntil) world.message = '';

  // Lightning in the squall: a flash every few seconds, then it fades.
  if (leg.weather.lightning > 0) {
    world.lightningTimer -= dt;
    if (world.lightningTimer <= 0) {
      world.lightningFlash = 1;
      world.lightningTimer = 4 + world.random() * 5;
      const bx = (world.random() * 2 - 1) * 400;
      world.bolt = { x: 640 + bx, top: 60 + world.random() * 60, bottom: 300 + world.random() * 80 };
    }
    world.lightningFlash = Math.max(0, world.lightningFlash - dt * 1.8);
    if (world.lightningFlash <= 0) world.bolt = null;
  }

  if (world.phase === 'legDone') {
    world.intermission -= dt;
    if (world.intermission <= 0) {
      if (world.legIndex + 1 >= LEGS.length) {
        world.finished = true;
        world.phase = 'finished';
      } else {
        startLeg(world, world.legIndex + 1);
      }
    }
    stepWater(world.water, dt);
    return events;
  }
  if (world.phase === 'crashed' || world.phase === 'finished') {
    stepWater(world.water, dt);
    return events;
  }

  // Gusts shake the stick in rough weather.
  const gust = leg.weather.gust;
  const gustBank = gust > 0 ? (world.random() * 2 - 1) * gust * 7 : 0;
  const gustPitch = gust > 0 ? (world.random() * 2 - 1) * gust * 3 : 0;

  // Flaps and floats are toggles the pilot flips; brake, drop and photo are pressed.
  if (controls.flaps) flight.flaps = !flight.flaps;
  if (controls.floats) flight.floats = !flight.floats;
  flight.brake = !!controls.brake;

  const prevZ = flight.z;
  const prevY = flight.y;
  stepFlight(flight, { pitch: controls.pitch, bank: controls.bank, throttleDelta: controls.throttleDelta, gustPitch, gustBank }, dt, leg.weather);

  // The river current drifts a floating plane gently downstream.
  if (flight.onWater) {
    flight.z += 5 * dt;
    flight.x += (riverCenterX(flight.z) - flight.x) * 0.02 * dt;
  }

  if (flight.fuel <= 0 && !world.fuelWarned) {
    world.fuelWarned = true;
    events.fuelEmpty = true;
    world.message = 'LOW FUEL — glide to the river';
    world.messageUntil = world.legTime + 4;
  }

  // Rings: crossing a ring's plane scores it, or misses it.
  for (const ring of world.rings) {
    if (ring.done) continue;
    if (prevZ < ring.z && flight.z >= ring.z) {
      ring.done = true;
      const dist = Math.hypot(flight.x - ring.x, flight.y - ring.y);
      if (dist <= ring.r) {
        ring.passed = true;
        world.ringsHit += 1;
        world.combo += 1;
        const points = SCORE.ring + (world.combo - 1) * SCORE.ringComboStep;
        world.score += points;
        world.legScore += points;
        events.ring = true;
        world.message = `RING +${points}${world.combo > 1 ? `  COMBO x${world.combo}` : ''}`;
        world.messageUntil = world.legTime + 2.5;
      } else {
        ring.missed = true;
        world.combo = 0;
        events.ringMissed = true;
        world.message = 'RING MISSED';
        world.messageUntil = world.legTime + 2;
      }
    }
  }

  // Photo: Space snaps the framed animal.
  if (controls.photo && flight.airborne && !flight.onWater) snapPhoto(world, events);

  // Supply drop: one crate per dock, released over the village.
  const drop = world.drops.find((d) => !d.dropped);
  if (drop && controls.drop && flight.airborne && !flight.onWater) {
    drop.dropped = true;
    world.crate = {
      x: flight.x, y: flight.y, z: flight.z, vy: 0,
      vx: flight.speed * KT * Math.sin(flight.heading),
      vz: flight.speed * KT * Math.cos(flight.heading),
      landed: false, timer: 0, target: drop,
    };
    events.dropped = true;
    world.message = `SUPPLIES AWAY — ${drop.village.toUpperCase()}`;
    world.messageUntil = world.legTime + 2;
  }
  if (world.crate && !world.crate.landed) {
    const crate = world.crate;
    crate.vy -= GRAVITY * dt;
    crate.y += crate.vy * dt;
    crate.x += crate.vx * dt;
    crate.z += crate.vz * dt;
    if (crate.y <= WATER_Y + 4) {
      crate.y = WATER_Y + 4;
      crate.landed = true;
      crate.timer = 1.6;
      const target = crate.target;
      const dist = Math.hypot(crate.x - target.x, crate.z - target.z);
      let points = 0;
      let label = 'SPLASHED IN THE RIVER';
      if (dist <= 40) { points = SCORE.cargoPerfect; label = 'SUPPLIES DEAD ON +300'; }
      else if (dist <= 120) { points = SCORE.cargoGood; label = `SUPPLIES GOOD +180 (${Math.round(dist)} ft)`; }
      else if (dist <= target.r) { points = SCORE.cargoOk; label = `SUPPLIES IN THE ZONE +80 (${Math.round(dist)} ft)`; }
      world.score += points;
      world.legScore += points;
      world.cargoResult = label;
      events.cargo = true;
      world.message = label;
      world.messageUntil = world.legTime + 3;
    }
  }
  if (world.crate && world.crate.landed) world.crate.timer -= dt;

  // Spray while the floats plane, ripples while she taxis.
  if (flight.onWater && flight.planing) trailSpray(world.water, flight.x, flight.y, flight.z, flight.speed);
  if (flight.onWater) {
    world.rippleTimer -= dt;
    if (world.rippleTimer <= 0) {
      addRipple(world.water, flight.x, flight.z, 260);
      world.rippleTimer = 0.5;
    }
  }

  // Water touchdown, or the river deciding for us.
  const landingZone = flight.z >= leg.length - LANDING_ZONE_START;
  if (!flight.onWater && flight.y <= WATER_Y + 2 && prevY > WATER_Y + 2) {
    const kind = terrainKindAt(world, flight.x, flight.z);
    if (kind !== 'water') {
      return crash(world, events, crashLineAt(world, flight.x, flight.z));
    }
    if (!flight.floats) {
      return crash(world, events, 'Ditched with the floats up.');
    }
    const vs = Math.abs(flight.vs);
    flight.onWater = true;
    flight.y = WATER_Y;
    flight.vs = 0;
    flight.planing = false;
    world.landingVs = vs;
    events.landed = true;
    burstSpray(world.water, flight.x, flight.y, flight.z, 26, flight.speed);
    addRipple(world.water, flight.x, flight.z, 420);
    if (vs <= PLANE.perfectVs) {
      world.landingQuality = 'Perfect';
      world.score += SCORE.landingPerfect;
      world.legScore += SCORE.landingPerfect;
      world.message = `PERFECT WATER LANDING +${SCORE.landingPerfect}`;
      awardFeat(world, FEATS.PERFECT_LANDING, events);
    } else if (vs <= PLANE.smoothVs) {
      world.landingQuality = 'Smooth';
      world.score += SCORE.landingGood;
      world.legScore += SCORE.landingGood;
      world.message = `SMOOTH WATER LANDING +${SCORE.landingGood}`;
    } else if (vs <= PLANE.hardLandingVs) {
      world.landingQuality = 'Firm';
      flight.damage += 12;
      world.score += SCORE.landingOk;
      world.legScore += SCORE.landingOk;
      world.message = `FIRM WATER LANDING +${SCORE.landingOk}  DAMAGE +12%`;
    } else {
      return crash(world, events, 'The floats dug in on a hard touchdown.');
    }
    world.messageUntil = world.legTime + 3;
    if (landingZone) {
      world.phase = 'rollout';
      world.rollout = 0;
    }
    if (flight.damage >= 100) return crash(world, events, 'The airframe gave out after the hard landing.');
  }

  // Terrain or water at any other moment: only when the plane actually goes below the surface.
  if (!flight.onWater) {
    const ground = terrainHeightAt(world, flight.x, flight.z);
    if (flight.y < ground) {
      return crash(world, events, crashLineAt(world, flight.x, flight.z));
    }
  }

  // Floating fuel dock: sit beside it for two seconds and she fills up.
  if (world.fuelDock && !world.refuelDone && flight.onWater && flight.speed < 20) {
    const dock = world.fuelDock;
    const dist = Math.hypot(flight.x - dock.x, flight.z - dock.z);
    if (dist < 420) {
      world.refuelTimer += dt;
      if (world.refuelTimer >= 2) {
        world.refuelDone = true;
        flight.fuel = 100;
        world.score += SCORE.fuelTopUp;
        world.legScore += SCORE.fuelTopUp;
        world.message = `FUELLED UP +${SCORE.fuelTopUp}`;
        world.messageUntil = world.legTime + 3;
      }
    } else {
      world.refuelTimer = 0;
    }
  }

  // Rollout: she slows on the water, brakes help, then the leg is done.
  // (stepFlight already moves her forward; this block only bleeds the speed off.)
  if (world.phase === 'rollout') {
    world.rollout += dt;
    flight.speed = Math.max(0, flight.speed - (flight.brake ? 22 : 8) * dt);
    if (flight.speed < 20 || world.rollout > 16) {
      finishLeg(world, events);
    }
  }

  // Out of fuel and still falling: the river or the forest ends it.
  if (flight.fuel <= 0 && !flight.onWater && flight.speed < 100 && flight.y < 300) {
    return crash(world, events, 'Out of fuel — she glided down short of the station.');
  }

  stepWater(world.water, dt);
  return events;
}

function awardFeat(world, feat, events) {
  if (!world.feats.has(feat)) {
    world.feats.add(feat);
    if (!events.feat) events.feat = feat;
  }
}

function finishLeg(world, events) {
  const leg = world.leg;
  world.score += SCORE.legComplete;
  world.legScore += SCORE.legComplete;
  const ringsTotal = world.rings.length;
  const allRings = ringsTotal > 0 && world.ringsHit === ringsTotal;
  if (allRings) awardFeat(world, FEATS.ALL_RINGS, events);
  if (world.flight.damage - world.legStartDamage <= 0) awardFeat(world, FEATS.SMOOTH_OPERATOR, events);
  if (leg.id === 4) awardFeat(world, FEATS.STORM_RIDER, events);
  if (leg.id === 5) awardFeat(world, FEATS.RIVER_RUNNER, events);
  if (leg.animals.length > 0 && world.animals.every((a) => a.photographed)) awardFeat(world, FEATS.SHUTTERBUG, events);
  world.legResults.push({
    name: leg.name,
    from: leg.from,
    to: leg.to,
    score: world.legScore,
    rings: `${world.ringsHit}/${ringsTotal}`,
    landing: world.landingQuality || '—',
    cargo: world.cargoResult || '—',
    photos: world.animals.length > 0 ? `${world.animals.filter((a) => a.photographed).length}/${world.animals.length}` : '—',
    status: 'Landed',
  });
  world.message = `LEG ${leg.id} COMPLETE — ${leg.name}  +${SCORE.legComplete}`;
  world.messageUntil = world.legTime + 3;
  world.phase = 'legDone';
  world.intermission = 3;
  events.legDone = true;
  if (world.legIndex + 1 >= LEGS.length) {
    awardFeat(world, FEATS.FULL_ROUTE, events);
    if (world.routePhotos >= world.routeAnimalTotal) awardFeat(world, FEATS.WILDLIFE_ACE, events);
  }
}

function crash(world, events, reason) {
  world.phase = 'crashed';
  world.crashReason = reason;
  world.message = reason;
  events.crashed = true;
  return events;
}

export { forestCeiling };
