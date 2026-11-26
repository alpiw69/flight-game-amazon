// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.
// Distances in the world are feet, speeds in knots, altitudes in feet. The water surface
// sits at y = 40; the rainforest canopy tops out around 200 ft.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Perspective focal length, in screen pixels, for the chase camera. */
export const FOCAL = 900;
/** Screen height of the horizon line in chase view. */
export const HORIZON_Y = 330;

/** Feet per knot per second. */
export const KT = 1.68781;

/** Height of the river surface, in feet. */
export const WATER_Y = 40;
/** Height of the rainforest canopy, in feet above the water. */
export const CANOPY_Y = 200;
/** Height of the tallest emergent trees, in feet above the water. */
export const EMERGENT_Y = 260;

export const PLANE = {
  /** Knots below which the wing stops flying. */
  stallSpeed: 70,
  /** Knots at full throttle, level flight, floats down. */
  maxSpeed: 205,
  /** Knots at full throttle, floats up (less drag). */
  maxSpeedClean: 225,
  /** Knots on a normal water approach. */
  approachSpeed: 95,
  /** Knots where the floats plane and she lifts off the water. */
  rotateSpeed: 85,
  /** Degrees of bank per second at full stick. */
  bankRate: 60,
  /** Max bank, degrees. */
  maxBank: 42,
  /** Max pitch, degrees. */
  maxPitch: 13,
  /** Feet per second of climb at full throttle, level attitude. */
  climbRate: 1800,
  /** Fuel burn at full throttle, percent per second. */
  burnFull: 0.15,
  /** Fuel burn at idle, percent per second. */
  burnIdle: 0.025,
  /** Fuel at the start of every leg (topped up at each station). */
  fuelStart: 100,
  /** Damage taken from a hard water touchdown. */
  hardLandingDamage: 22,
  /** Vertical speed, ft/min, above which a water touchdown counts as hard. */
  hardLandingVs: 550,
  /** Vertical speed, ft/min, below which a water touchdown counts as perfect. */
  perfectVs: 150,
  /** Vertical speed, ft/min, below which a water touchdown counts as smooth. */
  smoothVs: 300,
};

export const SCORE = {
  ring: 100,
  ringComboStep: 25,
  legComplete: 200,
  landingPerfect: 500,
  landingGood: 250,
  landingOk: 100,
  cargoPerfect: 300,
  cargoGood: 180,
  cargoOk: 80,
  photoPerfect: 400,
  photoGood: 250,
  photoOk: 120,
  fuelTopUp: 50,
};

/** Feat ids, in the order the river log shows them. */
export const FEATS = {
  PERFECT_LANDING: 'perfect-landing',
  ALL_RINGS: 'all-rings',
  SMOOTH_OPERATOR: 'smooth-operator',
  STORM_RIDER: 'storm-rider',
  SHUTTERBUG: 'shutterbug',
  WILDLIFE_ACE: 'wildlife-ace',
  RIVER_RUNNER: 'river-runner',
  FULL_ROUTE: 'full-route',
};

export const FEAT_LABELS = {
  'perfect-landing': 'Perfect Landing',
  'all-rings': 'All Rings',
  'smooth-operator': 'Smooth Operator',
  'storm-rider': 'Storm Rider',
  'shutterbug': 'Shutterbug',
  'wildlife-ace': 'Wildlife Ace',
  'river-runner': 'River Runner',
  'full-route': 'Full Route',
};

export const FEAT_DESCRIPTIONS = {
  'perfect-landing': 'Set her on the water softer than 150 ft/min.',
  'all-rings': 'Flew every ring on a leg.',
  'smooth-operator': 'Finished a leg with no damage.',
  'storm-rider': 'Flew the squall leg and lived.',
  'shutterbug': 'Photographed every animal on a survey leg.',
  'wildlife-ace': 'Photographed every animal on the whole route.',
  'river-runner': 'Ran the night river and landed on the lights.',
  'full-route': 'Flew all six legs of the Amazon river run.',
};

/** Sky palettes, one per time of day. The Amazon light is warm and wet: pale dawn mist,
 * bright green day, gold dusk, dark storm, deep blue night, low golden sun. */
export const SKIES = {
  dawn: {
    top: '#7d94b8', mid: '#c3cdb9', low: '#e8ddc0', sun: '#fff3cf', sunX: 0.68, sunY: 0.3,
    cloud: '#f2ead6', cloudShadow: '#a8a88e', waterTop: '#7d9a8e', waterBottom: '#3d5a52',
    forestTop: '#4a6b41', forestBottom: '#243d24',
    haze: 'rgba(232,221,192,0.5)', night: false,
  },
  day: {
    top: '#2f6fb2', mid: '#7fb2dd', low: '#d9ecf7', sun: '#fffbe8', sunX: 0.24, sunY: 0.15,
    cloud: '#ffffff', cloudShadow: '#b9cfe4', waterTop: '#2e7d8c', waterBottom: '#14485e',
    forestTop: '#2f6b33', forestBottom: '#163d1e',
    haze: 'rgba(217,236,247,0.28)', night: false,
  },
  dusk: {
    top: '#3a3f6e', mid: '#b07a4e', low: '#f2c98a', sun: '#ffe9b0', sunX: 0.3, sunY: 0.34,
    cloud: '#e8b98a', cloudShadow: '#6e5570', waterTop: '#5a6a7e', waterBottom: '#2c3547',
    forestTop: '#33502e', forestBottom: '#1a2c1c',
    haze: 'rgba(242,201,138,0.32)', night: false,
  },
  storm: {
    top: '#161c26', mid: '#2e3a46', low: '#525e66', sun: '#c9d4d8', sunX: 0.66, sunY: 0.13,
    cloud: '#414c58', cloudShadow: '#20282e', waterTop: '#33505c', waterBottom: '#17272f',
    forestTop: '#243d28', forestBottom: '#12241a',
    haze: 'rgba(200,210,220,0.55)', night: false,
  },
  night: {
    top: '#04081a', mid: '#0c1533', low: '#1c2a52', sun: '#e8ecf7', sunX: 0.74, sunY: 0.2,
    cloud: '#2a3560', cloudShadow: '#141c38', waterTop: '#14243f', waterBottom: '#060d1d',
    forestTop: '#16241c', forestBottom: '#0a140e',
    haze: 'rgba(12,21,51,0.5)', night: true,
  },
  golden: {
    top: '#4a5a8e', mid: '#c99a5e', low: '#f6d695', sun: '#ffedb8', sunX: 0.6, sunY: 0.3,
    cloud: '#f2d3a0', cloudShadow: '#8f7a68', waterTop: '#6a7d6e', waterBottom: '#2f4238',
    forestTop: '#3a5c2e', forestBottom: '#1d3319',
    haze: 'rgba(246,214,149,0.35)', night: false,
  },
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'amazon-river-run.best';

/** Livery: clean white fuselage, deep teal cheatline, warm gold sun mark. */
export const LIVERY = {
  fuselageTop: '#fbfdff',
  fuselageMid: '#dde7ee',
  fuselageBelly: '#93a8b8',
  cheatline: '#0e7d6b',
  cheatlineGold: '#f2b23e',
  tail: '#0b5f52',
  tailMark: '#f2b23e',
  engine: '#ccd8e0',
  engineIntake: '#1c2733',
  window: '#14222e',
  floatTop: '#eef3f6',
  floatBelly: '#7d94a3',
};
