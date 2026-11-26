// The water: spray off the floats, ripples where the plane taxis and where dolphins
// surface, and the splash of a crate that misses its dock. Particles live in world
// coordinates and the renderer projects them. Every particle is born from the world's
// seeded RNG, so the same run always makes the same spray — the screenshots stay
// byte-identical between runs.

/** A fresh particle store, fed by the world's seeded random. */
export function createWater(random) {
  return { random, spray: [], ripples: [] };
}

/** A burst of spray at (x, y, z), thrown backwards and outwards from the floats. */
export function burstSpray(water, x, y, z, count, speed) {
  const rnd = water.random;
  for (let i = 0; i < count; i += 1) {
    water.spray.push({
      x: x + (rnd() * 2 - 1) * 24,
      y,
      z: z - rnd() * 30,
      vx: (rnd() * 2 - 1) * 60,
      vy: 40 + rnd() * 90,
      vz: -(40 + rnd() * 80) - speed * 0.15,
      life: 0.5 + rnd() * 0.5,
      age: 0,
      size: 3 + rnd() * 5,
    });
  }
  if (water.spray.length > 140) water.spray.splice(0, water.spray.length - 140);
}

/** A steady spray trail while the floats plane on the water. */
export function trailSpray(water, x, y, z, speed) {
  const rnd = water.random;
  for (const side of [-1, 1]) {
    water.spray.push({
      x: x + side * 14,
      y,
      z: z - 20,
      vx: side * (30 + rnd() * 40),
      vy: 30 + rnd() * 60,
      vz: -(50 + rnd() * 60) - speed * 0.1,
      life: 0.4 + rnd() * 0.3,
      age: 0,
      size: 2 + rnd() * 4,
    });
  }
  if (water.spray.length > 140) water.spray.splice(0, water.spray.length - 140);
}

/** An expanding ripple ring on the water surface. */
export function addRipple(water, x, z, maxR) {
  water.ripples.push({ x, z, r: 6, maxR, alpha: 0.55 });
  if (water.ripples.length > 24) water.ripples.shift();
}

/** Advance spray and ripples one step. */
export function stepWater(water, dt) {
  for (let i = water.spray.length - 1; i >= 0; i -= 1) {
    const p = water.spray[i];
    p.age += dt;
    if (p.age >= p.life) {
      water.spray.splice(i, 1);
      continue;
    }
    p.vy -= 160 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y < 40) p.y = 40;
  }
  for (let i = water.ripples.length - 1; i >= 0; i -= 1) {
    const r = water.ripples[i];
    r.r += 260 * dt;
    r.alpha = Math.max(0, 0.55 * (1 - r.r / r.maxR));
    if (r.r >= r.maxR) water.ripples.splice(i, 1);
  }
}
