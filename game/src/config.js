// Gobble Dash — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** The turkey runs at this fixed x; the world scrolls left past it. */
export const TURKEY_X = 260;

export const TURKEY = {
  width: 56,
  height: 64,
  duckHeight: 34,
  jumpVelocity: 1000,
  gravity: 3200,
  /** Seconds of flashing invulnerability after a hit. */
  invulnerable: 1.2,
};

/** The farmer starts this far behind the turkey, in pixels. */
export const FARMER = {
  startGap: 220,
  /** Pixels of ground lost on each stumble. */
  hitCost: 70,
  /** Pixels regained per corn cob. */
  cornPush: 15,
  /** Pixels regained per second of clean running (after 3 s without a hit). */
  recoverPerSecond: 3,
};

/** Distance, in metres, the turkey must cover to reach the forest gate. */
export const ESCAPE_DISTANCE_M = 1200;
/** Pixels of scrolling per metre of distance. */
export const PX_PER_M = 50;

/** Points. */
export const POINTS = { corn: 25, feather: 50, goldenCorn: 100, metre: 1 };

/** The three stages, in order: name, distance range, scroll speed, palette. */
export const STAGES = [
  {
    name: 'Farmyard',
    fromM: 0,
    toM: 400,
    baseSpeed: 300,
    sky: '#bfe9ff',
    skyTop: '#1e9be0',
    ground: '#7bc043',
    groundDark: '#5e9b2e',
    accent: '#e4572e',
    banner: 'The Farmyard — run, turkey, run!',
  },
  {
    name: 'The Barn',
    fromM: 400,
    toM: 800,
    baseSpeed: 350,
    sky: '#b5773f',
    skyTop: '#7a4a26',
    ground: '#a87c4f',
    groundDark: '#8a6a42',
    accent: '#e4572e',
    banner: 'Into the Barn — he is right behind you!',
  },
  {
    name: 'The Kitchen',
    fromM: 800,
    toM: 1200,
    baseSpeed: 410,
    sky: '#f7d9b0',
    skyTop: '#e8a06a',
    ground: '#d9a86c',
    groundDark: '#b98a5a',
    accent: '#d9382b',
    banner: 'The Kitchen — dodge the oven and the knives!',
  },
];

/** Obstacle shapes: width, height, whether to jump it, whether to duck it. */
export const OBSTACLES = {
  fence: { width: 26, height: 92, dodge: 'jump', weight: 3 },
  hay: { width: 72, height: 64, dodge: 'jump', weight: 3 },
  crate: { width: 50, height: 90, dodge: 'jump', weight: 2 },
  puddle: { width: 96, height: 16, dodge: 'jump', weight: 2, stumbleCost: 35 },
  oven: { width: 90, height: 100, dodge: 'jump', weight: 2, kitchenOnly: true },
  knifeThrown: { width: 54, height: 16, dodge: 'duck', weight: 2, kitchenOnly: true, flySpeed: 220 },
  knifeFalling: { width: 18, height: 64, dodge: 'jump', weight: 2, kitchenOnly: true, fallSpeed: 620 },
};

/** Seconds between obstacle spawns, by stage index. */
export const SPAWN_INTERVAL = [1.15, 0.95, 0.9];
export const SPAWN_JITTER = 0.35;

export const PALETTE = {
  turkeyBody: '#9c5a1a',
  turkeyDark: '#6e3d0f',
  turkeyLight: '#d9a05b',
  tail: ['#d9382b', '#f26522', '#ffc800', '#e4572e'],
  head: '#fff6e8',
  beak: '#ff9f1c',
  wattle: '#e63329',
  farmerShirt: '#d9382b',
  farmerOveralls: '#2e6db4',
  farmerHat: '#f2c94c',
  farmerSkin: '#f2c09a',
  knifeBlade: '#e8edf2',
  knifeHandle: '#7a3b1e',
  corn: '#ffe066',
  cornHusk: '#58a83c',
  feather: '#ffffff',
  gold: '#ffd93b',
  panel: 'rgba(255, 248, 231, 0.96)',
  panelEdge: '#4a2c12',
  text: '#4a2c12',
  muted: '#8a6a42',
  danger: '#ff4b4b',
  good: '#58cc02',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
