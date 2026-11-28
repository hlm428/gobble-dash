// Gobble Dash — the game state and its rules. The turkey auto-runs right
// while the world scrolls left; the farmer chases from behind and closes in
// on every stumble; corn pushes him back. Reach the forest gate at
// ESCAPE_DISTANCE_M to escape; if the farmer's gap closes to zero, the
// turkey is caught. A fixed 60 Hz step keeps every run deterministic for a
// given seed.

import {
  FIELD, STEP, TURKEY_X, TURKEY, FARMER, FEED_BOOST, ESCAPE_DISTANCE_M, PX_PER_M,
  POINTS, STAGES, OBSTACLES, SPAWN_INTERVAL, SPAWN_JITTER, BEST_KEY,
} from './config.js';
import { createRandom, pickWeighted } from './random.js';

export const EVENT_JUMP = 1;
export const EVENT_LAND = 2;
export const EVENT_CORN = 4;
export const EVENT_FEATHER = 8;
export const EVENT_GOLDEN = 16;
export const EVENT_HIT = 32;
export const EVENT_STAGE = 64;
export const EVENT_ESCAPED = 128;
export const EVENT_CAUGHT = 256;
export const EVENT_SPOTTED = 512;
export const EVENT_FEED = 1024;

const TAUNTS = [
  'Come back here!',
  "Thanksgiving's coming!",
  'Gotcha, gobbler!',
  'That turkey is MINE!',
  'No stuffing escapes me!',
];

export function createWorld(seed) {
  const world = {
    seed,
    random: createRandom(seed),
    screen: 'title',
    time: 0,
    distancePx: 0,
    bonus: 0,
    stageIndex: 0,
    scrollSpeed: STAGES[0].baseSpeed,
    turkey: { y: FIELD.groundY, vy: 0, onGround: true, ducking: false, invuln: 0, runPhase: 0 },
    farmer: { gap: FARMER.startGap, taunt: TAUNTS[0], tauntUntil: 0, cleanTime: 0 },
    obstacles: [],
    pickups: [],
    spawnTimer: 1.6,
    pickupTimer: 1.2,
    lastTall: false,
    lastObstacleAt: -10,
    /** Seconds left on a jump pressed just before landing (jump buffering). */
    jumpBuffer: 0,
    /** World time until which the chicken-feed speed boost lasts. */
    feedBoostUntil: 0,
    banner: { text: '', until: 0 },
    shake: 0,
    flash: 0,
    best: 0,
    finalScore: 0,
    finalDistanceM: 0,
    muted: false,
  };
  try {
    world.best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    world.best = 0;
  }
  return world;
}

/** A fresh run from the same seed: same obstacles, same pickups. */
export function resetWorld(world, seed) {
  const best = world.best;
  const fresh = createWorld(seed);
  fresh.best = best;
  Object.assign(world, fresh);
}

export function distanceM(world) {
  return world.distancePx / PX_PER_M;
}

export function score(world) {
  return Math.floor(distanceM(world)) + world.bonus;
}

function stageFor(metres) {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (metres >= STAGES[i].fromM) return i;
  }
  return 0;
}

function turkeyRect(world) {
  const t = world.turkey;
  const height = t.ducking ? TURKEY.duckHeight : TURKEY.height;
  // A few pixels of forgiveness: the drawn turkey is a touch larger than
  // the box the game actually tests, so clipping an obstacle's edge by a
  // hair does not count as a hit.
  return { x: TURKEY_X + 4, y: t.y - height + 4, width: TURKEY.width - 8, height: height - 4 };
}

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function spawnObstacle(world) {
  const metres = distanceM(world);
  const stage = stageFor(metres);
  const random = world.random;
  const choices = [];
  for (const [kind, spec] of Object.entries(OBSTACLES)) {
    if (spec.kitchenOnly && stage < 2) continue;
    // After a tall obstacle, never stack another tall one right behind it.
    if (world.lastTall && (kind === 'crate' || kind === 'oven')) continue;
    // A thrown knife needs a clear run-up: never right after another obstacle.
    if (kind === 'knifeThrown' && world.time - world.lastObstacleAt < 1.2) continue;
    choices.push([kind, spec.weight]);
  }
  const kind = pickWeighted(random, choices);
  const spec = OBSTACLES[kind];
  world.lastObstacleAt = world.time;
  const obstacle = { kind, width: spec.width, height: spec.height, x: FIELD.width + 40, y: FIELD.groundY - spec.height, vy: 0, stuck: false, counted: false };
  if (kind === 'knifeThrown') {
    // Flies in from the kitchen ahead, at head height.
    obstacle.y = FIELD.groundY - 58;
    obstacle.vx = spec.flySpeed;
  } else if (kind === 'knifeFalling') {
    // Drops from above ahead, then sticks in the ground as a jump-over spike.
    obstacle.x = FIELD.width + 120 + random() * 200;
    obstacle.y = -80;
    obstacle.vy = spec.fallSpeed;
  } else if (kind === 'puddle') {
    obstacle.y = FIELD.groundY - spec.height;
  }
  world.obstacles.push(obstacle);
  world.lastTall = kind === 'crate' || kind === 'oven';
  // A hazard can also land on top of a pickup that spawned just before it
  // (a corn line trails to the right): lift any ground-level pickup that
  // overlaps this hazard to jump height, so grabbing it never means
  // running into the hazard. Knives are excluded — a ducking turkey can
  // still grab a ground-level pickup under one.
  if (kind !== 'knifeThrown' && kind !== 'knifeFalling') {
    for (const pk of world.pickups) {
      if (pk.y === FIELD.groundY - 46 && pk.x < obstacle.x + obstacle.width + 40 && pk.x + pk.width > obstacle.x - 40) {
        pk.y = FIELD.groundY - 130;
      }
    }
  }
}

function spawnPickup(world) {
  const metres = distanceM(world);
  const stage = stageFor(metres);
  const random = world.random;
  const roll = random();
  let kind = 'corn';
  let y = FIELD.groundY - 46;
  if (roll >= 0.92) {
    // Chicken feed: rare, always at jump height, the big escape tool.
    kind = 'feed';
    y = FIELD.groundY - 130;
  } else if (stage === 2 && roll < 0.06) {
    kind = 'goldenCorn';
    y = FIELD.groundY - 150;
  } else if (roll < 0.16) {
    kind = 'feather';
    y = FIELD.groundY - 150;
  } else if (roll < 0.5) {
    y = FIELD.groundY - 130;
  }
  const x = FIELD.width + 40;
  // Never put a ground-level pickup where grabbing it means running into
  // a hazard: if a fence, hay bale, crate, oven or puddle is waiting at
  // the spawn point, lift the pickup to jump height so it is collected on
  // the way over the hazard instead of inside it.
  if (y === FIELD.groundY - 46) {
    const hazardNear = world.obstacles.some((ob) => ob.kind !== 'knifeThrown' && ob.kind !== 'knifeFalling' && ob.x + ob.width > x - 60 && ob.x < x + 200);
    if (hazardNear) y = FIELD.groundY - 130;
  }
  world.pickups.push({ kind, x, y, width: 30, height: 40, taken: false });
  // Corn often comes in a little line of three.
  if (kind === 'corn' && random() < 0.5) {
    world.pickups.push({ kind, x: x + 64, y, width: 30, height: 40, taken: false });
    world.pickups.push({ kind, x: x + 128, y, width: 30, height: 40, taken: false });
  }
}

/**
 * One fixed step of play. `input` is { jump, ducking } — jump is a one-shot
 * press, ducking is held. Returns a bitmask of EVENT_* for sounds and
 * feedback. Call only while world.screen is 'play'.
 */
export function stepWorld(world, input, dt = STEP) {
  let events = 0;
  const t = world.turkey;
  const f = world.farmer;
  world.time += dt;

  // --- difficulty: scroll speed grows with distance and stage ---
  const metres = distanceM(world);
  const stage = stageFor(metres);
  if (stage !== world.stageIndex) {
    world.stageIndex = stage;
    world.banner = { text: STAGES[stage].banner, until: world.time + 2.6 };
    events |= EVENT_STAGE;
  }
  world.scrollSpeed = (STAGES[stage].baseSpeed + metres * 0.12) * (world.time < world.feedBoostUntil ? FEED_BOOST.speedMult : 1);

  // --- turkey: jump, gravity, duck, run cycle ---
  t.ducking = input.ducking && t.onGround;
  // Jump buffering: a press a fraction of a second before landing still
  // fires the jump, so an early tap on a phone is not silently lost.
  if (input.jump) world.jumpBuffer = 0.12;
  if (world.jumpBuffer > 0) world.jumpBuffer -= dt;
  if (world.jumpBuffer > 0 && t.onGround) {
    t.vy = -TURKEY.jumpVelocity;
    t.onGround = false;
    world.jumpBuffer = 0;
    events |= EVENT_JUMP;
  }
  if (!t.onGround) {
    t.vy += TURKEY.gravity * dt;
    t.y += t.vy * dt;
    if (t.y >= FIELD.groundY) {
      t.y = FIELD.groundY;
      t.vy = 0;
      t.onGround = true;
      events |= EVENT_LAND;
    }
  }
  if (t.invuln > 0) t.invuln -= dt;
  t.runPhase += dt * (world.scrollSpeed / 34);

  // --- the world scrolls; the farmer chases ---
  world.distancePx += world.scrollSpeed * dt;
  f.cleanTime += dt;
  if (f.cleanTime > 3 && f.gap < FARMER.startGap) {
    f.gap = Math.min(FARMER.startGap, f.gap + FARMER.recoverPerSecond * dt);
  }
  // Chicken-feed boost: while it lasts the turkey pulls away from the farmer.
  if (world.time < world.feedBoostUntil && f.gap < FARMER.startGap) {
    f.gap = Math.min(FARMER.startGap, f.gap + FEED_BOOST.gapPerSecond * dt);
  }
  if (f.gap < 70 && world.time > f.tauntUntil) {
    f.taunt = TAUNTS[Math.floor(world.random() * TAUNTS.length)];
    f.tauntUntil = world.time + 3.5;
    events |= EVENT_SPOTTED;
  }
  if (world.shake > 0) world.shake -= dt;
  if (world.flash > 0) world.flash -= dt;

  // --- spawns ---
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    spawnObstacle(world);
    const interval = SPAWN_INTERVAL[stage];
    world.spawnTimer = interval * (1 - SPAWN_JITTER / 2 + world.random() * SPAWN_JITTER);
  }
  world.pickupTimer -= dt;
  if (world.pickupTimer <= 0) {
    spawnPickup(world);
    world.pickupTimer = 1.6 + world.random() * 1.2;
  }

  // --- obstacles move and collide ---
  const rect = turkeyRect(world);
  for (let i = world.obstacles.length - 1; i >= 0; i -= 1) {
    const ob = world.obstacles[i];
    if (ob.kind === 'knifeThrown') {
      ob.x -= (world.scrollSpeed + ob.vx) * dt;
    } else if (ob.kind === 'knifeFalling' && !ob.stuck) {
      ob.x -= world.scrollSpeed * dt;
      ob.y += ob.vy * dt;
      if (ob.y + ob.height >= FIELD.groundY) {
        ob.y = FIELD.groundY - ob.height;
        ob.stuck = true;
      }
    } else {
      ob.x -= world.scrollSpeed * dt;
    }
    if (ob.x + ob.width < -60) {
      world.obstacles.splice(i, 1);
      continue;
    }
    if (t.invuln <= 0 && overlaps(rect, ob)) {
      const cost = ob.kind === 'puddle' ? OBSTACLES.puddle.stumbleCost : FARMER.hitCost;
      world.lastHitKind = ob.kind;
      f.gap -= cost;
      f.cleanTime = 0;
      t.invuln = TURKEY.invulnerable;
      world.shake = 0.35;
      world.flash = 0.25;
      events |= EVENT_HIT;
      world.obstacles.splice(i, 1);
      if (f.gap <= 0) {
        f.gap = 0;
        return finish(world, 'caught', events | EVENT_CAUGHT);
      }
    }
  }

  // --- pickups move and collect ---
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.x -= world.scrollSpeed * dt;
    if (pk.x + pk.width < -60) {
      world.pickups.splice(i, 1);
      continue;
    }
    if (!pk.taken && overlaps(rect, pk)) {
      pk.taken = true;
      world.pickups.splice(i, 1);
      if (pk.kind === 'corn') {
        world.bonus += POINTS.corn;
        f.gap = Math.min(FARMER.startGap, f.gap + FARMER.cornPush);
        events |= EVENT_CORN;
      } else if (pk.kind === 'feather') {
        world.bonus += POINTS.feather;
        f.gap = Math.min(FARMER.startGap, f.gap + FARMER.cornPush);
        events |= EVENT_FEATHER;
      } else if (pk.kind === 'feed') {
        world.bonus += POINTS.feed;
        f.gap = Math.min(FARMER.startGap, f.gap + FARMER.feedPush);
        world.feedBoostUntil = world.time + FEED_BOOST.seconds;
        events |= EVENT_FEED;
      } else {
        world.bonus += POINTS.goldenCorn;
        f.gap = Math.min(FARMER.startGap, f.gap + FARMER.cornPush * 2);
        events |= EVENT_GOLDEN;
      }
    }
  }

  // --- escape? ---
  if (distanceM(world) >= ESCAPE_DISTANCE_M) {
    return finish(world, 'escaped', events | EVENT_ESCAPED);
  }
  return events;
}

function finish(world, screen, events) {
  world.screen = screen;
  world.finalScore = score(world);
  world.finalDistanceM = Math.floor(distanceM(world));
  if (world.finalScore > world.best) {
    world.best = world.finalScore;
    try {
      window.localStorage.setItem(BEST_KEY, String(world.best));
    } catch {
      // Best score is a nicety; a blocked store must not break the game.
    }
  }
  return events;
}
