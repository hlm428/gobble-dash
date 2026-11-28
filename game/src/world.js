// Gobble Dash — the game state and its rules. The turkey auto-runs right
// while the world scrolls left; the farmer chases from behind and closes in
// on every stumble; corn pushes him back. Reach the forest gate at
// ESCAPE_DISTANCE_M to escape; if the farmer's gap closes to zero, the
// turkey is caught. A fixed 60 Hz step keeps every run deterministic for a
// given seed.

import {
  FIELD, STEP, TURKEY_X, TURKEY, FARMER, FEED_BOOST, ESCAPE_DISTANCE_M, PX_PER_M,
  POINTS, STAGES, OBSTACLES, BEST_KEY,
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
    /** distancePx at which the next pattern chunk spawns. */
    nextChunkDist: 300,
    /** Running id for pickups, so tests can track each one once. */
    pickupSeq: 0,
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

// --- Pattern-based level generation (天天酷跑 style) ---
// The course is built from short patterns ("chunks"), not two independent
// random timers. Every chunk places its obstacles and its coins together,
// so the coins always sit where the move that clears the chunk takes the
// turkey: a coin parabola over each jump, a coin line on safe ground, coins
// under a knife to reward the duck. Chunks are spaced by a deliberate gap
// of empty road, so the rhythm is action, breather, action — never a random
// pile-up, never a dead stretch. Difficulty comes from closer chunk gaps
// and double jumps, not from random spacing.

/** Place one pickup, centred `heightAboveGround` px above the ground. */
function addPickup(world, x, kind, heightAboveGround) {
  const y = heightAboveGround <= 0
    ? FIELD.groundY - 46
    : FIELD.groundY - heightAboveGround - 20;
  world.pickupSeq += 1;
  world.pickups.push({ id: world.pickupSeq, kind, x, y, width: 30, height: 40, taken: false });
}

/**
 * A coin parabola over a jump: 5 coins on the jump arc, peak over the
 * obstacle centre. The turkey collects coins on the way up AND on the way
 * down, so a full jump never comes back empty. `peakKind` replaces the
 * peak coin (e.g. a feed bag for the big escape tool). The arc is kept
 * narrow (half-width 120) so its ends stay near the obstacle instead of
 * floating far past it. `peak` lowers the whole arc for the feed jump,
 * so the feed bag sits below the absolute jump apex and is actually
 * reachable instead of demanding a pixel-perfect apex.
 */
function addJumpArc(world, centreX, peakKind = 'corn', peak = 228) {
  const halfWidth = 120;
  const offsets = [-120, -60, 0, 60, 120];
  for (const dx of offsets) {
    const h = peak * (1 - (dx / halfWidth) * (dx / halfWidth));
    const kind = dx === 0 && peakKind !== 'corn' ? peakKind : 'corn';
    addPickup(world, centreX + dx - 15, kind, Math.max(0, h));
  }
}

function addObstacle(world, kind, x) {
  const spec = OBSTACLES[kind];
  const obstacle = { kind, width: spec.width, height: spec.height, x, y: FIELD.groundY - spec.height, vy: 0, stuck: false, counted: false };
  if (kind === 'knifeThrown') {
    // Flies in from the kitchen ahead, at head height.
    obstacle.y = FIELD.groundY - 58;
    obstacle.vx = spec.flySpeed;
  } else if (kind === 'knifeFalling') {
    // Drops from above ahead, then sticks in the ground as a jump-over spike.
    obstacle.y = -80;
    obstacle.vy = spec.fallSpeed;
  }
  world.obstacles.push(obstacle);
  return obstacle;
}

/** Pick a jump-over obstacle for this stage; `avoidTall` keeps a double jump fair. */
function pickJumpObstacle(world, stage, avoidTall) {
  const choices = [];
  for (const [kind, spec] of Object.entries(OBSTACLES)) {
    if (spec.dodge !== 'jump') continue;
    if (spec.kitchenOnly && stage < 2) continue;
    if (spec.farmOnly && stage >= 2) continue;
    if (avoidTall && (kind === 'crate' || kind === 'oven')) continue;
    choices.push([kind, spec.weight]);
  }
  return pickWeighted(world.random, choices);
}

/**
 * Spawn one pattern chunk at the right edge. Returns the chunk's width in
 * px, so the caller can leave a deliberate gap of empty road after it.
 */
function spawnChunk(world) {
  const metres = distanceM(world);
  const stage = stageFor(metres);
  const random = world.random;
  const x0 = FIELD.width + 40;
  const table = [
    ['groundLine', 3],
    ['singleJump', 4],
    ['highLine', 2],
  ];
  if (stage >= 1) table.push(['doubleJump', 3], ['feedJump', 2]);
  if (stage >= 2) table.push(['knifeDuck', 2]);
  const pattern = pickWeighted(random, table);
  let width = 0;

  if (pattern === 'groundLine') {
    // Breather: a line of corn on safe ground, nothing to dodge. Raised
    // 55 px so it clears the farmyard fence rails instead of being
    // pierced by them.
    for (let i = 0; i < 3; i += 1) addPickup(world, x0 + i * 64, 'corn', 55);
    width = 290;
  } else if (pattern === 'singleJump') {
    // One obstacle with a coin parabola over it: jump it, eat the arc.
    const kind = pickJumpObstacle(world, stage, false);
    const ob = addObstacle(world, kind, x0 + 180);
    addJumpArc(world, ob.x + ob.width / 2);
    width = 355 + ob.width / 2;
  } else if (pattern === 'doubleJump') {
    // Two obstacles close together: land from the first jump and jump again
    // at once. The second is never tall if the first one is.
    const kind1 = pickJumpObstacle(world, stage, false);
    const tall1 = kind1 === 'crate' || kind1 === 'oven';
    const kind2 = pickJumpObstacle(world, stage, tall1);
    const ob1 = addObstacle(world, kind1, x0 + 150);
    addJumpArc(world, ob1.x + ob1.width / 2);
    const ob2 = addObstacle(world, kind2, x0 + 450);
    addJumpArc(world, ob2.x + ob2.width / 2);
    width = 625 + ob2.width / 2;
  } else if (pattern === 'highLine') {
    // A line of coins at jump height: one jump grabs them all.
    for (let i = 0; i < 3; i += 1) addPickup(world, x0 + i * 80, 'corn', 180);
    if (random() < 0.4) addPickup(world, x0 + 120, 'feather', 220);
    width = 270;
  } else if (pattern === 'feedJump') {
    // A jump with a chicken-feed bag at the peak: the big escape tool.
    // The whole arc peaks at 190 (below the 228 jump apex) so the bag is
    // reachable on the way up and down, not only at a perfect apex.
    const kind = pickJumpObstacle(world, stage, false);
    const ob = addObstacle(world, kind, x0 + 180);
    addJumpArc(world, ob.x + ob.width / 2, 'feed', 190);
    width = 355 + ob.width / 2;
  } else {
    // knifeDuck (kitchen only): a thrown knife at head height, corn on the
    // ground underneath — duck to collect, standing up costs a hit.
    // Corn raised 55 px so it clears the farmyard fence rails.
    addObstacle(world, 'knifeThrown', x0 + 200);
    for (let i = 0; i < 2; i += 1) addPickup(world, x0 + 160 + i * 64, 'corn', 55);
    width = 374;
  }
  return width;
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

  // --- spawns: one pattern chunk at a time, then a breather gap ---
  if (world.distancePx >= world.nextChunkDist) {
    const width = spawnChunk(world);
    const gap = (stage === 0 ? 160 : stage === 1 ? 130 : 100) + world.random() * 120;
    world.nextChunkDist = world.distancePx + width + gap;
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
