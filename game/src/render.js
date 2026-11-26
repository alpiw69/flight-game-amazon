// The renderer: every pixel of AMAZON RIVER RUN. A hand-rolled chase view — sky, a
// winding river, rainforest banks, stilt villages, a vector-drawn modern amphibious
// seaplane that banks visibly when it turns, and a clean glass-cockpit HUD — plus the
// title, pause, river-log and game-over screens.

import { CANOPY_Y, EMERGENT_Y, FIELD, FONT, FOCAL, HORIZON_Y, LIVERY, SKIES, WATER_Y } from './config.js';
import { riverCenterX, riverHalf } from './river.js';
import { canopyHeightAt } from './forest.js';
import { animalY, frameAnimal, photoTarget } from './photo.js';
import { createCamera, project, skyBodyPosition, updateCamera } from './project.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_RESULTS = 4;

const W = FIELD.width;
const H = FIELD.height;

/** Feet before the leg end where the buoyed water runway begins. */
const LANDING_ZONE_START = 2200;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = createCamera();
  let snapped = false;

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || W;
    const ch = canvas.clientHeight || H;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }

  /** Put the camera straight behind the plane (used before a screenshot paint). */
  function snapCamera(world) {
    const f = world.flight;
    camera.x = f.x - Math.sin(f.heading) * 800;
    camera.z = f.z - Math.cos(f.heading) * 800;
    camera.y = f.y + 160;
    camera.heading = f.heading;
    camera.shake = 0;
    snapped = true;
  }

  function draw(world, screen, best, dt) {
    fit();
    CTX = ctx;
    CAMERA = camera;
    if (!snapped) { snapCamera(world); snapped = true; }
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      updateCamera(camera, world.flight, dt, 800, 160);
    }
    drawSky(world);
    drawRiver(world);
    drawSandBars(world);
    drawVillages(world);
    drawFuelDock(world);
    drawTrees(world);
    drawVillageLabels(world);
    drawClouds(world);
    drawSun(world);
    drawAnimals(world);
    drawDropTarget(world);
    drawCrate(world);
    drawRings(world);
    drawBuoys(world);
    drawPlaneShadow(world);
    drawPlane(world);
    drawSpray(world);
    drawWeather(world);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(world, best);
    if (screen === SCREEN_TITLE) drawTitle(world, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawGameOver(world, best);
    else if (screen === SCREEN_RESULTS) drawRiverLog(world, best);
  }

  return { draw, snapCamera };
}

// ---------- helpers ----------

let CTX = null;
let CAMERA = null;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5,16,12,0.88)';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,225,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function outlineText(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(4,12,9,0.75)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Deterministic 0..1 hash of one integer. */
function hash(n) {
  let h = (Math.imul(n | 0, 374761393) + 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}

/** Parse a #rrggbb or rgb(r,g,b) colour into [r, g, b]. */
function parseColor(c) {
  if (c[0] === '#') {
    const n = Number.parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

/** Lighten (f > 0) or darken (f < 0) a colour by a fraction. */
function shade(hex, f) {
  const [r, g, b] = parseColor(hex);
  const t = f < 0 ? 0 : 255;
  const p = Math.abs(f);
  return `rgb(${Math.round(r + (t - r) * p)},${Math.round(g + (t - g) * p)},${Math.round(b + (t - b) * p)})`;
}

/** Mix two colours: t = 0 gives hex1, t = 1 gives hex2. */
function mix(hex1, hex2, t) {
  const [r1, g1, b1] = parseColor(hex1);
  const [r2, g2, b2] = parseColor(hex2);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

/** How dark the world is drawn: 0 by day, up to 0.55 at night. */
function toneFor(skyName) {
  return SKIES[skyName].night ? 0.55 : 0;
}

/** A ground quad between two projected points on the near and far bank lines. */
function groundQuad(p1, p2, p3, p4, fill) {
  if (!p1 || !p2 || !p3 || !p4) return;
  const ctx = CTX;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.closePath();
  ctx.fill();
}

// ---------- sky ----------

function drawSky(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 60);
  g.addColorStop(0, sky.top);
  g.addColorStop(0.55, sky.mid);
  g.addColorStop(1, sky.low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON_Y + 60);
  // The far treeline: a dark wavy silhouette where the forest meets the sky, so the
  // horizon is never an empty line.
  ctx.fillStyle = mix(sky.forestTop, sky.low, 0.12);
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 8);
  for (let x = 0; x <= W; x += 16) {
    const wobble = Math.sin(x * 0.021 + world.leg.id * 3.1) * 7 + Math.sin(x * 0.047 + 1.3) * 4;
    ctx.lineTo(x, HORIZON_Y + 4 + wobble);
  }
  ctx.lineTo(W, HORIZON_Y + 60);
  ctx.lineTo(0, HORIZON_Y + 60);
  ctx.closePath();
  ctx.fill();
}

function drawSun(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const pos = skyBodyPosition(sky);
  const glow = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, 70);
  glow.addColorStop(0, sky.sun);
  glow.addColorStop(0.25, sky.sun);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, sky.night ? 14 : 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  for (const cloud of world.clouds) {
    const p = project(CAMERA, cloud.x, cloud.y, cloud.z);
    if (!p || p.depth > 26000) continue;
    const r = cloud.scale * p.scale;
    if (r < 6) continue;
    const alpha = Math.max(0.08, 0.5 - p.depth / 52000);
    ctx.fillStyle = cloud.shade > 0.5 ? sky.cloud : sky.cloudShadow;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - r * 0.5, p.y + r * 0.1, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.55, p.y + r * 0.08, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------- river and banks ----------

function drawRiver(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const cam = CAMERA;
  const zFar = cam.z + 24000;
  const zNear = Math.max(cam.z + 150, world.flight.z - 1200);
  const step = 600;
  // Painter's order: far slices first, so nearer water overlaps them.
  for (let z = zFar; z > zNear; z -= step) {
    const z0 = z;
    const z1 = z - step;
    const c0 = riverCenterX(z0);
    const c1 = riverCenterX(z1);
    const h0 = riverHalf(z0);
    const h1 = riverHalf(z1);
    const depth = Math.min(1, (z0 - cam.z) / 24000);
    const water = mix(sky.waterTop, sky.waterBottom, 0.25 + depth * 0.45);
    const forest = mix(sky.forestTop, sky.forestBottom, 0.2 + depth * 0.5);
    const floor = mix(forest, sky.low, depth * 0.35);
    // Water band.
    groundQuad(
      project(cam, c0 - h0, WATER_Y, z0), project(cam, c0 + h0, WATER_Y, z0),
      project(cam, c1 + h1, WATER_Y, z1), project(cam, c1 - h1, WATER_Y, z1),
      water,
    );
    // Forest floor on both banks, out to 3200 ft from the water.
    groundQuad(
      project(cam, c0 - h0, WATER_Y, z0), project(cam, c0 - h0 - 3200, WATER_Y, z0),
      project(cam, c1 - h1 - 3200, WATER_Y, z1), project(cam, c1 - h1, WATER_Y, z1),
      floor,
    );
    groundQuad(
      project(cam, c0 + h0, WATER_Y, z0), project(cam, c0 + h0 + 3200, WATER_Y, z0),
      project(cam, c1 + h1 + 3200, WATER_Y, z1), project(cam, c1 + h1, WATER_Y, z1),
      floor,
    );
    // A faint current streak down the middle of the river, every third slice.
    if (Math.round(z / step) % 3 === 0) {
      const w = mix(sky.waterTop, '#ffffff', 0.1);
      groundQuad(
        project(cam, c0 - 45, WATER_Y + 1, z0), project(cam, c0 + 45, WATER_Y + 1, z0),
        project(cam, c1 + 45, WATER_Y + 1, z1), project(cam, c1 - 45, WATER_Y + 1, z1),
        w,
      );
    }
  }
  // Sun glitter on the water: a soft bright band under the sun.
  const sunPos = skyBodyPosition(sky);
  const glitter = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  glitter.addColorStop(0, 'rgba(255,255,255,0)');
  glitter.addColorStop(1, 'rgba(255,255,255,0.10)');
  ctx.fillStyle = glitter;
  ctx.fillRect(sunPos.x - 130, HORIZON_Y, 260, H - HORIZON_Y);
}

function drawSandBars(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  for (const bar of world.sandBars) {
    const p = project(CAMERA, bar.x, WATER_Y + 8, bar.z);
    if (!p || p.depth > 24000) continue;
    const rx = bar.r * p.scale;
    const ry = rx * 0.32;
    if (rx < 2) continue;
    ctx.fillStyle = mix('#d9c48f', sky.low, Math.min(0.5, p.depth / 30000));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,110,70,0.5)';
    ctx.beginPath();
    ctx.ellipse(p.x - rx * 0.3, p.y - ry * 0.3, rx * 0.3, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- villages, docks and the research station ----------

function drawVillages(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const night = sky.night;
  for (const village of world.villages) {
    for (let i = 0; i < village.houses; i += 1) {
      const hx = village.houseX + (hash(village.z * 7 + i * 13) - 0.5) * 700;
      const hz = village.z + (hash(village.z * 3 + i * 29) - 0.5) * 900;
      const base = project(CAMERA, hx, WATER_Y, hz);
      if (!base || base.depth > 24000) continue;
      const s = base.scale;
      const w = 150 * s;
      const h = 110 * s;
      if (w < 4) continue;
      const tone = toneFor(world.leg.sky);
      // Stilts down into the water.
      ctx.strokeStyle = shade('#5a4028', -tone * 0.4);
      ctx.lineWidth = Math.max(1, 5 * s);
      for (const dx of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(base.x + dx * w, base.y);
        ctx.lineTo(base.x + dx * w, base.y - h * 0.4);
        ctx.stroke();
      }
      // House box: warm wood with plank lines.
      ctx.fillStyle = shade('#8a6a44', -tone * 0.4);
      ctx.fillRect(base.x - w / 2, base.y - h * 0.4 - h * 0.6, w, h * 0.6);
      ctx.strokeStyle = 'rgba(60,40,20,0.5)';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k += 1) {
        ctx.beginPath();
        ctx.moveTo(base.x - w / 2, base.y - h * 0.4 - (h * 0.6 * k) / 4);
        ctx.lineTo(base.x + w / 2, base.y - h * 0.4 - (h * 0.6 * k) / 4);
        ctx.stroke();
      }
      // Pitched roof.
      ctx.fillStyle = shade('#7a3b2e', -tone * 0.4);
      ctx.beginPath();
      ctx.moveTo(base.x - w * 0.62, base.y - h * 0.4 - h * 0.6);
      ctx.lineTo(base.x, base.y - h * 0.4 - h * 1.05);
      ctx.lineTo(base.x + w * 0.62, base.y - h * 0.4 - h * 0.6);
      ctx.closePath();
      ctx.fill();
      // Warm window at dusk and night.
      if (night || world.leg.sky === 'dusk' || world.leg.sky === 'golden') {
        ctx.fillStyle = '#ffd98a';
        ctx.fillRect(base.x - w * 0.2, base.y - h * 0.4 - h * 0.45, w * 0.16, h * 0.22);
        ctx.fillRect(base.x + w * 0.08, base.y - h * 0.4 - h * 0.45, w * 0.16, h * 0.22);
      }
    }
    // The dock: planks out over the water, with a canoe tied up.
    const dock = project(CAMERA, village.dockX, WATER_Y, village.z);
    if (dock && dock.depth < 24000) {
      const s = dock.scale;
      const w = 260 * s;
      const d = 90 * s;
      ctx.fillStyle = shade('#6b4e30', -toneFor(world.leg.sky) * 0.4);
      ctx.fillRect(dock.x - w / 2, dock.y - d, w, d);
      ctx.fillStyle = shade('#3f6b4a', -toneFor(world.leg.sky) * 0.4);
      ctx.beginPath();
      ctx.ellipse(dock.x + w * 0.42, dock.y + d * 0.5, w * 0.22, d * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      // Crates waiting on the dock.
      ctx.fillStyle = '#a8845a';
      ctx.fillRect(dock.x - w * 0.32, dock.y - d - 26 * s, 22 * s, 22 * s);
      ctx.fillRect(dock.x - w * 0.32 + 24 * s, dock.y - d - 20 * s, 18 * s, 16 * s);
    }
  }
}

/** Village names, drawn after the trees so a crown never hides the name. */
function drawVillageLabels(world) {
  const ctx = CTX;
  for (const village of world.villages) {
    const label = project(CAMERA, village.houseX, WATER_Y + 260, village.z);
    if (label && label.depth < 12000 && label.depth > 400) {
      outlineText(ctx, village.name.toUpperCase(), label.x, label.y, 15, '#eef3ea', 'center', 700);
    }
  }
}

function drawFuelDock(world) {
  const ctx = CTX;
  const dock = world.fuelDock;
  if (!dock) return;
  const sky = SKIES[world.leg.sky];
  const p = project(CAMERA, dock.x, WATER_Y, dock.z);
  if (!p || p.depth > 24000) return;
  const s = p.scale;
  const w = 420 * s;
  const d = 150 * s;
  if (w < 6) return;
  const tone = toneFor(world.leg.sky);
  // Floating platform.
  ctx.fillStyle = shade('#3a4a52', -tone * 0.3);
  ctx.fillRect(p.x - w / 2, p.y - d, w, d);
  ctx.fillStyle = shade('#f2b23e', -tone * 0.2);
  ctx.fillRect(p.x - w / 2, p.y - d, w, Math.max(2, 8 * s));
  // Fuel drums.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i === 1 ? '#c0392b' : '#dfe6ea';
    ctx.fillRect(p.x - w * 0.32 + i * 46 * s, p.y - d - 44 * s, 34 * s, 44 * s);
  }
  // Windsock.
  ctx.strokeStyle = '#e8e2d2';
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.beginPath();
  ctx.moveTo(p.x + w * 0.36, p.y - d);
  ctx.lineTo(p.x + w * 0.36, p.y - d - 110 * s);
  ctx.stroke();
  ctx.fillStyle = '#e86a2a';
  ctx.beginPath();
  ctx.moveTo(p.x + w * 0.36, p.y - d - 110 * s);
  ctx.lineTo(p.x + w * 0.36 + 64 * s, p.y - d - 96 * s);
  ctx.lineTo(p.x + w * 0.36, p.y - d - 82 * s);
  ctx.closePath();
  ctx.fill();
  // FUEL sign.
  ctx.fillStyle = '#f7f3e8';
  ctx.fillRect(p.x - w * 0.12, p.y - d - 78 * s, 120 * s, 40 * s);
  text(ctx, 'FUEL', p.x - w * 0.12 + 60 * s, p.y - d - 50 * s, Math.max(10, 26 * s), '#1c2733', 'center', 800);
  if (sky.night) {
    ctx.fillStyle = 'rgba(255,217,138,0.9)';
    ctx.beginPath();
    ctx.arc(p.x + w * 0.36, p.y - d - 118 * s, Math.max(3, 10 * s), 0, Math.PI * 2);
    ctx.fill();
  }
  const label = project(CAMERA, dock.x, WATER_Y + 300, dock.z);
  if (label && label.depth < 12000 && label.depth > 400) {
    outlineText(ctx, world.leg.id === 5 ? 'FLOATING FUEL STATION' : 'FUEL DOCK', label.x, label.y, 15, '#eef3ea', 'center', 700);
  }
}

// ---------- the rainforest ----------

function drawTrees(world) {
  const ctx = CTX;
  const cam = CAMERA;
  const sky = SKIES[world.leg.sky];
  const tone = toneFor(world.leg.sky);
  const visible = [];
  for (const tree of world.forest) {
    if (tree.z < cam.z + 80 || tree.z > cam.z + 22000) continue;
    if (Math.abs(tree.x - cam.x) > 9500) continue;
    visible.push(tree);
  }
  // Painter's order: far trees first.
  visible.sort((a, b) => b.z - a.z);
  const cap = Math.min(visible.length, 520);
  for (let i = 0; i < cap; i += 1) {
    const tree = visible[i];
    const base = project(cam, tree.x, WATER_Y, tree.z);
    if (!base) continue;
    const top = project(cam, tree.x + tree.lean * tree.h, WATER_Y + tree.h, tree.z);
    if (!top) continue;
    const hPx = base.y - top.y;
    if (hPx < 2.5) continue;
    const s = base.scale;
    const cx = base.x;
    const by = base.y;
    if (tree.type === 'palm') {
      // Thin curved trunk, fronds fanning out of the crown and drooping at the tips.
      ctx.strokeStyle = shade('#6b4e30', -tone * 0.3);
      ctx.lineWidth = Math.max(1, 3.5 * s);
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.quadraticCurveTo(cx + tree.lean * hPx * 0.5, by - hPx * 0.55, top.x, top.y);
      ctx.stroke();
      ctx.strokeStyle = shade(mix('#2f7a3d', '#57a05a', tree.shade), -tone * 0.3);
      ctx.lineWidth = Math.max(1, 2.2 * s);
      for (let k = 0; k < 7; k += 1) {
        // Fronds only in the upper half, fanning from left to right.
        const a = -Math.PI * (0.12 + 0.76 * (k / 6));
        const fx = top.x + Math.cos(a) * hPx * 0.46;
        const fy = top.y + Math.sin(a) * hPx * 0.2 + hPx * 0.16;
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.quadraticCurveTo(top.x + Math.cos(a) * hPx * 0.3, top.y - hPx * 0.16, fx, fy);
        ctx.stroke();
      }
      continue;
    }
    if (tree.type === 'bush') {
      ctx.fillStyle = shade(mix('#1e4d2a', '#2f6b33', tree.shade), -tone * 0.3);
      ctx.beginPath();
      ctx.ellipse(cx, by - hPx * 0.4, hPx * 0.55, hPx * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade('#3f8f4f', -tone * 0.3);
      ctx.beginPath();
      ctx.ellipse(cx - hPx * 0.12, by - hPx * 0.55, hPx * 0.32, hPx * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Trunk, mostly hidden behind the crown.
    ctx.strokeStyle = shade('#4a3421', -tone * 0.3);
    ctx.lineWidth = Math.max(1, tree.h * 0.045 * s);
    ctx.beginPath();
    ctx.moveTo(cx, by);
    ctx.lineTo(top.x, top.y + hPx * 0.42);
    ctx.stroke();
    if (tree.type === 'emergent') {
      // Tall trunk, wide flat umbrella crown above the canopy.
      const cw = hPx * 1.25;
      ctx.fillStyle = shade(mix('#1d4d2b', '#2a6b3a', tree.shade), -tone * 0.3);
      ctx.beginPath();
      ctx.ellipse(top.x, top.y + hPx * 0.06, cw * 0.5, hPx * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(mix('#3f8f4f', '#6fae5f', tree.shade), -tone * 0.3);
      ctx.beginPath();
      ctx.ellipse(top.x - cw * 0.08, top.y - hPx * 0.02, cw * 0.36, hPx * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Canopy tree: a wide, flat, irregular crown — overlapping ellipses spread
    // sideways, not stacked — so the crown reads as a tree top, not a round ball.
    // A dark under-crown shadow grounds it.
    const cw = hPx * 1.2;
    const crownY = top.y + hPx * 0.18;
    ctx.fillStyle = shade(mix('#163d1e', '#1e4d2a', tree.shade), -tone * 0.3);
    ctx.beginPath();
    ctx.ellipse(top.x, crownY + hPx * 0.14, cw * 0.5, hPx * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(mix('#2f6b33', '#3f8f4f', tree.shade), -tone * 0.3);
    ctx.beginPath();
    ctx.ellipse(top.x, crownY, cw * 0.5, hPx * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(mix('#2f6b33', '#3f8f4f', (tree.shade + 0.35) % 1), -tone * 0.3);
    ctx.beginPath();
    ctx.ellipse(top.x - cw * 0.32, crownY + hPx * 0.05, cw * 0.26, hPx * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(top.x + cw * 0.3, crownY + hPx * 0.06, cw * 0.24, hPx * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade(mix('#57a05a', '#8fbf6a', tree.shade), -tone * 0.3);
    ctx.beginPath();
    ctx.ellipse(top.x - cw * 0.1, crownY - hPx * 0.1, cw * 0.28, hPx * 0.13, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- animals ----------

function drawAnimals(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  for (const animal of world.animals) {
    const y = animal.y + animalY(animal, world.time);
    const p = project(CAMERA, animal.x, y, animal.z);
    if (!p || p.depth > 12000) continue;
    const s = p.scale;
    if (animal.kind === 'dolphin') {
      // Pink back arcing out of the water, with a ripple ring around it.
      const arc = Math.max(0, Math.sin(world.time * 1.1 + animal.phase));
      const h = (8 + arc * 18) * s;
      const w = 34 * s;
      if (w < 2) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 2, w * 1.6, h * 0.5 + 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e89bb0';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - h * 0.4, w * 0.5, h * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#d67f96';
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.1, p.y - h * 0.7);
      ctx.lineTo(p.x + w * 0.08, p.y - h * 1.25);
      ctx.lineTo(p.x + w * 0.22, p.y - h * 0.7);
      ctx.closePath();
      ctx.fill();
      if (animal.photographed) {
        ctx.fillStyle = '#ffd94a';
        text(ctx, '✓', p.x + w * 0.8, p.y - h, Math.max(12, 20 * s), '#ffd94a', 'center', 800);
      }
      continue;
    }
    if (animal.kind === 'jaguar') {
      const w = 46 * s;
      const h = 20 * s;
      if (w < 3) continue;
      ctx.fillStyle = '#c8933f';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - h * 0.5, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x + w * 0.42, p.y - h * 0.75, w * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a18';
      for (let k = 0; k < 7; k += 1) {
        ctx.beginPath();
        ctx.arc(p.x - w * 0.3 + k * w * 0.1, p.y - h * 0.55 + (k % 2) * h * 0.2, Math.max(1, 2.2 * s), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#c8933f';
      ctx.lineWidth = Math.max(1, 4 * s);
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.48, p.y - h * 0.4);
      ctx.quadraticCurveTo(p.x - w * 0.7, p.y - h * 0.1, p.x - w * 0.62, p.y + h * 0.3);
      ctx.stroke();
      if (animal.photographed) {
        text(ctx, '✓', p.x + w * 0.7, p.y - h, Math.max(12, 20 * s), '#ffd94a', 'center', 800);
      }
      continue;
    }
    if (animal.kind === 'macaw') {
      const flap = Math.sin(world.time * 6 + animal.phase) * 0.5;
      for (const off of [-70, 0, 80]) {
        const bx = p.x + off * s;
        const by = p.y + Math.sin(world.time * 2 + off) * 8 * s;
        const w = 26 * s;
        if (w < 2) continue;
        ctx.fillStyle = '#d23b2e';
        ctx.beginPath();
        ctx.ellipse(bx, by, w * 0.5, w * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a5fb0';
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-0.5 - flap * 0.4);
        ctx.beginPath();
        ctx.ellipse(-w * 0.3, -w * 0.2, w * 0.42, w * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(0.5 + flap * 0.4);
        ctx.beginPath();
        ctx.ellipse(w * 0.3, -w * 0.2, w * 0.42, w * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (animal.photographed) {
        text(ctx, '✓', p.x, p.y - 40 * s, Math.max(12, 20 * s), '#ffd94a', 'center', 800);
      }
      continue;
    }
  }
}

// ---------- rings, drops, crate, shadow ----------

function drawRings(world) {
  const ctx = CTX;
  const next = world.rings.find((r) => !r.done);
  for (const ring of world.rings) {
    if (ring.done) continue;
    const p = project(CAMERA, ring.x, ring.y, ring.z);
    if (!p || p.depth > 26000) continue;
    const r = ring.r * p.scale;
    if (r < 3) continue;
    const isNext = ring === next;
    const alpha = isNext ? 0.95 : Math.max(0.25, 0.7 - p.depth / 30000);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = isNext ? '#ffd94a' : '#f2b23e';
    ctx.lineWidth = Math.max(2, 7 * p.scale + 1.5);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(1, 2 * p.scale + 0.8);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.86, r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (isNext && p.depth < 14000) {
      outlineText(ctx, `${Math.round(p.depth)} ft`, p.x, p.y - r - 12, 15, '#ffe9a8', 'center', 700);
    }
  }
}

function drawDropTarget(world) {
  const ctx = CTX;
  const drop = world.drops.find((d) => !d.dropped);
  if (!drop) return;
  const p = project(CAMERA, drop.x, WATER_Y + 6, drop.z);
  if (!p || p.depth > 20000) return;
  const r = drop.r * p.scale;
  if (r < 3) return;
  ctx.strokeStyle = '#ff7a3c';
  ctx.lineWidth = Math.max(2, 5 * p.scale + 1);
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Smoke column over the dock so it reads from far away.
  for (let k = 0; k < 4; k += 1) {
    const sy = p.y - (20 + k * 26) * p.scale - ((world.time * 12 + k * 30) % 90) * p.scale * 0.4;
    ctx.fillStyle = `rgba(240,240,240,${0.5 - k * 0.1})`;
    ctx.beginPath();
    ctx.arc(p.x + Math.sin(world.time + k) * 8 * p.scale, sy, (10 + k * 5) * p.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.depth < 12000) {
    outlineText(ctx, `DROP — ${drop.village.toUpperCase()}`, p.x, p.y - r * 0.4 - 26, 15, '#ffb08a', 'center', 700);
  }
}

function drawCrate(world) {
  const ctx = CTX;
  const crate = world.crate;
  if (!crate || crate.landed) return;
  const p = project(CAMERA, crate.x, crate.y, crate.z);
  if (!p || p.depth > 20000) return;
  const s = p.scale;
  const w = 26 * s;
  if (w < 2) return;
  // Little orange parachute.
  ctx.fillStyle = '#ff7a3c';
  ctx.beginPath();
  ctx.arc(p.x, p.y - w * 1.1, w * 0.9, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,40,20,0.8)';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(p.x - w * 0.85, p.y - w * 1.1);
  ctx.lineTo(p.x - w * 0.4, p.y - w * 0.3);
  ctx.moveTo(p.x + w * 0.85, p.y - w * 1.1);
  ctx.lineTo(p.x + w * 0.4, p.y - w * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#a8845a';
  ctx.fillRect(p.x - w * 0.5, p.y - w * 0.3, w, w * 0.8);
  ctx.strokeStyle = '#5a4028';
  ctx.strokeRect(p.x - w * 0.5, p.y - w * 0.3, w, w * 0.8);
}

function drawBuoys(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const leg = world.leg;
  // The water runway: a lane of lit buoys down the last stretch of the river, so the
  // landing reads from far away — brightest at night.
  for (let z = leg.length - LANDING_ZONE_START; z <= leg.length + 400; z += 400) {
    const cx = riverCenterX(z);
    for (const side of [-1, 1]) {
      const p = project(CAMERA, cx + side * 260, WATER_Y, z);
      if (!p || p.depth > 20000) continue;
      const r = Math.max(2, 14 * p.scale);
      ctx.fillStyle = '#ff7a3c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7f3e8';
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 0.4, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      if (sky.night) {
        ctx.fillStyle = 'rgba(255,217,138,0.95)';
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 1.1, Math.max(1.5, r * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPlaneShadow(world) {
  const ctx = CTX;
  const f = world.flight;
  if (f.onWater || f.y > 900) return;
  const p = project(CAMERA, f.x, WATER_Y, f.z);
  if (!p) return;
  const alt = f.y - WATER_Y;
  const rx = (90 + alt * 0.12) * p.scale;
  const alpha = Math.max(0.04, 0.3 - alt / 3000);
  ctx.fillStyle = `rgba(4,10,8,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, rx * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- the seaplane ----------

function drawPlane(world) {
  const ctx = CTX;
  const f = world.flight;
  const cx = W / 2;
  const cy = 560;
  const speedK = Math.min(1, Math.max(0, f.speed / 220));
  const size = 0.95 + speedK * 0.05;
  const strobe = (world.time % 1.2) < 0.12;

  ctx.save();
  ctx.translate(cx, cy);
  // The bank is amplified (x1.25) so a turn reads clearly: the old jet never looked
  // like it was banking. Pitch tilts her nose a touch.
  ctx.rotate((f.roll * 1.25 * Math.PI) / 180);
  ctx.rotate((-f.pitch * 0.3 * Math.PI) / 180);
  ctx.scale(size, size);

  // Prop wash: soft trails off the wingtips, never hard lines.
  for (const side of [-1, 1]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(side * 168, -18);
    ctx.quadraticCurveTo(side * 200, 10, side * 216, 52);
    ctx.stroke();
  }

  // High wing: straight, clean, metallic top, darker trailing edge.
  for (const side of [-1, 1]) {
    const wing = ctx.createLinearGradient(0, -58, 0, 8);
    wing.addColorStop(0, '#f2f6f9');
    wing.addColorStop(1, '#aebdc9');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(side * 10, -52);
    ctx.lineTo(side * 168, -34);
    ctx.lineTo(side * 168, -6);
    ctx.lineTo(side * 12, -8);
    ctx.closePath();
    ctx.fill();
    // Wingtip: teal cap with the nav light.
    ctx.fillStyle = '#0e7d6b';
    ctx.beginPath();
    ctx.moveTo(side * 160, -35);
    ctx.lineTo(side * 168, -34);
    ctx.lineTo(side * 168, -6);
    ctx.lineTo(side * 160, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = side < 0 ? '#ff3b30' : '#34e07a';
    ctx.beginPath();
    ctx.arc(side * 168, -20, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Flaps, extended on approach.
    if (f.flaps) {
      ctx.fillStyle = '#8fa3b3';
      ctx.fillRect(side > 0 ? 20 : -72, -8, 52, 9);
    }
  }

  // Engines on the wings, with spinning props.
  for (const side of [-1, 1]) {
    ctx.fillStyle = LIVERY.engine;
    ctx.beginPath();
    ctx.ellipse(side * 78, -30, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = LIVERY.engineIntake;
    ctx.beginPath();
    ctx.ellipse(side * 78, -30, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    const spin = world.time * 42 + (side > 0 ? 1.1 : 0);
    ctx.save();
    ctx.translate(side * 78, -30);
    ctx.rotate(spin);
    ctx.fillStyle = 'rgba(220,230,236,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(200,215,225,0.18)';
    ctx.beginPath();
    ctx.ellipse(side * 78, -30, 30, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Floats: twin slender floats on struts below the fuselage.
  const floatY = f.floats ? 0 : -14;
  for (const side of [-1, 1]) {
    ctx.strokeStyle = '#7d94a3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(side * 12, 78);
    ctx.lineTo(side * 30, 108 + floatY);
    ctx.moveTo(side * 12, 96);
    ctx.lineTo(side * 30, 118 + floatY);
    ctx.stroke();
    const fl = ctx.createLinearGradient(0, 100 + floatY, 0, 132 + floatY);
    fl.addColorStop(0, LIVERY.floatTop);
    fl.addColorStop(1, LIVERY.floatBelly);
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.moveTo(side * 30 - 7, 104 + floatY);
    ctx.quadraticCurveTo(side * 30, 98 + floatY, side * 30 + 7, 104 + floatY);
    ctx.lineTo(side * 30 + 7, 126 + floatY);
    ctx.quadraticCurveTo(side * 30, 134 + floatY, side * 30 - 7, 126 + floatY);
    ctx.closePath();
    ctx.fill();
    // The step on each float.
    ctx.fillStyle = '#5a7080';
    ctx.fillRect(side * 30 - 7, 116 + floatY, 14, 3);
  }

  // Fuselage: a long clean tapered body, bright on top, darker underneath.
  const body = ctx.createLinearGradient(0, -118, 0, 100);
  body.addColorStop(0, LIVERY.fuselageTop);
  body.addColorStop(0.55, LIVERY.fuselageMid);
  body.addColorStop(1, LIVERY.fuselageBelly);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.bezierCurveTo(9, -110, 14, -88, 16, -52);
  ctx.bezierCurveTo(18, -10, 18, 40, 15, 78);
  ctx.bezierCurveTo(13, 94, 7, 100, 0, 100);
  ctx.bezierCurveTo(-7, 100, -13, 94, -15, 78);
  ctx.bezierCurveTo(-18, 40, -18, -10, -16, -52);
  ctx.bezierCurveTo(-14, -88, -9, -110, 0, -118);
  ctx.fill();

  // Cheatline: teal stripe with a gold pinstripe, nose to tail.
  ctx.strokeStyle = LIVERY.cheatline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-15, -58);
  ctx.quadraticCurveTo(-17, 10, -14, 72);
  ctx.moveTo(15, -58);
  ctx.quadraticCurveTo(17, 10, 14, 72);
  ctx.stroke();
  ctx.strokeStyle = LIVERY.cheatlineGold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-15, -52);
  ctx.quadraticCurveTo(-17, 10, -14, 68);
  ctx.moveTo(15, -52);
  ctx.quadraticCurveTo(17, 10, 14, 68);
  ctx.stroke();

  // Glass cockpit at the nose, passenger windows along the sides.
  ctx.fillStyle = LIVERY.window;
  ctx.beginPath();
  ctx.moveTo(-8, -102);
  ctx.quadraticCurveTo(0, -108, 8, -102);
  ctx.lineTo(6, -92);
  ctx.quadraticCurveTo(0, -95, -6, -92);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const y = -62 + i * 13;
    ctx.fillRect(-14.5, y, 3.4, 5);
    ctx.fillRect(11.1, y, 3.4, 5);
  }

  // Tail fin, liveried, with the gold sun mark and registration.
  const fin = ctx.createLinearGradient(0, 60, 0, 132);
  fin.addColorStop(0, '#17806e');
  fin.addColorStop(1, LIVERY.tail);
  ctx.fillStyle = fin;
  ctx.beginPath();
  ctx.moveTo(-13, 88);
  ctx.lineTo(13, 88);
  ctx.lineTo(10, 128);
  ctx.lineTo(-10, 128);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = LIVERY.tailMark;
  ctx.beginPath();
  ctx.arc(0, 106, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eef3ea';
  ctx.font = '700 8px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('PK-ARR', 0, 122);
  // Horizontal stabiliser across the tail.
  ctx.fillStyle = '#c3d0da';
  ctx.beginPath();
  ctx.moveTo(-10, 96);
  ctx.lineTo(-72, 112);
  ctx.lineTo(-72, 122);
  ctx.lineTo(-10, 112);
  ctx.lineTo(10, 112);
  ctx.lineTo(72, 122);
  ctx.lineTo(72, 112);
  ctx.lineTo(10, 96);
  ctx.closePath();
  ctx.fill();
  // Tail strobe.
  if (strobe) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 132, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- spray, ripples, weather ----------

function drawSpray(world) {
  const ctx = CTX;
  for (const p of world.water.spray) {
    const sp = project(CAMERA, p.x, p.y, p.z);
    if (!sp) continue;
    const a = Math.max(0, (1 - p.age / p.life) * 0.65);
    const r = Math.max(1, p.size * sp.scale * 0.5);
    ctx.fillStyle = `rgba(240,248,250,${a})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of world.water.ripples) {
    const p = project(CAMERA, r.x, WATER_Y, r.z);
    if (!p) continue;
    const rx = r.r * p.scale;
    if (rx < 2) continue;
    ctx.strokeStyle = `rgba(235,245,248,${r.alpha})`;
    ctx.lineWidth = Math.max(1, 2.5 * p.scale + 0.8);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, rx * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWeather(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const weather = world.leg.weather;
  // Rain: streaks that fall with the world clock, so the same frame always rains the same.
  if (weather.rain > 0) {
    const count = weather.rain * 70;
    ctx.strokeStyle = 'rgba(207,224,234,0.28)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      const x = hash(i * 7 + 1) * W;
      const y = (hash(i * 13 + 5) * H + world.time * 760) % H;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 9, y + 30);
    }
    ctx.stroke();
  }
  // Fog and mist: a haze that thickens toward the horizon.
  if (weather.fog > 0) {
    const haze = ctx.createLinearGradient(0, HORIZON_Y - 40, 0, H);
    haze.addColorStop(0, sky.haze.replace(/[\d.]+\)$/, `${0.1 + weather.fog * 0.35})`));
    haze.addColorStop(1, sky.haze.replace(/[\d.]+\)$/, `${weather.fog * 0.16})`));
    ctx.fillStyle = haze;
    ctx.fillRect(0, HORIZON_Y - 40, W, H - HORIZON_Y + 40);
    // Mist wisps drifting over the river at dawn.
    if (world.leg.sky === 'dawn') {
      ctx.fillStyle = 'rgba(240,234,214,0.20)';
      for (let k = 0; k < 4; k += 1) {
        const mx = ((hash(k * 31) * W + world.time * (6 + k * 2)) % (W + 400)) - 200;
        ctx.beginPath();
        ctx.ellipse(mx, 430 + k * 42, 220, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Lightning: the flash, then the bolt.
  if (world.lightningFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${world.lightningFlash * 0.2})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (world.bolt) {
    ctx.strokeStyle = 'rgba(255,246,200,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let bx = world.bolt.x;
    let by = world.bolt.top;
    ctx.moveTo(bx, by);
    for (let k = 1; k <= 5; k += 1) {
      bx += (hash(k * 17 + 3) - 0.5) * 46;
      by = world.bolt.top + ((world.bolt.bottom - world.bolt.top) * k) / 5;
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }
}

// ---------- HUD ----------

function fuelColor(fuel) {
  if (fuel < 20) return '#ff5a4e';
  if (fuel < 40) return '#f2b23e';
  return '#5fd68a';
}

function gauge(ctx, x, y, w, h, frac, label, color) {
  ctx.fillStyle = 'rgba(5,16,12,0.55)';
  rr(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = color;
  const ih = Math.max(0, Math.min(1, frac)) * (h - 4);
  rr(ctx, x + 2, y + h - 2 - ih, w - 4, ih, 4);
  ctx.fill();
  text(ctx, label, x + w / 2, y + h + 14, 11, '#dcebe2', 'center', 700);
}

function nextTargetOf(world) {
  const ring = world.rings.find((r) => !r.done);
  if (ring) return { label: 'RING', dist: Math.max(0, ring.z - world.flight.z) };
  const drop = world.drops.find((d) => !d.dropped);
  if (drop) return { label: `DROP — ${drop.village.toUpperCase()}`, dist: Math.max(0, drop.z - world.flight.z) };
  const animal = world.animals.find((a) => !a.photographed);
  if (animal) return { label: animal.label.toUpperCase(), dist: Math.max(0, animal.z - world.flight.z) };
  return { label: 'WATER LANDING', dist: Math.max(0, world.leg.length - world.flight.z) };
}

function drawHud(world, best) {
  const ctx = CTX;
  const f = world.flight;
  const leg = world.leg;

  // Top-left: leg, mission, score.
  panel(ctx, 16, 14, 302, 66);
  text(ctx, `LEG ${leg.id} — ${leg.name.toUpperCase()}`, 30, 38, 16, '#f2f7f2', 'left', 800);
  text(ctx, `${leg.from} → ${leg.to}   •   SCORE ${world.score}`, 30, 60, 13, '#bcd4c2', 'left', 600);
  if (world.combo > 1) text(ctx, `COMBO x${world.combo}`, 30, 78, 13, '#ffd94a', 'left', 800);

  // Top-centre: heading tape.
  const hdg = Math.round(((f.heading * 180) / Math.PI % 360 + 360) % 360);
  panel(ctx, 470, 14, 340, 46);
  ctx.save();
  ctx.beginPath();
  rr(ctx, 470, 14, 340, 46, 10);
  ctx.clip();
  for (let d = -60; d <= 60; d += 15) {
    const deg = Math.round((hdg + d + 360) % 360);
    const x = 640 + d * 2.4;
    ctx.strokeStyle = 'rgba(220,235,225,0.7)';
    ctx.lineWidth = d % 45 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, d % 45 === 0 ? 30 : 36);
    ctx.stroke();
    if (d % 45 === 0) {
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
      text(ctx, label, x, 28, 12, '#dcebe2', 'center', 700);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(640, 46);
  ctx.lineTo(634, 56);
  ctx.lineTo(646, 56);
  ctx.closePath();
  ctx.fill();
  text(ctx, `${String(hdg).padStart(3, '0')}°`, 640, 72, 13, '#eef3ea', 'center', 700);

  // Next target.
  const target = nextTargetOf(world);
  text(ctx, `NEXT: ${target.label} — ${Math.round(target.dist).toLocaleString('en-US')} ft`, 640, 96, 14, '#ffe9a8', 'center', 700);

  // Speed tape (left) and altitude tape (right).
  panel(ctx, 16, 200, 64, 210);
  text(ctx, 'SPD', 48, 192, 12, '#bcd4c2', 'center', 700);
  for (let d = -60; d <= 60; d += 20) {
    const sp = Math.round(f.speed + d);
    if (sp < 0) continue;
    const y = 305 - d * 1.5;
    ctx.strokeStyle = 'rgba(220,235,225,0.6)';
    ctx.beginPath();
    ctx.moveTo(66, y);
    ctx.lineTo(74, y);
    ctx.stroke();
    text(ctx, String(sp), 58, y + 4, 11, '#dcebe2', 'right', 600);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(74, 305);
  ctx.lineTo(66, 298);
  ctx.lineTo(66, 312);
  ctx.closePath();
  ctx.fill();
  text(ctx, `${Math.round(f.speed)} kt`, 48, 428, 13, '#f2f7f2', 'center', 800);

  panel(ctx, 1200, 200, 64, 210);
  text(ctx, 'ALT', 1232, 192, 12, '#bcd4c2', 'center', 700);
  for (let d = -300; d <= 300; d += 100) {
    const alt = Math.round(f.y + d);
    if (alt < 0) continue;
    const y = 305 - d * 0.3;
    ctx.strokeStyle = 'rgba(220,235,225,0.6)';
    ctx.beginPath();
    ctx.moveTo(1206, y);
    ctx.lineTo(1214, y);
    ctx.stroke();
    text(ctx, String(alt), 1222, y + 4, 11, '#dcebe2', 'left', 600);
  }
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(1206, 305);
  ctx.lineTo(1214, 298);
  ctx.lineTo(1214, 312);
  ctx.closePath();
  ctx.fill();
  text(ctx, `${Math.round(f.y)} ft`, 1232, 428, 13, '#f2f7f2', 'center', 800);
  text(ctx, `VS ${f.vs >= 0 ? '+' : ''}${Math.round(f.vs)}`, 1232, 448, 12, '#bcd4c2', 'center', 600);

  // Right gauges: fuel, damage, throttle.
  gauge(ctx, 1152, 470, 18, 120, f.fuel / 100, 'FUEL', fuelColor(f.fuel));
  gauge(ctx, 1180, 470, 18, 120, f.damage / 100, 'DMG', f.damage > 60 ? '#ff5a4e' : '#f2b23e');
  gauge(ctx, 1208, 470, 18, 120, f.throttle, 'THR', '#5fb4d6');
  text(ctx, `FLT ${f.floats ? 'DOWN' : 'UP'}`, 1232, 612, 12, f.floats ? '#5fd68a' : '#f2b23e', 'center', 700);
  text(ctx, `FLAPS ${f.flaps ? 'ON' : 'OFF'}`, 1232, 630, 12, f.flaps ? '#5fd68a' : '#bcd4c2', 'center', 700);
  if (f.onWater) text(ctx, 'ON THE WATER', 1232, 648, 12, '#7fd4e8', 'center', 700);

  // Bank indicator: a small arc on the open water left of the plane, needle at the roll.
  ctx.strokeStyle = 'rgba(220,235,225,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(380, 640, 24, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  const needle = -Math.PI / 2 + (f.roll * Math.PI) / 180;
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(380, 640);
  ctx.lineTo(380 + Math.cos(needle) * 20, 640 + Math.sin(needle) * 20);
  ctx.stroke();
  text(ctx, `BANK ${Math.round(f.roll)}°`, 380, 684, 11, '#dcebe2', 'center', 700);

  // Viewfinder: FIXED brackets at the centre of the screen — the pilot steers the
  // animal into them. A diamond marks where the animal actually sits.
  const animal = photoTarget(world);
  if (animal) {
    const frame = frameAnimal(world, animal);
    const p = project(CAMERA, animal.x, animal.y + animalY(animal, world.time), animal.z);
    const col = frame && frame.quality === 'perfect' ? '#ffd94a' : frame && frame.quality ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    const half = 120;
    const c = 22;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(640 + sx * half, 330 + sy * half - sy * c);
      ctx.lineTo(640 + sx * half, 330 + sy * half);
      ctx.lineTo(640 + sx * half - sx * c, 330 + sy * half);
      ctx.stroke();
    }
    if (p) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 7);
      ctx.lineTo(p.x + 7, p.y);
      ctx.lineTo(p.x, p.y + 7);
      ctx.lineTo(p.x - 7, p.y);
      ctx.closePath();
      ctx.fill();
    }
    const label = frame && frame.quality
      ? `${animal.label} — ${Math.round(frame.dist).toLocaleString('en-US')} ft — SPACE: PHOTO`
      : `${animal.label} — GET CLOSER`;
    outlineText(ctx, label, 640, 144, 15, col, 'center', 700);
  }

  // Minimap: the river course ahead, the plane, the next target. Bottom-left,
  // clear of the speed tape above it and the gauges on the right.
  panel(ctx, 16, 566, 224, 140);
  text(ctx, 'RIVER', 28, 584, 11, '#bcd4c2', 'left', 700);
  ctx.strokeStyle = '#7fd4e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= 12; k += 1) {
    const z = f.z - 1500 + k * 1100;
    const cx = 128 + (riverCenterX(z) - riverCenterX(f.z)) * 0.012;
    const cy = 700 - k * 8.5;
    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 700, 4, 0, Math.PI * 2);
  ctx.fill();
  const tgt = nextTargetOf(world);
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(128 + 6, 700 - Math.min(11, tgt.dist / 1200), 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Message line, under the heading tape and the next-target line.
  if (world.message) {
    outlineText(ctx, world.message, 640, 120, 18, '#ffffff', 'center', 800);
  }
  text(ctx, `FEATS ${world.feats.size}/8`, 1264, 30, 12, '#bcd4c2', 'right', 700);
}

// ---------- screens ----------

function drawTitle(world, best) {
  const ctx = CTX;
  const g = ctx.createLinearGradient(0, 380, 0, H);
  g.addColorStop(0, 'rgba(4,12,9,0)');
  g.addColorStop(1, 'rgba(4,12,9,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 380, W, H - 380);
  outlineText(ctx, 'AMAZON RIVER RUN', 640, 470, 64, '#f2f7f2', 'center', 800);
  outlineText(ctx, 'A modern seaplane survey down the Amazon — water landings, wildlife photos, village drops', 640, 508, 18, '#dcebe2', 'center', 600);
  outlineText(ctx, 'PRESS SPACE OR CLICK TO FLY', 640, 560, 22, '#ffd94a', 'center', 800);
  text(ctx, `BEST ${best}`, 640, 592, 15, '#bcd4c2', 'center', 700);
  text(ctx, 'Arrows / WASD fly  •  Shift / Ctrl throttle  •  F flaps  •  G floats  •  Space photo / drop  •  B brake  •  P pause', 640, 632, 14, '#bcd4c2', 'center', 600);
  text(ctx, 'Legs: Dawn Departure  •  Dolphin Survey  •  Village Drop  •  Storm Squall  •  Night River  •  Research Station Finale', 640, 660, 13, '#9db8a4', 'center', 600);
}

function drawPaused() {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,12,9,0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 470, 300, 340, 110);
  text(ctx, 'PAUSED', 640, 348, 30, '#f2f7f2', 'center', 800);
  text(ctx, 'Press P to keep flying', 640, 380, 15, '#bcd4c2', 'center', 600);
}

function drawGameOver(world, best) {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,12,9,0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 400, 260, 480, 210);
  text(ctx, 'FLIGHT ENDED', 640, 310, 30, '#ff8a7a', 'center', 800);
  text(ctx, world.crashReason, 640, 344, 16, '#f2f7f2', 'center', 600);
  text(ctx, `SCORE ${world.score}   •   BEST ${best}`, 640, 380, 16, '#dcebe2', 'center', 700);
  text(ctx, 'PRESS SPACE TO FLY AGAIN', 640, 424, 16, '#ffd94a', 'center', 800);
}

function drawRiverLog(world, best) {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,12,9,0.6)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, 250, 70, 780, 580);
  text(ctx, 'RIVER LOG', 640, 122, 34, '#f2f7f2', 'center', 800);
  text(ctx, 'Amazon River Run — Manaus to the Research Station', 640, 148, 14, '#bcd4c2', 'center', 600);
  let y = 196;
  text(ctx, 'LEG', 280, y, 12, '#9db8a4', 'left', 700);
  text(ctx, 'SCORE', 620, y, 12, '#9db8a4', 'right', 700);
  text(ctx, 'RINGS', 700, y, 12, '#9db8a4', 'right', 700);
  text(ctx, 'LANDING', 800, y, 12, '#9db8a4', 'right', 700);
  text(ctx, 'PHOTOS', 920, y, 12, '#9db8a4', 'right', 700);
  text(ctx, 'CARGO', 1000, y, 12, '#9db8a4', 'right', 700);
  y += 10;
  ctx.strokeStyle = 'rgba(220,235,225,0.25)';
  ctx.beginPath();
  ctx.moveTo(280, y);
  ctx.lineTo(1000, y);
  ctx.stroke();
  y += 26;
  for (const row of world.legResults) {
    text(ctx, `${row.name}  (${row.from} → ${row.to})`, 280, y, 15, '#f2f7f2', 'left', 600);
    text(ctx, String(row.score), 620, y, 15, '#f2f7f2', 'right', 700);
    text(ctx, row.rings, 700, y, 15, '#dcebe2', 'right', 600);
    text(ctx, row.landing, 800, y, 15, '#dcebe2', 'right', 600);
    text(ctx, row.photos, 920, y, 15, '#dcebe2', 'right', 600);
    text(ctx, row.cargo === '—' ? '—' : row.cargo.split(' ')[0], 1000, y, 15, '#dcebe2', 'right', 600);
    y += 26;
  }
  y += 8;
  ctx.strokeStyle = 'rgba(220,235,225,0.25)';
  ctx.beginPath();
  ctx.moveTo(280, y);
  ctx.lineTo(1000, y);
  ctx.stroke();
  y += 30;
  const feats = [...world.feats];
  text(ctx, `FEATS  ${feats.length > 0 ? feats.map((f) => f).join('  •  ') : 'none yet'}`, 640, y, 14, '#ffd94a', 'center', 700);
  y += 40;
  text(ctx, `TOTAL  ${world.score}`, 640, y, 26, '#f2f7f2', 'center', 800);
  text(ctx, `BEST  ${best}`, 640, y + 28, 15, '#bcd4c2', 'center', 700);
  text(ctx, 'PRESS SPACE TO FLY AGAIN', 640, y + 62, 16, '#ffd94a', 'center', 800);
}
