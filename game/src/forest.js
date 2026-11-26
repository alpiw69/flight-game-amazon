// The rainforest: what grows on both banks of the river. Trees are generated once per
// leg from the seeded RNG, so the same leg always grows the same forest. The canopy is
// layered — dark undergrowth at the bottom, mid canopy, emergent giants poking through,
// palms along the water — so the banks read as real forest, not a flat green wall.

import { CANOPY_Y, EMERGENT_Y, WATER_Y } from './config.js';
import { riverCenterX, riverHalf } from './river.js';
import { hash2 } from './random.js';

/** How many trees a leg grows (both banks). */
const TREE_COUNT = 1200;
/** How far from the river, in feet, the forest band runs. */
const FOREST_DEPTH = 5200;

/**
 * Grow a leg's forest: every tree is { x, z, h, type, shade, lean }.
 * type is canopy, emergent, palm or bush; shade is 0..1 for colour variation.
 */
export function forestLayout(leg, random) {
  const trees = [];
  for (let i = 0; i < TREE_COUNT; i += 1) {
    const z = random() * (leg.length + 4000) - 1000;
    const side = random() < 0.5 ? -1 : 1;
    const cx = riverCenterX(z);
    const half = riverHalf(z);
    // Most trees hug the banks; a few stand deeper in the forest.
    const depth = 80 + Math.pow(random(), 2.2) * FOREST_DEPTH;
    const x = cx + side * (half + depth);
    const roll = random();
    let type = 'canopy';
    let h = 85 + random() * 55;
    if (roll < 0.1) {
      type = 'emergent';
      h = 150 + random() * 70;
    } else if (roll < 0.28) {
      type = 'palm';
      h = 55 + random() * 25;
    } else if (roll > 0.93) {
      type = 'bush';
      h = 18 + random() * 14;
    }
    trees.push({ x, z, h, type, shade: random(), lean: (random() - 0.5) * 0.16 });
  }
  // Emergent groves: a few clusters of giants that break the canopy line.
  for (let i = 0; i < 14; i += 1) {
    const z = random() * leg.length;
    const side = random() < 0.5 ? -1 : 1;
    const cx = riverCenterX(z);
    const half = riverHalf(z);
    const bx = cx + side * (half + 400 + random() * 1200);
    for (let j = 0; j < 4; j += 1) {
      trees.push({
        x: bx + (random() - 0.5) * 300,
        z: z + (random() - 0.5) * 300,
        h: 170 + random() * 60,
        type: 'emergent',
        shade: random(),
        lean: (random() - 0.5) * 0.1,
      });
    }
  }
  return trees;
}

/** Sand bars in the river for this leg, in world coordinates. */
export function sandBarLayout(leg) {
  return leg.sandBars.map((bar) => {
    const z = bar.dz * leg.length;
    return { x: riverCenterX(z) + bar.off, z, r: bar.r };
  });
}

/**
 * Canopy height in feet at (x, z): smooth value noise over 600 ft cells, so the forest
 * top is a rolling line, not a flat ceiling. Used for the crash line over the forest.
 */
export function canopyHeightAt(x, z) {
  const cell = 600;
  const fx = x / cell;
  const fz = z / cell;
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = smooth(fx - ix);
  const tz = smooth(fz - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  const n = lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
  return WATER_Y + 110 + n * 90;
}

/** The tallest the canopy gets anywhere (emergent crowns): the crash ceiling over forest. */
export function forestCeiling() {
  return WATER_Y + EMERGENT_Y;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export { CANOPY_Y };
