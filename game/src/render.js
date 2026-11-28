// Gobble Dash — every pixel the game shows, drawn on one canvas. The
// scenery changes with the stage (farmyard, barn, kitchen); the turkey and
// the farmer are drawn from circles, ellipses and arcs — no image files.
// render() also returns the clickable buttons on screen, so main.js can
// hit-test a pointer press against them.
//
// Redraw (Angry-Birds-inspired, all art original): a bright saturated sky,
// chunky cartoon shapes with thick dark-brown outlines, expressive faces
// with big eyes and determined brows, and a cheerful farm look in the
// Hay Day spirit — red barn, white picket fence, rolling green hills.
// Only the drawing changed; the game itself is untouched.

import { FIELD, TURKEY_X, TURKEY, FARMER, STAGES, ESCAPE_DISTANCE_M, PX_PER_M, PALETTE, FONT } from './config.js';
import { distanceM, score } from './world.js';

const W = FIELD.width;
const H = FIELD.height;
const GROUND = FIELD.groundY;

/** The thick dark-brown outline used on almost every shape. */
const OUT = '#4a2c12';

let buttons = [];

export function currentButtons() {
  return buttons;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Fill an ellipse and give it the chunky outline. */
function ball(ctx, x, y, rx, ry, fill, lw = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** Big display text with a dark outline, cartoon-poster style. */
function textOutlined(ctx, str, x, y, size, fill, align = 'center', weight = '800', lw = 7) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

/** A thick line with a dark outline under it (limbs, cords, straw). */
function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = width + 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function button(ctx, id, x, y, w, h, label, size = 26) {
  ctx.fillStyle = '#ffc800';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Glossy top edge.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  rr(ctx, x + 5, y + 4, w - 10, 10, 5);
  ctx.fill();
  text(ctx, label, x + w / 2, y + h / 2 + 1, size, '#4a2c05');
  buttons.push({ id, x, y, width: w, height: h, label });
}

/** One puffy cloud: three white puffs over a soft blue shade. */
function cloud(ctx, x, y, s) {
  ctx.fillStyle = '#d6eeff';
  ellipse(ctx, x, y + 9 * s, 54 * s, 20 * s);
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, x - 34 * s, y + 4 * s, 30 * s, 18 * s);
  ellipse(ctx, x, y - 6 * s, 38 * s, 24 * s);
  ellipse(ctx, x + 36 * s, y + 4 * s, 30 * s, 18 * s);
}

function drawSun(ctx, x, y) {
  ctx.fillStyle = '#ffdf4d';
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-8, -52);
    ctx.lineTo(8, -52);
    ctx.lineTo(0, -74);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255, 223, 77, 0.35)';
  ellipse(ctx, x, y, 70, 70);
  ball(ctx, x, y, 44, 44, '#ffdf4d', 3);
}

function drawSky(ctx, world, time) {
  const stage = STAGES[world.stageIndex];
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND);
  grad.addColorStop(0, stage.skyTop);
  grad.addColorStop(1, stage.sky);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND);
  if (world.stageIndex === 2) return; // The kitchen is indoors: no sun, no clouds.
  drawSun(ctx, 1120, 96);
  // Drifting clouds.
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 340 + time * 12) % (W + 260)) - 130;
    const cy = 70 + i * 42;
    cloud(ctx, cx, cy, 1);
  }
  // A few tiny birds drifting far away.
  ctx.strokeStyle = 'rgba(74, 44, 18, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const bx = ((i * 430 + time * 20 + 200) % (W + 200)) - 100;
    const by = 150 + i * 55;
    const flap = Math.sin(time * 6 + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(bx - 10, by);
    ctx.quadraticCurveTo(bx - 4, by - 6 - flap, bx, by);
    ctx.quadraticCurveTo(bx + 4, by - 6 - flap, bx + 10, by);
    ctx.stroke();
  }
}

/** One rolling hill silhouette. */
function hill(ctx, offset, factor, base, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 40) {
    const h = Math.sin((x + offset * factor) / 260) * 26 + Math.sin((x + offset * factor * 0.5) / 130) * 14;
    ctx.lineTo(x, GROUND - base - h);
  }
  ctx.lineTo(W, GROUND);
  ctx.closePath();
  ctx.fill();
}

/** A little three-blade grass tuft. */
function tuft(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x - 8, y - 10);
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 12);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 8, y - 10);
  ctx.stroke();
}

/** A tiny five-petal flower. */
function flower(ctx, x, y) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    ellipse(ctx, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 2.6);
  }
  ctx.fillStyle = '#ffd93b';
  ellipse(ctx, x, y, 2.6, 2.6);
}

function drawScenery(ctx, world) {
  const stage = STAGES[world.stageIndex];
  const offset = world.distancePx;
  if (world.stageIndex === 1) {
    // Barn interior: warm plank walls, a top beam, hanging lanterns.
    ctx.fillStyle = stage.sky;
    ctx.fillRect(0, 0, W, GROUND);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 3, GROUND);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    for (let x = 46; x < W; x += 90) ctx.fillRect(x, 0, 3, GROUND);
    ctx.fillStyle = stage.groundDark;
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, W, 5);
    for (let x = 90 - (offset % 220); x < W; x += 220) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 34);
      ctx.lineTo(x, 96);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 179, 71, 0.30)';
      ellipse(ctx, x, 122, 36, 42);
      ball(ctx, x, 122, 16, 20, '#ffb347', 3);
      ctx.fillStyle = '#fff3c4';
      ellipse(ctx, x - 4, 118, 6, 8);
    }
  } else if (world.stageIndex === 2) {
    // Kitchen: cream tiled wall, hanging pots, a window onto the farm.
    ctx.fillStyle = stage.sky;
    ctx.fillRect(0, 0, W, GROUND);
    ctx.strokeStyle = 'rgba(122, 74, 38, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < GROUND; y += 56) {
      for (let x = (y % 112 === 0 ? 0 : 56) - (offset % 112); x < W; x += 112) {
        ctx.strokeRect(x, y, 104, 48);
      }
    }
    for (let i = 0; i < 3; i += 1) {
      const px = 240 + i * 380 - ((offset * 0.4) % 380);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, 74);
      ctx.stroke();
      ball(ctx, px, 108, 34, 26, '#3f4a55', 3);
      ctx.fillStyle = '#2c353d';
      ellipse(ctx, px, 96, 30, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ellipse(ctx, px - 12, 100, 10, 6);
    }
    // Window: frame first, then a little farm scene clipped inside it.
    ctx.fillStyle = '#fff6e8';
    rr(ctx, 980, 60, 170, 130, 10);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    rr(ctx, 990, 70, 150, 110, 8);
    ctx.clip();
    ctx.fillStyle = '#8fd4f7';
    ctx.fillRect(990, 70, 150, 110);
    ball(ctx, 1115, 95, 14, 14, '#ffdf4d', 2);
    ctx.fillStyle = '#7bc043';
    ellipse(ctx, 1065, 200, 100, 46);
    ctx.fillStyle = '#5e9b2e';
    ellipse(ctx, 1000, 205, 70, 40);
    ctx.restore();
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(1058, 60, 10, 130);
    ctx.fillRect(980, 118, 170, 10);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.strokeRect(1058, 60, 10, 130);
    ctx.strokeRect(980, 118, 170, 10);
  } else {
    // Farmyard: rolling green hills, a red barn, a white picket fence.
    hill(ctx, offset, 0.10, 90, '#9bd84a');
    hill(ctx, offset, 0.22, 55, stage.groundDark);
    const bx = W - 260 - ((offset * 0.3) % (W + 500));
    ctx.fillStyle = '#e4572e';
    ctx.fillRect(bx, GROUND - 150, 150, 110);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, GROUND - 150, 150, 110);
    ctx.beginPath();
    ctx.moveTo(bx - 14, GROUND - 150);
    ctx.lineTo(bx + 75, GROUND - 198);
    ctx.lineTo(bx + 164, GROUND - 150);
    ctx.closePath();
    ctx.fillStyle = '#7a3b1e';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(bx + 58, GROUND - 96, 34, 56);
    ctx.strokeRect(bx + 58, GROUND - 96, 34, 56);
    ctx.beginPath();
    ctx.moveTo(bx + 58, GROUND - 96);
    ctx.lineTo(bx + 92, GROUND - 40);
    ctx.moveTo(bx + 92, GROUND - 96);
    ctx.lineTo(bx + 58, GROUND - 40);
    ctx.stroke();
    // White picket fence.
    for (let x = 30 - (offset % 90); x < W; x += 90) {
      ctx.fillStyle = '#fff6e8';
      ctx.beginPath();
      ctx.moveTo(x, GROUND - 52);
      ctx.lineTo(x + 5, GROUND - 60);
      ctx.lineTo(x + 10, GROUND - 52);
      ctx.lineTo(x + 10, GROUND);
      ctx.lineTo(x, GROUND);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(0, GROUND - 34, W, 7);
    ctx.fillRect(0, GROUND - 18, W, 7);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, GROUND - 34, W, 7);
    ctx.strokeRect(0, GROUND - 18, W, 7);
  }
  // Ground.
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = stage.groundDark;
  ctx.fillRect(0, GROUND, W, 8);
  // Scrolling ground detail, per stage.
  if (world.stageIndex === 0) {
    for (let x = 40 - (offset % 80); x < W; x += 80) {
      tuft(ctx, x, GROUND + 30, stage.groundDark);
      tuft(ctx, x + 40, GROUND + 62, stage.groundDark);
    }
    for (let x = 70 - (offset % 240); x < W; x += 240) flower(ctx, x, GROUND + 46);
  } else if (world.stageIndex === 1) {
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let x = 60 - (offset % 120); x < W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 30);
      ctx.lineTo(x + 16, GROUND + 24);
      ctx.moveTo(x + 4, GROUND + 40);
      ctx.lineTo(x + 20, GROUND + 34);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = GROUND + 24; y < H; y += 30) ctx.fillRect(0, y, W, 3);
  }
}

function drawCorn(ctx, pk, time) {
  const bob = Math.sin(time * 4 + pk.x * 0.05) * 3;
  ctx.save();
  ctx.translate(pk.x + 15, pk.y + 20 + bob);
  if (pk.kind === 'goldenCorn') {
    ctx.fillStyle = 'rgba(255, 217, 77, 0.4)';
    ellipse(ctx, 0, 0, 26, 30);
  }
  ball(ctx, 0, 0, 11, 17, pk.kind === 'goldenCorn' ? PALETTE.gold : PALETTE.corn, 2.5);
  ctx.fillStyle = '#e8a800';
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      ellipse(ctx, i * 6, j * 8, 1.6, 2.2);
    }
  }
  ctx.fillStyle = PALETTE.cornHusk;
  ctx.beginPath();
  ctx.moveTo(-11, 8);
  ctx.lineTo(-20, 24);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 8);
  ctx.lineTo(20, 24);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFeather(ctx, pk, time) {
  const bob = Math.sin(time * 3 + pk.x * 0.04) * 4;
  ctx.save();
  ctx.translate(pk.x + 15, pk.y + 20 + bob);
  ctx.rotate(Math.sin(time * 2) * 0.2);
  ball(ctx, 0, 0, 8, 18, PALETTE.feather, 2);
  ctx.strokeStyle = '#c9c2b2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.restore();
}

function drawFeed(ctx, pk, time) {
  const bob = Math.sin(time * 4 + pk.x * 0.05) * 3;
  ctx.save();
  ctx.translate(pk.x + 15, pk.y + 20 + bob);
  // Strong glow: feed is the rare, valuable pickup.
  ctx.fillStyle = 'rgba(255, 180, 60, 0.5)';
  ellipse(ctx, 0, 0, 30, 34);
  // Burlap sack.
  ctx.fillStyle = '#d9a05b';
  rr(ctx, -14, -12, 28, 32, 6);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Tied top.
  ctx.fillStyle = '#b07a35';
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(0, -22);
  ctx.lineTo(10, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Grain dots.
  ctx.fillStyle = '#8a5a1e';
  ellipse(ctx, -6, 2, 2, 2.6);
  ellipse(ctx, 5, 6, 2, 2.6);
  ellipse(ctx, 0, -4, 2, 2.6);
  text(ctx, 'FEED', 0, 14, 9, '#5e3d0f', 'center', '800');
  ctx.restore();
}

function drawObstacle(ctx, ob) {
  const { x, y, width, height } = ob;
  if (ob.kind === 'fence') {
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(x, y + 8, width, height - 8);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + 8, width, height - 8);
    ctx.fillStyle = '#e8b878';
    ctx.fillRect(x - 8, y + 18, width + 16, 9);
    ctx.fillRect(x - 8, y + 48, width + 16, 9);
    ctx.strokeRect(x - 8, y + 18, width + 16, 9);
    ctx.strokeRect(x - 8, y + 48, width + 16, 9);
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 8);
    ctx.lineTo(x + 8, y - 4);
    ctx.lineTo(x + 14, y + 8);
    ctx.closePath();
    ctx.fillStyle = '#e8b878';
    ctx.fill();
    ctx.stroke();
  } else if (ob.kind === 'hay') {
    ball(ctx, x + width / 2, y + height / 2, width / 2, height / 2, '#f2b705', 4);
    ctx.strokeStyle = '#d99a00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2 - 11, height / 2 - 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2 - 22, height / 2 - 21, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 24, y + height / 2 - 14);
    ctx.lineTo(x + width / 2 - 12, y + height / 2 - 20);
    ctx.moveTo(x + width / 2 + 10, y + height / 2 + 16);
    ctx.lineTo(x + width / 2 + 22, y + height / 2 + 10);
    ctx.stroke();
  } else if (ob.kind === 'crate') {
    ctx.fillStyle = '#c98a4b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    ctx.strokeStyle = 'rgba(74, 44, 18, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height / 3);
    ctx.lineTo(x + width, y + height / 3);
    ctx.moveTo(x, y + (2 * height) / 3);
    ctx.lineTo(x + width, y + (2 * height) / 3);
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + width - 4, y + height - 4);
    ctx.moveTo(x + width - 4, y + 4);
    ctx.lineTo(x + 4, y + height - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x + 3, y + 3, width - 6, 8);
  } else if (ob.kind === 'puddle') {
    ball(ctx, x + width / 2, y + height / 2, width / 2, height / 2 + 4, '#5fa8d3', 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ellipse(ctx, x + width / 2 - 16, y + height / 2 - 2, 20, 4);
  } else if (ob.kind === 'oven') {
    ctx.fillStyle = '#3e4a56';
    rr(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ff7a2f';
    rr(ctx, x + 16, y + 24, width - 32, height - 60, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd93b';
    rr(ctx, x + 26, y + 36, width - 52, height - 84, 6);
    ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 12, y + height - 30);
    ctx.lineTo(x + width / 2, y + height - 48);
    ctx.lineTo(x + width / 2 + 12, y + height - 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2c353d';
    ctx.fillRect(x + 12, y + height - 26, width - 24, 8);
    for (let i = 0; i < 3; i += 1) ball(ctx, x + 30 + i * 34, y + height - 14, 8, 5, '#e8e2d5', 2);
    textOutlined(ctx, 'HOT', x + width / 2, y - 14, 18, '#ff6b5e', 'center', '800', 5);
  } else if (ob.kind === 'knifeThrown' || ob.kind === 'knifeFalling') {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    if (ob.kind === 'knifeFalling' && !ob.stuck) ctx.rotate(0.5);
    else if (ob.kind === 'knifeThrown') ctx.rotate(0.15);
    ctx.beginPath();
    ctx.moveTo(-width / 2, -6);
    ctx.lineTo(width / 2 - 14, -6);
    ctx.lineTo(width / 2, 0);
    ctx.lineTo(width / 2 - 14, 6);
    ctx.lineTo(-width / 2, 6);
    ctx.closePath();
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 6, -2);
    ctx.lineTo(width / 2 - 18, -2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.knifeHandle;
    ctx.fillRect(-width / 2 - 12, -7, 14, 14);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.strokeRect(-width / 2 - 12, -7, 14, 14);
    ctx.restore();
  }
}

function drawTurkey(ctx, world) {
  const t = world.turkey;
  const ducking = t.ducking;
  const height = ducking ? TURKEY.duckHeight : TURKEY.height;
  const feetY = t.y;
  const bodyY = feetY - height / 2 - (t.onGround ? 0 : 6);
  const squash = t.onGround ? 1 + Math.sin(t.runPhase * 2) * 0.03 : 1;
  const blink = t.invuln > 0 && Math.floor(world.time * 12) % 2 === 0;
  // Soft ground shadow: stays on the grass, shrinks as the turkey climbs.
  const airH = Math.max(0, GROUND - feetY);
  const shScale = Math.max(0.5, 1 - airH / 420);
  ctx.fillStyle = `rgba(30, 60, 10, ${0.22 * shScale})`;
  ellipse(ctx, TURKEY_X + TURKEY.width / 2, GROUND + 10, 36 * shScale, 7);
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  ctx.translate(TURKEY_X + TURKEY.width / 2, bodyY);
  ctx.scale(1, squash);
  // Tail fan: five plump feathers, red-orange-gold.
  const tailColors = PALETTE.tail;
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.rotate(i * 0.30 - 0.45);
    ball(ctx, -28, -4, 24, 11, tailColors[i + 2], 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ellipse(ctx, -28, -7, 16, 5);
    ctx.restore();
  }
  // Body: plump chestnut with a thick outline, cream belly.
  ball(ctx, 0, 0, 30, ducking ? 17 : 24, PALETTE.turkeyBody, 3.5);
  ctx.fillStyle = PALETTE.turkeyLight;
  ellipse(ctx, 7, 7, 18, 12);
  // Wing: darker, flapping, with two feather lines.
  ctx.save();
  ctx.translate(-4, -2);
  ctx.rotate(t.onGround ? Math.sin(t.runPhase) * 0.3 : -0.8);
  ball(ctx, 0, 0, 16, 10, PALETTE.turkeyDark, 3);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -3);
  ctx.lineTo(10, -3);
  ctx.moveTo(-11, 3);
  ctx.lineTo(9, 3);
  ctx.stroke();
  ctx.restore();
  // Head.
  const headY = ducking ? -8 : -26;
  ball(ctx, 24, headY, 13, 12, PALETTE.head, 3);
  // Big expressive eye.
  ball(ctx, 27, headY - 3, 6, 6, '#ffffff', 2);
  ctx.fillStyle = '#1c2733';
  ellipse(ctx, 28.5, headY - 3, 3, 3);
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, 30, headY - 5, 1.4, 1.4);
  // Determined brow, angled down toward the beak.
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(20, headY - 11);
  ctx.lineTo(31, headY - 8);
  ctx.stroke();
  // Beak.
  ctx.beginPath();
  ctx.moveTo(34, headY - 2);
  ctx.lineTo(49, headY + 2);
  ctx.lineTo(34, headY + 6);
  ctx.closePath();
  ctx.fillStyle = PALETTE.beak;
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // Wattle.
  ball(ctx, 30, headY + 12, 5, 8, PALETTE.wattle, 2);
  // Legs (running).
  if (t.onGround) {
    const swing = Math.sin(t.runPhase) * 10;
    limb(ctx, -8, 20, -8 + swing, feetY - bodyY - 2, 4, '#ff9f1c');
    limb(ctx, 8, 20, 8 - swing, feetY - bodyY - 2, 4, '#ff9f1c');
  } else {
    limb(ctx, -8, 20, -12, feetY - bodyY + 2, 4, '#ff9f1c');
    limb(ctx, 8, 20, 12, feetY - bodyY + 2, 4, '#ff9f1c');
  }
  ctx.restore();
}

function drawFarmer(ctx, world) {
  const gap = world.farmer.gap;
  const x = TURKEY_X - gap - 30;
  if (x < -90) return;
  const bob = Math.abs(Math.sin(world.time * 9)) * 6;
  const reaching = gap < 70;
  ctx.fillStyle = 'rgba(30, 60, 10, 0.2)';
  ellipse(ctx, x, GROUND + 10, 30, 6);
  ctx.save();
  ctx.translate(x, GROUND - bob);
  // Legs.
  const swing = Math.sin(world.time * 9) * 12;
  limb(ctx, -6, -52, -6 + swing, 0, 7, '#2c3e55');
  limb(ctx, 6, -52, 6 - swing, 0, 7, '#2c3e55');
  // Body: red shirt + blue overalls, thick outline.
  ctx.fillStyle = PALETTE.farmerShirt;
  rr(ctx, -18, -108, 36, 58, 10);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = PALETTE.farmerOveralls;
  rr(ctx, -14, -82, 28, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd93b';
  ellipse(ctx, -8, -76, 3, 3);
  ellipse(ctx, 8, -76, 3, 3);
  // Arms: pumping, or reaching when close.
  if (reaching) {
    limb(ctx, 14, -96, 46, -88, 8, PALETTE.farmerShirt);
    limb(ctx, -14, -96, -34, -76, 8, PALETTE.farmerShirt);
  } else {
    limb(ctx, 14, -96, 26, -70 - swing, 8, PALETTE.farmerShirt);
    limb(ctx, -14, -96, -26, -70 + swing, 8, PALETTE.farmerShirt);
  }
  // Head.
  ball(ctx, 0, -124, 15, 15, PALETTE.farmerSkin, 3);
  // Angry eyebrows.
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -134);
  ctx.lineTo(-2, -130);
  ctx.moveTo(11, -134);
  ctx.lineTo(2, -130);
  ctx.stroke();
  // Eyes, looking right toward the turkey.
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, -6, -127, 3.4, 4);
  ellipse(ctx, 6, -127, 3.4, 4);
  ctx.fillStyle = '#1c2733';
  ellipse(ctx, -4.5, -127, 1.8, 2.2);
  ellipse(ctx, 7.5, -127, 1.8, 2.2);
  // Nose.
  ctx.fillStyle = '#e8a06a';
  ellipse(ctx, 2, -120, 3, 2.6);
  // Moustache.
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath();
  ctx.ellipse(-7, -115, 8, 3.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, -115, 8, 3.4, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Straw hat: wide brim + dome + band.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -136, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, -136);
  ctx.lineTo(-13, -154);
  ctx.quadraticCurveTo(0, -160, 13, -154);
  ctx.lineTo(14, -136);
  ctx.closePath();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a5a12';
  ctx.fillRect(-13, -140, 26, 5);
  // Carving knife in hand (kitchen stage).
  if (world.stageIndex === 2) {
    ctx.save();
    ctx.translate(30, -70);
    ctx.rotate(0.5);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.fillRect(0, -4, 26, 8);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -4, 26, 8);
    ctx.fillStyle = PALETTE.knifeHandle;
    ctx.fillRect(-10, -5, 12, 10);
    ctx.strokeRect(-10, -5, 12, 10);
    ctx.restore();
  }
  ctx.restore();
  // Taunt bubble when he is close.
  if (gap < 110 && world.time < world.farmer.tauntUntil) {
    ctx.fillStyle = '#fff7e6';
    const tw = ctx.measureText(world.farmer.taunt).width + 28;
    rr(ctx, x - 20, GROUND - 220, Math.max(tw, 90), 40, 12);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 10, GROUND - 182);
    ctx.lineTo(x + 2, GROUND - 164);
    ctx.lineTo(x + 26, GROUND - 182);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    text(ctx, world.farmer.taunt, x - 20 + Math.max(tw, 90) / 2, GROUND - 200, 17, '#4a2c05');
  }
}

function drawHUD(ctx, world) {
  buttons = [];
  const metres = Math.floor(distanceM(world));
  const sc = score(world);
  // Top bar: bright cream pill with a thick outline.
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 16, 14, W - 32, 64, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, `SCORE ${sc}`, 44, 46, 26, PALETTE.text, 'left');
  text(ctx, `BEST ${world.best}`, 250, 46, 20, PALETTE.muted, 'left');
  // Distance progress to the forest.
  const barX = 470;
  const barW = 380;
  text(ctx, `${STAGES[world.stageIndex].name}  ·  ${metres} m / ${ESCAPE_DISTANCE_M} m`, barX, 34, 17, PALETTE.muted, 'left');
  ctx.fillStyle = '#e8dcc0';
  rr(ctx, barX, 48, barW, 14, 7);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.good;
  rr(ctx, barX, 48, Math.max(14, (barW * metres) / ESCAPE_DISTANCE_M), 14, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  rr(ctx, barX + 2, 50, Math.max(10, (barW * metres) / ESCAPE_DISTANCE_M - 4), 5, 2);
  ctx.fill();
  // Little pine tree marking the forest end of the bar.
  ctx.fillStyle = '#3f9e2e';
  ctx.beginPath();
  ctx.moveTo(barX + barW + 22, 38);
  ctx.lineTo(barX + barW + 34, 62);
  ctx.lineTo(barX + barW + 10, 62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(barX + barW + 19, 62, 6, 6);
  // Farmer gap meter.
  const gapX = 920;
  text(ctx, 'FARMER', gapX, 34, 15, PALETTE.muted, 'left');
  ctx.fillStyle = '#e8dcc0';
  rr(ctx, gapX, 48, 150, 14, 7);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  const gapFrac = world.farmer.gap / FARMER.startGap;
  ctx.fillStyle = gapFrac < 0.32 ? PALETTE.danger : gapFrac < 0.6 ? '#f2a541' : PALETTE.good;
  rr(ctx, gapX, 48, Math.max(14, 150 * gapFrac), 14, 7);
  ctx.fill();
  // Little farmer hat at the end of the gap meter.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(gapX + 166, 52, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillRect(gapX + 158, 42, 16, 9);
  ctx.strokeRect(gapX + 158, 42, 16, 9);
  // Pause + mute buttons.
  button(ctx, 'pause', 1120, 24, 56, 44, 'II', 22);
  button(ctx, 'mute', 1188, 24, 56, 44, world.muted ? '✕' : '♪', 22);
  // Chicken-feed boost indicator.
  if (world.time < world.feedBoostUntil) {
    textOutlined(ctx, 'FEED BOOST!', 640, 108, 24, '#ff9f1c', 'center', '800', 5);
  }
  // Banner.
  if (world.banner.text && world.time < world.banner.until) {
    ctx.font = `700 22px ${FONT}`;
    const bw = ctx.measureText(world.banner.text).width + 60;
    ctx.fillStyle = PALETTE.panel;
    rr(ctx, (W - bw) / 2, 100, bw, 46, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, world.banner.text, W / 2, 124, 22, PALETTE.text);
  }
  // Hit flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(229, 83, 75, ${world.flash * 1.4})`;
    ctx.fillRect(0, 0, W, H);
    textOutlined(ctx, 'SPOTTED!', W / 2, 200, 44, '#ffffff', 'center', '800', 8);
  }
}

function drawTitle(ctx, world) {
  buttons = [];
  drawSky(ctx, world, world.time);
  drawScenery(ctx, world);
  // A big turkey on the title screen.
  const titleWorld = { ...world, turkey: { ...world.turkey, y: GROUND, onGround: true, ducking: false, invuln: 0, runPhase: world.time * 6 } };
  ctx.save();
  ctx.translate(240, 480);
  ctx.scale(2.1, 2.1);
  ctx.translate(-(TURKEY_X + TURKEY.width / 2), -(GROUND - TURKEY.height / 2));
  drawTurkey(ctx, titleWorld);
  ctx.restore();
  // The farmer peeking from the left edge.
  ctx.save();
  ctx.translate(90, GROUND);
  ball(ctx, 0, -124, 15, 15, PALETTE.farmerSkin, 3);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -134);
  ctx.lineTo(-2, -130);
  ctx.moveTo(11, -134);
  ctx.lineTo(2, -130);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, -6, -127, 3.4, 4);
  ellipse(ctx, 6, -127, 3.4, 4);
  ctx.fillStyle = '#1c2733';
  ellipse(ctx, -4.5, -127, 1.8, 2.2);
  ellipse(ctx, 7.5, -127, 1.8, 2.2);
  ctx.fillStyle = '#5a3a1e';
  ctx.beginPath();
  ctx.ellipse(-7, -115, 8, 3.4, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, -115, 8, 3.4, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -136, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-14, -136);
  ctx.lineTo(-13, -154);
  ctx.quadraticCurveTo(0, -160, 13, -154);
  ctx.lineTo(14, -136);
  ctx.closePath();
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a5a12';
  ctx.fillRect(-13, -140, 26, 5);
  ctx.restore();
  // Title panel: bright cream card with a thick outline, soft drop shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  rr(ctx, 406, 138, 560, 330, 18);
  ctx.fill();
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 400, 130, 560, 330, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  textOutlined(ctx, 'GOBBLE DASH', 680, 192, 62, '#e4572e', 'center', '800', 9);
  text(ctx, 'The Great Turkey Escape', 680, 246, 26, PALETTE.text);
  text(ctx, 'Thanksgiving is coming. The farmer is coming faster.', 680, 284, 18, PALETTE.muted);
  text(ctx, 'SPACE / CLICK — jump      ↓ — duck & slide', 680, 330, 20, PALETTE.text);
  text(ctx, 'Grab corn and chicken feed to slow the farmer. Reach the forest at 1200 m!', 680, 362, 18, PALETTE.muted);
  button(ctx, 'start', 560, 392, 240, 52, 'START RUN', 26);
  if (world.best > 0) textOutlined(ctx, `Best score: ${world.best}`, 680, 482, 20, '#ffd93b', 'center', '800', 5);
  textOutlined(ctx, 'An original game — drawn and sounded entirely in code.', 680, 640, 15, '#ffffff', 'center', '700', 4);
}

function drawEnd(ctx, world, escaped) {
  buttons = [];
  ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  rr(ctx, 346, 158, 600, 380, 18);
  ctx.fill();
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 340, 150, 600, 380, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 4;
  ctx.stroke();
  if (escaped) {
    textOutlined(ctx, 'ESCAPED!', 640, 212, 62, PALETTE.good, 'center', '800', 9);
    text(ctx, 'You made it to the forest. No stuffing for you!', 640, 270, 22, PALETTE.text);
    text(ctx, 'The turkey lives to gobble another day.', 640, 308, 20, PALETTE.muted);
  } else {
    textOutlined(ctx, 'CAUGHT!', 640, 212, 62, PALETTE.danger, 'center', '800', 9);
    text(ctx, 'The farmer got you — Thanksgiving dinner it is.', 640, 270, 22, PALETTE.text);
    text(ctx, 'The oven was already warm…', 640, 308, 20, PALETTE.muted);
  }
  text(ctx, `Score  ${world.finalScore}`, 640, 366, 30, PALETTE.text);
  text(ctx, `Distance  ${world.finalDistanceM} m      Best  ${world.best}`, 640, 404, 20, PALETTE.muted);
  button(ctx, 'restart', 520, 440, 240, 52, 'RUN AGAIN', 26);
  text(ctx, 'Press R or click the button to run again', 640, 514, 16, PALETTE.muted);
}

function drawPause(ctx, world) {
  buttons = [];
  ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';
  ctx.fillRect(0, 0, W, H);
  textOutlined(ctx, 'PAUSED', W / 2, 300, 56, '#ffffff', 'center', '800', 8);
  text(ctx, 'Press P or click Resume to keep running', W / 2, 360, 20, '#fff7e6');
  button(ctx, 'resume', 520, 400, 240, 52, 'RESUME', 26);
}

/** Draw the whole game for the current screen. */
export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 22;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  if (world.screen === 'title') {
    drawTitle(ctx, world);
  } else {
    drawSky(ctx, world, world.time);
    drawScenery(ctx, world);
    for (const pk of world.pickups) {
      if (pk.kind === 'feather') drawFeather(ctx, pk, world.time);
      else if (pk.kind === 'feed') drawFeed(ctx, pk, world.time);
      else drawCorn(ctx, pk, world.time);
    }
    for (const ob of world.obstacles) drawObstacle(ctx, ob);
    drawFarmer(ctx, world);
    drawTurkey(ctx, world);
    // Forest gate at the end of the run.
    const gateX = TURKEY_X + (ESCAPE_DISTANCE_M - distanceM(world)) * PX_PER_M;
    if (gateX < W + 200 && gateX > -100) {
      ctx.fillStyle = '#2c5d33';
      ctx.fillRect(gateX - 8, GROUND - 190, 16, 190);
      ctx.fillRect(gateX + 60, GROUND - 190, 16, 190);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.strokeRect(gateX - 8, GROUND - 190, 16, 190);
      ctx.strokeRect(gateX + 60, GROUND - 190, 16, 190);
      ctx.fillStyle = '#3f7d44';
      ctx.fillRect(gateX - 8, GROUND - 200, 84, 18);
      ctx.strokeRect(gateX - 8, GROUND - 200, 84, 18);
      textOutlined(ctx, 'FOREST', gateX + 34, GROUND - 216, 18, '#7ed957', 'center', '800', 4);
    }
    if (world.screen === 'play') drawHUD(ctx, world);
    else if (world.screen === 'pause') drawHUD(ctx, world), drawPause(ctx, world);
    else if (world.screen === 'caught') drawEnd(ctx, world, false);
    else if (world.screen === 'escaped') drawEnd(ctx, world, true);
  }
  ctx.restore();
}
