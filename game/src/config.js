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
    sky: '#f7b267',
    skyTop: '#ffd9a0',
    ground: '#7a9e4b',
    groundDark: '#5d7f38',
    accent: '#c96f2e',
    banner: 'The Farmyard — run, turkey, run!',
  },
  {
    name: 'The Barn',
    fromM: 400,
    toM: 800,
    baseSpeed: 350,
    sky: '#e08e5a',
    skyTop: '#f2b880',
    ground: '#8a6b42',
    groundDark: '#6d5433',
    accent: '#a34d1f',
    banner: 'Into the Barn — he is right behind you!',
  },
  {
    name: 'The Kitchen',
    fromM: 800,
    toM: 1200,
    baseSpeed: 410,
    sky: '#d96a4e',
    skyTop: '#eda07a',
    ground: '#b98d68',
    groundDark: '#966f4e',
    accent: '#8c2f1b',
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
  turkeyBody: '#8a5230',
  turkeyDark: '#6d3f22',
  turkeyLight: '#b5773f',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c0392b'],
  head: '#e8e2d5',
  beak: '#e8a33c',
  wattle: '#e5534b',
  farmerShirt: '#3e6b9e',
  farmerOveralls: '#4a6fa5',
  farmerHat: '#d9b36c',
  farmerSkin: '#e8b98a',
  knifeBlade: '#dfe3e8',
  knifeHandle: '#5a3a1e',
  corn: '#f2c94c',
  cornHusk: '#5d8a3c',
  feather: '#e8e2d5',
  gold: '#ffd94d',
  panel: 'rgba(30, 20, 12, 0.82)',
  panelEdge: '#f2c94c',
  text: '#fff7e6',
  muted: '#d8c9a8',
  danger: '#e5534b',
  good: '#7ed957',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
