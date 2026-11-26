// The Amazon river run: six legs down one winding river, dawn to golden hour. Each leg
// is one mission with its own sky, weather, rings, animals and villages, flown along +z
// from its own origin (z = 0) to the water landing at z = length. The river winds: its
// centreline is a sum of slow sines, so the pilot banks to follow the water and the
// rainforest stays on both banks the whole way. All positions are feet.
//
// Geometry note: the river is wide (about 2000 ft across) and the plane flies low over
// it, so the water fills the lower frame and the forest walls read on both sides.

import { WATER_Y } from './config.js';

/** The river centreline, in feet off the route centre, at distance z along the leg. */
export function riverCenterX(z) {
  return 2200 * Math.sin(z / 16000) + 1200 * Math.sin(z / 7500 + 1.7) + 500 * Math.sin(z / 3400 + 0.6);
}

/** Half the river width, in feet, at distance z. */
export function riverHalf(z) {
  return 1150 + 300 * Math.sin(z / 9000 + 2.0);
}

export const STATIONS = {
  MNA: { code: 'MNA', name: 'Manaus Floatplane Base' },
  SMI: { code: 'SMI', name: 'São Miguel Village' },
  PVE: { code: 'PVE', name: 'Porto Verde Village' },
  FDS: { code: 'FDS', name: 'Floating Fuel Station' },
  RST: { code: 'RST', name: 'Amazon Research Station' },
};

/**
 * A ring: fly through it. x is feet off the centreline, y is altitude in feet, z is feet
 * along the leg, r is the ring radius in feet.
 */
export const LEGS = [
  {
    id: 1,
    name: 'Dawn Departure',
    from: 'MNA',
    to: 'SMI',
    sky: 'dawn',
    mission: 'rings',
    brief: 'Mist on the river at dawn. Six rings over the water — keep her low, keep her smooth.',
    length: 42000,
    cruiseAlt: 800,
    cruiseSpeed: 175,
    rings: [
      { x: 0, y: 700, z: 12000, r: 170 },
      { x: 500, y: 650, z: 16000, r: 170 },
      { x: -450, y: 600, z: 20000, r: 170 },
      { x: 400, y: 550, z: 24000, r: 160 },
      { x: -500, y: 500, z: 28000, r: 160 },
      { x: 0, y: 450, z: 32000, r: 180 },
    ],
    drops: [],
    animals: [],
    weather: { rain: 0, fog: 0.7, gust: 0.1, lightning: 0 },
    villages: [
      { name: 'São Miguel', z: 30000, side: 1, houses: 6 },
    ],
    fuelDock: null,
    sandBars: [
      { dz: 0.42, off: -300, r: 260 },
    ],
    people: [
      { name: 'Dr. Elena, 38', quote: 'The river wakes before we do. Keep her low and quiet.' },
    ],
  },
  {
    id: 2,
    name: 'Dolphin Survey',
    from: 'SMI',
    to: 'PVE',
    sky: 'day',
    mission: 'photo',
    brief: 'Pink river dolphins are surfacing ahead. Frame each one in the viewfinder and snap it with Space.',
    length: 42000,
    cruiseAlt: 380,
    cruiseSpeed: 150,
    rings: [
      { x: 200, y: 550, z: 9000, r: 180 },
      { x: -200, y: 500, z: 26000, r: 180 },
    ],
    drops: [],
    animals: [
      { kind: 'dolphin', z: 14000, label: 'Pink river dolphin' },
      { kind: 'dolphin', z: 22000, label: 'Pink river dolphin' },
      { kind: 'dolphin', z: 30000, label: 'Pink river dolphin' },
    ],
    weather: { rain: 0, fog: 0.15, gust: 0.1, lightning: 0 },
    villages: [
      { name: 'Porto Verde', z: 34000, side: -1, houses: 5 },
    ],
    fuelDock: null,
    sandBars: [
      { dz: 0.55, off: 350, r: 220 },
    ],
    people: [
      { name: 'Rafael, 24, river guide', quote: 'Dolphins at first light. Pink ones. Do not scare them.' },
    ],
  },
  {
    id: 3,
    name: 'Village Drop',
    from: 'PVE',
    to: 'FDS',
    sky: 'day',
    mission: 'cargo',
    brief: 'Medicine for São Miguel, rice for Porto Verde. Drop a crate on each village dock, then on to the fuel station.',
    length: 42000,
    cruiseAlt: 800,
    cruiseSpeed: 165,
    rings: [
      { x: -300, y: 700, z: 10000, r: 180 },
      { x: 300, y: 650, z: 28000, r: 180 },
    ],
    drops: [
      { village: 'São Miguel', z: 18000, r: 220 },
      { village: 'Porto Verde', z: 32000, r: 220 },
    ],
    animals: [],
    weather: { rain: 0, fog: 0.1, gust: 0.2, lightning: 0 },
    villages: [
      { name: 'São Miguel', z: 18000, side: 1, houses: 6 },
      { name: 'Porto Verde', z: 32000, side: -1, houses: 5 },
    ],
    fuelDock: { z: 25000, side: 1 },
    sandBars: [],
    people: [
      { name: 'Dona Maria, 61, village elder', quote: 'Medicine for São Miguel, rice for Porto Verde. The river is our road.' },
    ],
  },
  {
    id: 4,
    name: 'Storm Squall',
    from: 'FDS',
    to: 'MNA',
    sky: 'storm',
    mission: 'rings',
    brief: 'A squall line sits on the river. Heavy rain, fog banks, hard gusts — fly the rings, do not fight the sky.',
    length: 40000,
    cruiseAlt: 800,
    cruiseSpeed: 160,
    rings: [
      { x: 0, y: 700, z: 12000, r: 170 },
      { x: 450, y: 650, z: 16000, r: 160 },
      { x: -450, y: 600, z: 20000, r: 160 },
      { x: 350, y: 550, z: 24000, r: 160 },
      { x: 0, y: 500, z: 28000, r: 180 },
    ],
    drops: [],
    animals: [],
    weather: { rain: 2, fog: 0.8, gust: 1, lightning: 1 },
    villages: [
      { name: 'São Miguel', z: 22000, side: -1, houses: 5 },
    ],
    fuelDock: null,
    sandBars: [
      { dz: 0.3, off: 250, r: 240 },
    ],
    people: [
      { name: 'Carlos, 45, co-pilot', quote: 'Squall line ahead. Fly the river, not the storm.' },
    ],
  },
  {
    id: 5,
    name: 'Night River',
    from: 'MNA',
    to: 'FDS',
    sky: 'night',
    mission: 'landing',
    brief: 'Night over the river. Follow the lit rings, land on the buoy lights at the floating fuel station.',
    length: 42000,
    cruiseAlt: 800,
    cruiseSpeed: 165,
    rings: [
      { x: 250, y: 700, z: 13000, r: 180 },
      { x: -300, y: 600, z: 20000, r: 180 },
    ],
    drops: [],
    animals: [],
    weather: { rain: 0, fog: 0.35, gust: 0.1, lightning: 0 },
    villages: [
      { name: 'Porto Verde', z: 26000, side: 1, houses: 6 },
    ],
    fuelDock: { z: 40000, side: 0 },
    sandBars: [],
    people: [
      { name: 'Ana, 29, station nurse', quote: 'The buoys are lit. Bring her down on the lights.' },
    ],
  },
  {
    id: 6,
    name: 'Research Station Finale',
    from: 'FDS',
    to: 'RST',
    sky: 'golden',
    mission: 'finale',
    brief: 'Home to the research station. A jaguar on the sand bank, macaws over the river — one clean photo of each, then land on the water at the station dock.',
    length: 42000,
    cruiseAlt: 450,
    cruiseSpeed: 160,
    rings: [
      { x: 0, y: 650, z: 10000, r: 180 },
      { x: 400, y: 600, z: 30000, r: 170 },
    ],
    drops: [],
    animals: [
      { kind: 'jaguar', z: 16000, label: 'Jaguar on the sand bank' },
      { kind: 'macaw', z: 24000, label: 'Scarlet macaws' },
    ],
    weather: { rain: 0, fog: 0.2, gust: 0.15, lightning: 0 },
    villages: [],
    fuelDock: null,
    sandBars: [
      { dz: 0.38, off: 250, r: 300 },
    ],
    people: [
      { name: 'Tiago, 33, researcher', quote: 'Jaguar on the bank at dawn. One clean photo and we go home.' },
    ],
  },
];

/** Where a village's houses and dock sit, in world coordinates, for this leg. */
export function villageLayout(leg, village) {
  const cx = riverCenterX(village.z);
  const half = riverHalf(village.z);
  const dockX = cx + village.side * (half - 60);
  const houseX = cx + village.side * (half + 180);
  return { cx, half, dockX, houseX };
}

/** Where a fuel dock floats, in world coordinates, for this leg (null when none). */
export function fuelDockLayout(leg) {
  if (!leg.fuelDock) return null;
  const cx = riverCenterX(leg.fuelDock.z);
  const half = riverHalf(leg.fuelDock.z);
  const side = leg.fuelDock.side === 0 ? 0 : leg.fuelDock.side;
  return { x: cx + side * (half - 250), z: leg.fuelDock.z };
}

/** Where an animal lives, in world coordinates, for this leg. */
export function animalLayout(leg, animal) {
  const cx = riverCenterX(animal.z);
  if (animal.kind === 'dolphin') return { x: cx + (animal.z % 700) - 350, y: WATER_Y, z: animal.z };
  if (animal.kind === 'jaguar') return { x: cx + 250, y: WATER_Y + 8, z: animal.z };
  if (animal.kind === 'macaw') return { x: cx - 150, y: 620, z: animal.z };
  return { x: cx, y: WATER_Y, z: animal.z };
}
