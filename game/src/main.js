// Gobble Dash — boot, the fixed-step loop and the screen state machine.
// Title -> play -> pause -> play; play -> caught or escaped; either end
// restarts into a fresh run. ?shot=title|play|kitchen|escaped|caught stages
// one deterministic scene for a screenshot instead of starting the game.

import { FIELD, STEP, STAGES } from './config.js';
import { createWorld, resetWorld, stepWorld, distanceM, score, EVENT_JUMP, EVENT_LAND, EVENT_CORN, EVENT_FEATHER, EVENT_GOLDEN, EVENT_FEED, EVENT_HIT, EVENT_STAGE, EVENT_ESCAPED, EVENT_CAUGHT, EVENT_SPOTTED } from './world.js';
import { render, currentButtons } from './render.js';
import { createInput, ACTION_JUMP, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const world = createWorld((Date.now() % 2147483647) | 1);
const input = createInput(canvas);
const audio = createAudio();

function fitCanvas() {
  const logicalW = FIELD.width;   // 1280
  const logicalH = FIELD.height;  // 720
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const winAspect = winW / winH;
  const gameAspect = logicalW / logicalH;   // ≈ 1.777

  let scale, cssW, cssH;

  if (winAspect < gameAspect * 0.92) {
    // Tall phone: crop a little top/bottom so the ground + characters stay large
    scale = winW / logicalW;
    cssW = winW;
    cssH = Math.floor(logicalH * scale);
  } else {
    // Normal / wide: classic letterbox
    scale = Math.min(winW / logicalW, winH / logicalH);
    cssW = Math.floor(logicalW * scale);
    cssH = Math.floor(logicalH * scale);
  }

  canvas.style.width  = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

/** Paint the page background with the current stage's sky, so the letterbox
 *  bars on tall/narrow screens blend with the scene instead of looking like
 *  empty chrome. Cached by stage index; cheap to call every frame. */
let lastBgStage = -1;
function updatePageBackground(world) {
  if (world.stageIndex === lastBgStage) return;
  lastBgStage = world.stageIndex;
  const stage = STAGES[world.stageIndex] || STAGES[0];
  document.documentElement.style.setProperty('--stage-sky', stage.skyTop || stage.sky);
}
updatePageBackground(world);

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function playEvents(events) {
  if (events & EVENT_JUMP) audio.jump();
  if (events & EVENT_LAND) audio.land();
  if (events & EVENT_CORN) audio.corn();
  if (events & EVENT_FEATHER) audio.feather();
  if (events & EVENT_GOLDEN) audio.golden();
  if (events & EVENT_FEED) audio.feed();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_SPOTTED) audio.spotted();
  if (events & EVENT_STAGE) audio.stage();
  if (events & EVENT_ESCAPED) audio.escape();
  if (events & EVENT_CAUGHT) audio.caught();
}

/** The button under the pointer, if any. */
function buttonAt(x, y) {
  for (const b of currentButtons()) {
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return b;
  }
  return null;
}

function startRun() {
  audio.unlock();
  resetWorld(world, (Date.now() % 2147483647) | 1);
  world.screen = 'play';
  announce('Running! Jump the fences, duck the knives, reach the forest.');
}

function toggleMute() {
  audio.setMuted(!audio.isMuted());
  world.muted = audio.isMuted();
}

function handleActions(actions) {
  if (actions & ACTION_MUTE) toggleMute();
  const click = input.takeClick();
  const pressed = click ? buttonAt(click.x, click.y) : null;
  if (world.screen === 'title') {
    if (pressed && pressed.id === 'start') startRun();
    else if (actions & (ACTION_CONFIRM | ACTION_JUMP)) startRun();
  } else if (world.screen === 'play') {
    if (pressed && pressed.id === 'pause') {
      world.screen = 'pause';
      announce('Paused.');
    } else if (pressed && pressed.id === 'mute') {
      toggleMute();
    } else if (actions & ACTION_PAUSE) {
      world.screen = 'pause';
      announce('Paused.');
    }
  } else if (world.screen === 'pause') {
    if (pressed && pressed.id === 'resume') world.screen = 'play';
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM | ACTION_JUMP)) world.screen = 'play';
  } else if (world.screen === 'caught' || world.screen === 'escaped') {
    if (pressed && pressed.id === 'restart') startRun();
    else if (actions & (ACTION_CONFIRM | ACTION_JUMP)) startRun();
  }
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    const actions = input.takeActions();
    if (actions) audio.unlock();
    handleActions(actions);
    if (world.screen === 'play') {
      const jump = Boolean(actions & ACTION_JUMP);
      const events = stepWorld(world, { jump, ducking: input.isDucking() });
      playEvents(events);
      if (world.screen === 'caught') announce(`Caught at ${world.finalDistanceM} metres. Score ${world.finalScore}. Press R to run again.`);
      if (world.screen === 'escaped') announce(`Escaped! Score ${world.finalScore}. Press R to run again.`);
    } else if (world.screen === 'title') {
      world.time += STEP;
    }
  }
  render(ctx, world);
  updatePageBackground(world);
  requestAnimationFrame(frame);
}

// A screenshot scene: stage it once and draw it; no loop, no interaction.
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seed = Number(params.get('seed') ?? 1) || 1;
  stageShot(shot, world, seed);
  updatePageBackground(world);
  render(ctx, world);
  document.title = `Gobble Dash — shot ${shot}`;
} else {
  requestAnimationFrame(frame);
}

// For play-testing from a script: the world, its score and distance.
window.__gobble = { world, distanceM: () => distanceM(world), score: () => score(world), startRun, buttons: () => currentButtons(), pointer: () => input.pointerPosition() };
