// The screenshot scenes behind ?shot=title|play|kitchen|escaped|caught.
// Each one plays the real rules forward from a fresh world for a fixed
// amount of time, steered by a simple autopilot (jump the next fence, duck
// the next thrown knife), so the frame is what a real game looks like and
// the same seed always gives the same frame.

import { FIELD, STEP, TURKEY_X, TURKEY } from './config.js';
import { stepWorld, resetWorld, distanceM } from './world.js';

const SAMPLE = STEP;
/** Seconds from jump start to the top of the jump (jumpVelocity / gravity). */
const TIME_TO_PEAK = TURKEY.jumpVelocity / TURKEY.gravity;
/** Seconds before impact at which the autopilot ducks a thrown knife. */
const DUCK_LEAD = 0.5;
/** How long the autopilot holds a duck. */
const DUCK_HOLD = 0.55;

/** Seconds until `ob` reaches the turkey, from its left edge. */
function timeToImpact(world, ob) {
  const speed = ob.kind === 'knifeThrown' ? world.scrollSpeed + ob.vx : world.scrollSpeed;
  const gap = ob.x - (TURKEY_X + 56);
  return gap / speed;
}

/**
 * The autopilot's move for this step: { jump, ducking }. It jumps the next
 * jumpable obstacle so the middle of the overlap meets the top of the jump,
 * and ducks the next thrown knife, preferring whichever arrives first. A
 * jump always wins over a duck: the turkey can jump out of a duck, but it
 * cannot duck out of a jump.
 */
export function autopilot(world, duckUntil) {
  const t = world.turkey;
  let jump = false;
  let duck = world.time < duckUntil;
  // The nearest threat of each kind, by time to impact.
  let jumpTime = Infinity;
  let jumpLead = 0;
  let knifeTime = Infinity;
  for (const ob of world.obstacles) {
    if (ob.x + ob.width < TURKEY_X) continue;
    const time = timeToImpact(world, ob);
    if (time < 0 || time > 0.9) continue;
    if (ob.kind === 'knifeThrown') {
      if (time < knifeTime) knifeTime = time;
    } else {
      if (time < jumpTime) {
        jumpTime = time;
        // Seconds the obstacle overlaps the turkey; jump so the overlap's
        // middle meets the jump's peak.
        const speed = world.scrollSpeed;
        const overlap = (ob.width + 56) / speed;
        jumpLead = TIME_TO_PEAK - overlap / 2;
      }
    }
  }
  if (jumpTime <= jumpLead && t.onGround) {
    jump = true;
    duck = false;
  } else if (knifeTime <= DUCK_LEAD && t.onGround && jumpTime > 0.7) {
    duck = true;
  }
  return { jump, ducking: duck };
}

/** Step the world with the autopilot until `stop(world)` is true. */
export function simulate(world, stop, maxSeconds) {
  let duckUntil = 0;
  const maxSteps = Math.floor(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    const move = autopilot(world, duckUntil);
    if (move.ducking && world.time >= duckUntil) duckUntil = world.time + DUCK_HOLD;
    stepWorld(world, { jump: move.jump, ducking: move.ducking });
    if (world.screen !== 'play') break;
    if (stop(world)) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw. Any unknown
 * name is the title. `seed` (default 1) makes the scene repeatable.
 */
export function stageShot(name, world, seed = 1) {
  resetWorld(world, seed);
  world.screen = 'play';
  if (name === 'title') {
    world.screen = 'title';
    world.time = 2.4;
    return 'title';
  }
  if (name === 'play') {
    simulate(world, () => distanceM(world) >= 55, 40);
    // Stage the farmer close behind the turkey: a gap of 110 px puts him
    // clearly in frame and chasing, a state the game reaches after one hit.
    world.farmer.gap = 110;
    // Wait for a dense moment: at least two obstacles and two pickups in
    // the frame ahead of the turkey, so the cover reads as a busy chase.
    if (world.screen === 'play') {
      let duckUntil = 0;
      const denseUntil = world.time + 10;
      while (world.screen === 'play' && world.time < denseUntil) {
        const obs = world.obstacles.filter((ob) => ob.x > 380 && ob.x < 1150).length;
        const pks = world.pickups.filter((pk) => pk.x > 380 && pk.x < 1150).length;
        if (obs >= 3 && pks >= 3) break;
        const move = autopilot(world, duckUntil);
        if (move.ducking && world.time >= duckUntil) duckUntil = world.time + DUCK_HOLD;
        stepWorld(world, { jump: move.jump, ducking: move.ducking });
        // Keep the farmer close while we wait for the dense moment.
        world.farmer.gap = Math.min(world.farmer.gap, 110);
      }
      // A golden corn in the jump path ahead, so the leap has something to grab.
      world.pickups.push({ kind: 'goldenCorn', x: TURKEY_X + 380, y: FIELD.groundY - 150, width: 30, height: 40, taken: false });
    }
    // Finish mid-jump over something if the turkey is still on the ground:
    // step forward until it leaves the ground, then a little further so it
    // is visibly high in the air, not just a pixel off the grass.
    if (world.screen === 'play' && world.turkey.onGround) {
      let duckUntil = 0;
      for (let i = 0; i < 5 / STEP && world.turkey.onGround && world.screen === 'play'; i += 1) {
        const move = autopilot(world, duckUntil);
        if (move.ducking && world.time >= duckUntil) duckUntil = world.time + DUCK_HOLD;
        stepWorld(world, { jump: move.jump, ducking: move.ducking });
      }
    }
    if (world.screen === 'play' && !world.turkey.onGround) {
      for (let i = 0; i < 12; i += 1) {
        stepWorld(world, { jump: false, ducking: false });
      }
    }
    // A thrown knife in the jump arc ahead, so the leap has a threat to
    // clear as well as a prize to grab. Placed after all stepping, so it
    // stays exactly here in the frozen frame.
    if (world.screen === 'play') {
      world.obstacles.push({ kind: 'knifeThrown', width: 54, height: 16, x: TURKEY_X + 380, y: FIELD.groundY - 140, vx: 220, vy: 0, stuck: false, counted: false });
    }
    // Re-clamp the gap: corn collected during the jump finish pushes the
    // farmer back, which would undo the close-chase staging above. 60 px
    // puts the gap meter in the red (< 0.32 of the 220 start gap) and the
    // farmer in his reaching pose, a state the game reaches after two hits.
    // The taunt bubble is suppressed so the frame stays clean.
    world.farmer.gap = 60;
    world.farmer.tauntUntil = 0;
    return world.screen;
  }
  if (name === 'kitchen') {
    simulate(world, () => distanceM(world) >= 880, 240);
    // Stage the farmer close behind the turkey.
    world.farmer.gap = 110;
    // Keep playing until the frame shows what makes the kitchen the
    // kitchen: preferably an oven to jump, with at least one corn pickup
    // in the frame; a thrown knife the turkey ducks under, or a falling
    // knife, is the fallback after 12 s without an oven moment.
    if (world.screen === 'play') {
      let duckUntil = 0;
      const waitStart = world.time;
      for (let i = 0; i < 20 / STEP && world.screen === 'play'; i += 1) {
        const hasOven = world.obstacles.some((ob) => ob.kind === 'oven' && ob.x > 380 && ob.x < 1200);
        const hasKnife = world.obstacles.some((ob) => ob.kind === 'knifeThrown' && ob.x > 380 && ob.x < 950) && world.turkey.ducking;
        const hasFalling = world.obstacles.some((ob) => ob.kind === 'knifeFalling' && ob.x > 400 && ob.x < 1100);
        const cornCount = world.pickups.filter((pk) => pk.x > 380 && pk.x < 1150).length;
        if (hasOven && cornCount >= 1) break;
        if ((hasKnife || hasFalling) && cornCount >= 2 && world.time - waitStart > 12) break;
        const move = autopilot(world, duckUntil);
        if (move.ducking && world.time >= duckUntil) duckUntil = world.time + DUCK_HOLD;
        stepWorld(world, { jump: move.jump, ducking: move.ducking });
        world.farmer.gap = Math.min(world.farmer.gap, 110);
      }
      // Finish mid-jump, like the cover: step until the turkey leaves the
      // ground, then a little further so it is visibly high in the air.
      if (world.screen === 'play' && world.turkey.onGround) {
        let duckUntil = 0;
        for (let i = 0; i < 3 / STEP && world.turkey.onGround && world.screen === 'play'; i += 1) {
          const move = autopilot(world, duckUntil);
          if (move.ducking && world.time >= duckUntil) duckUntil = world.time + DUCK_HOLD;
          stepWorld(world, { jump: move.jump, ducking: move.ducking });
        }
      }
      if (world.screen === 'play' && !world.turkey.onGround) {
        for (let i = 0; i < 8; i += 1) {
          stepWorld(world, { jump: false, ducking: false });
        }
      }
      world.farmer.gap = 110;
    }
    return world.screen;
  }
  if (name === 'escaped') {
    simulate(world, () => distanceM(world) >= 1200, 300);
    return world.screen;
  }
  if (name === 'caught') {
    // A hurried player: jump late and never duck, so the farmer catches up.
    let steps = 0;
    while (world.screen === 'play' && steps < 600 / STEP) {
      let jump = false;
      for (const ob of world.obstacles) {
        if (ob.x + ob.width < TURKEY_X) continue;
        const time = timeToImpact(world, ob);
        if (ob.kind !== 'knifeThrown' && time <= 0.12 && world.turkey.onGround) jump = true;
      }
      stepWorld(world, { jump, ducking: false });
      steps += 1;
    }
    return world.screen;
  }
  world.screen = 'title';
  return 'title';
}
