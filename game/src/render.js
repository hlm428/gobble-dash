// Gobble Dash — every pixel the game shows, drawn on one canvas. The
// scenery changes with the stage (farmyard, barn, kitchen); the turkey and
// the farmer are drawn from circles, ellipses and arcs — no image files.
// render() also returns the clickable buttons on screen, so main.js can
// hit-test a pointer press against them.

import { FIELD, TURKEY_X, TURKEY, FARMER, STAGES, ESCAPE_DISTANCE_M, PX_PER_M, PALETTE, FONT } from './config.js';
import { distanceM, score } from './world.js';

const W = FIELD.width;
const H = FIELD.height;
const GROUND = FIELD.groundY;

/** Buttons on the current screen: { id, x, y, width, height, label }. */
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

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function button(ctx, id, x, y, w, h, label, size = 26) {
  ctx.fillStyle = '#f2c94c';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#8a5a12';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, size, '#4a2c05');
  buttons.push({ id, x, y, width: w, height: h, label });
}

function drawSky(ctx, world, time) {
  const stage = STAGES[world.stageIndex];
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND);
  grad.addColorStop(0, stage.skyTop);
  grad.addColorStop(1, stage.sky);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND);
  if (world.stageIndex === 2) return; // The kitchen is indoors: no sun, no clouds.
  // Sun.
  ctx.fillStyle = '#fff3c4';
  ellipse(ctx, 1120, 96, 44, 44);
  ctx.fillStyle = 'rgba(255, 243, 196, 0.35)';
  ellipse(ctx, 1120, 96, 62, 62);
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255, 250, 235, 0.85)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 340 + time * 12) % (W + 260)) - 130;
    const cy = 70 + i * 42;
    ellipse(ctx, cx, cy, 52, 20);
    ellipse(ctx, cx + 38, cy + 6, 40, 16);
    ellipse(ctx, cx - 40, cy + 8, 36, 14);
  }
}

function drawScenery(ctx, world) {
  const stage = STAGES[world.stageIndex];
  const offset = world.distancePx;
  // Distant hills.
  ctx.fillStyle = stage.groundDark;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 40) {
    const hill = Math.sin((x + offset * 0.15) / 260) * 26 + Math.sin((x + offset * 0.05) / 130) * 14;
    ctx.lineTo(x, GROUND - 60 - hill);
  }
  ctx.lineTo(W, GROUND);
  ctx.closePath();
  ctx.fill();
  if (world.stageIndex === 0) {
    // The barn on the horizon, and a fence line.
    const bx = W - 260 - ((offset * 0.3) % (W + 500));
    ctx.fillStyle = '#a34d1f';
    ctx.fillRect(bx, GROUND - 150, 150, 110);
    ctx.beginPath();
    ctx.moveTo(bx - 12, GROUND - 150);
    ctx.lineTo(bx + 75, GROUND - 195);
    ctx.lineTo(bx + 162, GROUND - 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7f5f0';
    ctx.fillRect(bx + 58, GROUND - 96, 34, 56);
    ctx.strokeStyle = '#7a4a26';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND - 34);
    ctx.lineTo(W, GROUND - 34);
    ctx.moveTo(0, GROUND - 18);
    ctx.lineTo(W, GROUND - 18);
    ctx.stroke();
    for (let x = 30 - (offset % 90); x < W; x += 90) {
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(x, GROUND - 46, 8, 46);
    }
  } else if (world.stageIndex === 1) {
    // Barn interior: beams and hanging lanterns.
    ctx.fillStyle = 'rgba(60, 35, 15, 0.35)';
    ctx.fillRect(0, 0, W, 46);
    for (let x = 90 - (offset % 220); x < W; x += 220) {
      ctx.fillStyle = '#5d3a1a';
      ctx.fillRect(x, 0, 14, 120);
      ctx.fillStyle = '#ffb347';
      ellipse(ctx, x + 7, 132, 16, 20);
      ctx.fillStyle = 'rgba(255, 179, 71, 0.25)';
      ellipse(ctx, x + 7, 132, 34, 40);
    }
  } else {
    // Kitchen: tiled wall, hanging pots, a window.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    for (let y = 40; y < GROUND - 60; y += 56) {
      for (let x = (y % 112 === 0 ? 0 : 56) - (offset % 112); x < W; x += 112) {
        ctx.fillRect(x, y, 104, 48);
      }
    }
    for (let i = 0; i < 3; i += 1) {
      const px = 240 + i * 380 - ((offset * 0.4) % 380);
      ctx.strokeStyle = '#5a3a1e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, 74);
      ctx.stroke();
      ctx.fillStyle = '#3f4a55';
      ellipse(ctx, px, 108, 34, 26);
      ctx.fillStyle = '#2c353d';
      ellipse(ctx, px, 96, 30, 10);
    }
    ctx.fillStyle = '#bfe3f0';
    rr(ctx, 980, 60, 170, 130, 10);
    ctx.fill();
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(1058, 60, 10, 130);
    ctx.fillRect(980, 118, 170, 10);
  }
  // Ground.
  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = stage.groundDark;
  ctx.fillRect(0, GROUND, W, 8);
  // Scrolling ground texture.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let x = 40 - (offset % 80); x < W; x += 80) {
    ctx.fillRect(x, GROUND + 26, 34, 5);
    ctx.fillRect(x + 20, GROUND + 58, 26, 5);
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
  ctx.fillStyle = pk.kind === 'goldenCorn' ? PALETTE.gold : PALETTE.corn;
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180, 130, 20, 0.7)';
  for (let i = -1; i <= 1; i += 1) {
    ctx.fillRect(i * 6 - 1, -12, 2, 24);
  }
  ctx.fillStyle = PALETTE.cornHusk;
  ctx.beginPath();
  ctx.moveTo(-11, 8);
  ctx.lineTo(-18, 22);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(11, 8);
  ctx.lineTo(18, 22);
  ctx.lineTo(4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFeather(ctx, pk, time) {
  const bob = Math.sin(time * 3 + pk.x * 0.04) * 4;
  ctx.save();
  ctx.translate(pk.x + 15, pk.y + 20 + bob);
  ctx.rotate(Math.sin(time * 2) * 0.2);
  ctx.fillStyle = PALETTE.feather;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b9b2a2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(ctx, ob) {
  const { x, y, width, height } = ob;
  if (ob.kind === 'fence') {
    ctx.fillStyle = '#7a4a26';
    ctx.fillRect(x, y + 8, width, height - 8);
    ctx.fillRect(x - 8, y + 18, width + 16, 8);
    ctx.fillRect(x - 8, y + 48, width + 16, 8);
    ctx.fillStyle = '#96683a';
    ctx.fillRect(x + 4, y, 6, 14);
  } else if (ob.kind === 'hay') {
    ctx.fillStyle = '#d9a441';
    ellipse(ctx, x + width / 2, y + height / 2, width / 2, height / 2);
    ctx.strokeStyle = '#a87c22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2 - 10, height / 2 - 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2 - 22, height / 2 - 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (ob.kind === 'crate') {
    ctx.fillStyle = '#9c6b34';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#6d4a20';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.moveTo(x + width, y);
    ctx.lineTo(x, y + height);
    ctx.stroke();
  } else if (ob.kind === 'puddle') {
    ctx.fillStyle = '#6b8cae';
    ellipse(ctx, x + width / 2, y + height / 2, width / 2, height / 2 + 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ellipse(ctx, x + width / 2 - 14, y + height / 2 - 2, 18, 4);
  } else if (ob.kind === 'oven') {
    ctx.fillStyle = '#3f4a55';
    rr(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.fillStyle = '#ff7a2f';
    rr(ctx, x + 16, y + 24, width - 32, height - 60, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    rr(ctx, x + 26, y + 34, width - 52, height - 80, 6);
    ctx.fill();
    ctx.fillStyle = '#2c353d';
    ctx.fillRect(x + 12, y + height - 26, width - 24, 8);
    for (let i = 0; i < 3; i += 1) {
      ellipse(ctx, x + 30 + i * 34, y + height - 14, 8, 5);
    }
    ctx.fillStyle = '#e8e2d5';
    text(ctx, 'HOT', x + width / 2, y - 14, 18, '#e5534b', 'center', '800');
  } else if (ob.kind === 'knifeThrown' || ob.kind === 'knifeFalling') {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    if (ob.kind === 'knifeFalling' && !ob.stuck) ctx.rotate(0.5);
    else if (ob.kind === 'knifeThrown') ctx.rotate(0.15);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(-width / 2, -6);
    ctx.lineTo(width / 2 - 14, -6);
    ctx.lineTo(width / 2, 0);
    ctx.lineTo(width / 2 - 14, 6);
    ctx.lineTo(-width / 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.knifeHandle;
    ctx.fillRect(-width / 2 - 12, -7, 14, 14);
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
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  ctx.translate(TURKEY_X + TURKEY.width / 2, bodyY);
  ctx.scale(1, squash);
  // Tail fan.
  const tailColors = PALETTE.tail;
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.rotate(i * 0.32 - 0.5);
    ctx.fillStyle = tailColors[i + 2];
    ctx.beginPath();
    ctx.ellipse(-26, -6, 26, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = PALETTE.turkeyBody;
  ellipse(ctx, 0, 0, 30, ducking ? 17 : 24);
  ctx.fillStyle = PALETTE.turkeyLight;
  ellipse(ctx, 6, 6, 18, 13);
  // Wing.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.beginPath();
  ctx.ellipse(-4, -2, 16, 10, t.onGround ? Math.sin(t.runPhase) * 0.25 : -0.7, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = PALETTE.head;
  ellipse(ctx, 24, ducking ? -8 : -26, 13, 12);
  // Beak.
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(34, -28);
  ctx.lineTo(48, -24);
  ctx.lineTo(34, -20);
  ctx.closePath();
  ctx.fill();
  // Wattle.
  ctx.fillStyle = PALETTE.wattle;
  ellipse(ctx, 30, -14, 5, 8);
  // Eye.
  ctx.fillStyle = '#1c2733';
  ellipse(ctx, 27, -29, 2.6, 2.6);
  // Legs (running).
  if (t.onGround) {
    const swing = Math.sin(t.runPhase) * 10;
    ctx.strokeStyle = '#e8a33c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 20);
    ctx.lineTo(-8 + swing, feetY - bodyY - 2);
    ctx.moveTo(8, 20);
    ctx.lineTo(8 - swing, feetY - bodyY - 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#e8a33c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 20);
    ctx.lineTo(-12, feetY - bodyY + 2);
    ctx.moveTo(8, 20);
    ctx.lineTo(12, feetY - bodyY + 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFarmer(ctx, world) {
  const gap = world.farmer.gap;
  const x = TURKEY_X - gap - 30;
  if (x < -90) return;
  const bob = Math.abs(Math.sin(world.time * 9)) * 6;
  const reaching = gap < 70;
  ctx.save();
  ctx.translate(x, GROUND - bob);
  // Legs.
  ctx.strokeStyle = '#2c3e55';
  ctx.lineWidth = 7;
  const swing = Math.sin(world.time * 9) * 12;
  ctx.beginPath();
  ctx.moveTo(-6, -52);
  ctx.lineTo(-6 + swing, 0);
  ctx.moveTo(6, -52);
  ctx.lineTo(6 - swing, 0);
  ctx.stroke();
  // Body: overalls.
  ctx.fillStyle = PALETTE.farmerOveralls;
  rr(ctx, -18, -108, 36, 58, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.fillRect(-18, -108, 36, 22);
  // Arms: pumping, or reaching when close.
  ctx.strokeStyle = PALETTE.farmerShirt;
  ctx.lineWidth = 8;
  ctx.beginPath();
  if (reaching) {
    ctx.moveTo(14, -96);
    ctx.lineTo(46, -88);
    ctx.moveTo(-14, -96);
    ctx.lineTo(-34, -76);
  } else {
    ctx.moveTo(14, -96);
    ctx.lineTo(26, -70 - swing);
    ctx.moveTo(-14, -96);
    ctx.lineTo(-26, -70 + swing);
  }
  ctx.stroke();
  // Head + hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  ellipse(ctx, 0, -124, 15, 15);
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -136, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -152, 26, 18);
  ctx.fillStyle = '#8a5a12';
  ctx.fillRect(-13, -138, 26, 5);
  // Moustache.
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(-8, -118, 16, 4);
  // Carving knife in hand (kitchen stage).
  if (world.stageIndex === 2) {
    ctx.save();
    ctx.translate(30, -70);
    ctx.rotate(0.5);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.fillRect(0, -4, 26, 8);
    ctx.fillStyle = PALETTE.knifeHandle;
    ctx.fillRect(-10, -5, 12, 10);
    ctx.restore();
  }
  ctx.restore();
  // Taunt bubble when he is close.
  if (gap < 110 && world.time < world.farmer.tauntUntil) {
    ctx.fillStyle = '#fff7e6';
    const tw = ctx.measureText(world.farmer.taunt).width + 28;
    rr(ctx, x - 20, GROUND - 220, Math.max(tw, 90), 40, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 10, GROUND - 182);
    ctx.lineTo(x + 2, GROUND - 164);
    ctx.lineTo(x + 26, GROUND - 182);
    ctx.closePath();
    ctx.fill();
    text(ctx, world.farmer.taunt, x - 20 + Math.max(tw, 90) / 2, GROUND - 200, 17, '#4a2c05');
  }
}

function drawHUD(ctx, world) {
  buttons = [];
  const metres = Math.floor(distanceM(world));
  const sc = score(world);
  // Top bar.
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, 16, 14, W - 32, 64, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, `SCORE ${sc}`, 44, 46, 26, PALETTE.text, 'left');
  text(ctx, `BEST ${world.best}`, 250, 46, 20, PALETTE.muted, 'left');
  // Distance progress to the forest.
  const barX = 470;
  const barW = 380;
  text(ctx, `${STAGES[world.stageIndex].name}  ·  ${metres} m / ${ESCAPE_DISTANCE_M} m`, barX, 34, 17, PALETTE.muted, 'left');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, barX, 48, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = PALETTE.good;
  rr(ctx, barX, 48, Math.max(14, (barW * metres) / ESCAPE_DISTANCE_M), 14, 7);
  ctx.fill();
  ctx.fillStyle = '#7ed957';
  // Little pine tree marking the forest end of the bar.
  ctx.beginPath();
  ctx.moveTo(barX + barW + 22, 40);
  ctx.lineTo(barX + barW + 34, 62);
  ctx.lineTo(barX + barW + 10, 62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(barX + barW + 19, 62, 6, 6);
  // Farmer gap meter.
  const gapX = 920;
  text(ctx, 'FARMER', gapX, 34, 15, PALETTE.muted, 'left');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, gapX, 48, 150, 14, 7);
  ctx.fill();
  const gapFrac = world.farmer.gap / FARMER.startGap;
  ctx.fillStyle = gapFrac < 0.32 ? PALETTE.danger : gapFrac < 0.6 ? '#f2a541' : PALETTE.good;
  rr(ctx, gapX, 48, Math.max(14, 150 * gapFrac), 14, 7);
  ctx.fill();
  // Little farmer hat at the end of the gap meter.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(gapX + 166, 52, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(gapX + 158, 42, 16, 9);
  // Pause + mute buttons.
  button(ctx, 'pause', 1120, 24, 56, 44, 'II', 22);
  button(ctx, 'mute', 1188, 24, 56, 44, world.muted ? '✕' : '♪', 22);
  // Banner.
  if (world.banner.text && world.time < world.banner.until) {
    ctx.fillStyle = 'rgba(30, 20, 12, 0.75)';
    const bw = ctx.measureText(world.banner.text).width + 60;
    rr(ctx, (W - bw) / 2, 100, bw, 46, 12);
    ctx.fill();
    text(ctx, world.banner.text, W / 2, 124, 22, PALETTE.text);
  }
  // Hit flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(229, 83, 75, ${world.flash * 1.4})`;
    ctx.fillRect(0, 0, W, H);
    text(ctx, 'SPOTTED!', W / 2, 200, 44, '#fff', 'center', '800');
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
  ctx.fillStyle = PALETTE.farmerSkin;
  ellipse(ctx, 0, -124, 15, 15);
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(0, -136, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -152, 26, 18);
  ctx.restore();
  // Title panel.
  ctx.fillStyle = 'rgba(30, 20, 12, 0.78)';
  rr(ctx, 400, 130, 560, 330, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'GOBBLE DASH', 680, 190, 64, PALETTE.gold, 'center', '800');
  text(ctx, 'The Great Turkey Escape', 680, 244, 26, PALETTE.text);
  text(ctx, 'Thanksgiving is coming. The farmer is coming faster.', 680, 282, 18, PALETTE.muted);
  text(ctx, 'SPACE / CLICK — jump      ↓ — duck & slide', 680, 330, 20, PALETTE.text);
  text(ctx, 'Grab corn to slow the farmer. Reach the forest at 1200 m!', 680, 360, 18, PALETTE.muted);
  button(ctx, 'start', 560, 392, 240, 52, 'START RUN', 26);
  if (world.best > 0) text(ctx, `Best score: ${world.best}`, 680, 482, 20, PALETTE.gold);
  text(ctx, 'An original game — drawn and sounded entirely in code.', 680, 640, 15, PALETTE.muted);
}

function drawEnd(ctx, world, escaped) {
  buttons = [];
  ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(30, 20, 12, 0.88)';
  rr(ctx, 340, 150, 600, 380, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  if (escaped) {
    text(ctx, 'ESCAPED!', 640, 210, 64, PALETTE.good, 'center', '800');
    text(ctx, 'You made it to the forest. No stuffing for you!', 640, 268, 22, PALETTE.text);
    text(ctx, 'The turkey lives to gobble another day.', 640, 306, 20, PALETTE.muted);
  } else {
    text(ctx, 'CAUGHT!', 640, 210, 64, PALETTE.danger, 'center', '800');
    text(ctx, 'The farmer got you — Thanksgiving dinner it is.', 640, 268, 22, PALETTE.text);
    text(ctx, 'The oven was already warm…', 640, 306, 20, PALETTE.muted);
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
  text(ctx, 'PAUSED', W / 2, 300, 56, PALETTE.text, 'center', '800');
  text(ctx, 'Press P or click Resume to keep running', W / 2, 360, 20, PALETTE.muted);
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
      ctx.fillStyle = '#3f7d44';
      ctx.fillRect(gateX - 8, GROUND - 200, 84, 18);
      text(ctx, 'FOREST', gateX + 34, GROUND - 214, 18, '#7ed957', 'center', '800');
    }
    if (world.screen === 'play') drawHUD(ctx, world);
    else if (world.screen === 'pause') drawHUD(ctx, world), drawPause(ctx, world);
    else if (world.screen === 'caught') drawEnd(ctx, world, false);
    else if (world.screen === 'escaped') drawEnd(ctx, world, true);
  }
  ctx.restore();
}
