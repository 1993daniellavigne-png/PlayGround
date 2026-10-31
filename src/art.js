import {
  WORLD, POND, PLOT_LAYOUT, FIELD_BOUNDS, BUSHES, ROCKS, FLOWERS,
  STONE_PATCHES, CROPS, TOWER_TYPES,
} from './constants.js';
import { roundedRect, ellipse, seededRandom, TAU, clamp, lerp } from './utils.js';

const GRASS = ['#4f7a4a', '#5d8951', '#6d9a5b', '#436a41', '#78a363'];
const SOIL = ['#5a3d2b', '#6b4a34', '#4a3122', '#7c5a3e'];
const BARK = ['#5c422f', '#6d4f38', '#472f21'];

// ------------------------------------------------------------------ background

export function buildBackground(pathPoints) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.w * scale;
  canvas.height = WORLD.h * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const rng = seededRandom(7719);

  drawGrassBase(ctx, rng);
  drawForestShade(ctx);
  drawPondBase(ctx, rng);
  drawPath(ctx, rng, pathPoints);
  drawFieldBorder(ctx, rng);
  drawFences(ctx);
  drawDecor(ctx, rng);
  drawStonePatches(ctx);
  drawFieldDetails(ctx, rng);

  return canvas;
}

function drawGrassBase(ctx, rng) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, '#5b8652');
  g.addColorStop(0.34, '#57814e');
  g.addColorStop(0.7, '#4d7447');
  g.addColorStop(1, '#42653f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Soft organic colour patches.
  for (let i = 0; i < 100; i++) {
    const x = rng() * WORLD.w;
    const y = rng() * WORLD.h;
    const rx = 30 + rng() * 130;
    const ry = 20 + rng() * 70;
    ctx.save();
    ctx.globalAlpha = 0.035 + rng() * 0.06;
    ctx.fillStyle = GRASS[(rng() * GRASS.length) | 0];
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Worn ground and moss.
  for (let i = 0; i < 230; i++) {
    const x = rng() * WORLD.w;
    const y = rng() * WORLD.h;
    ctx.save();
    ctx.globalAlpha = 0.05 + rng() * 0.08;
    ctx.fillStyle = rng() > 0.45 ? '#8eaa68' : '#345438';
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + rng() * 22, 3 + rng() * 9, rng() * TAU, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Grass blades.
  ctx.lineCap = 'round';
  for (let i = 0; i < 4200; i++) {
    const x = rng() * WORLD.w;
    const y = rng() * WORLD.h;
    const h = 2 + rng() * 5;
    const lean = (rng() - 0.5) * 3;
    ctx.strokeStyle = rng() > 0.55 ? `rgba(142,178,106,${0.1 + rng() * 0.18})` : `rgba(44,76,44,${0.08 + rng() * 0.15})`;
    ctx.lineWidth = 0.8 + rng() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h);
    ctx.stroke();
  }

  // Fine flecks.
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(224,235,180,0.1)' : 'rgba(24,48,30,0.12)';
    const s = rng() > 0.85 ? 1.6 : 0.9;
    ctx.fillRect(rng() * WORLD.w, rng() * WORLD.h, s, s);
  }
}

function drawForestShade(ctx) {
  let g = ctx.createRadialGradient(110, 100, 30, 110, 100, 420);
  g.addColorStop(0, 'rgba(18,35,28,0.46)');
  g.addColorStop(0.55, 'rgba(22,40,30,0.18)');
  g.addColorStop(1, 'rgba(22,40,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  g = ctx.createLinearGradient(0, 0, 0, 80);
  g.addColorStop(0, 'rgba(15,31,25,0.32)');
  g.addColorStop(1, 'rgba(15,31,25,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, 90);
}

function drawPath(ctx, rng, points) {
  if (!points || !points.length) return;

  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  };

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Soft shadow under the track.
  ctx.save();
  ctx.translate(2, 6);
  trace();
  ctx.strokeStyle = 'rgba(24,34,22,0.2)';
  ctx.lineWidth = 68;
  ctx.stroke();
  ctx.restore();

  trace();
  ctx.strokeStyle = '#6d5b3d';
  ctx.lineWidth = 61;
  ctx.stroke();

  trace();
  ctx.strokeStyle = '#a18459';
  ctx.lineWidth = 53;
  ctx.stroke();

  trace();
  ctx.strokeStyle = '#bb9c6b';
  ctx.lineWidth = 42;
  ctx.stroke();

  trace();
  ctx.strokeStyle = 'rgba(218,190,142,0.4)';
  ctx.lineWidth = 22;
  ctx.stroke();

  // Ruts.
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#6a5437';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 20]);
  for (const off of [-8, 10]) {
    trace();
    ctx.save();
    ctx.translate(0, off);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Pebbles and worn flecks.
  for (let i = 0; i < 260; i++) {
    const p = points[(rng() * points.length) | 0];
    const a = rng() * TAU;
    const r = rng() * 20;
    const x = p.x + Math.cos(a) * r;
    const y = p.y + Math.sin(a) * r * 1.4;
    ctx.save();
    ctx.globalAlpha = 0.18 + rng() * 0.35;
    ctx.fillStyle = rng() > 0.55 ? '#dcc092' : '#735d40';
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + rng() * 3.4, 0.8 + rng() * 1.7, rng() * TAU, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Grass creeping over the edges.
  for (let i = 0; i < 180; i++) {
    const p = points[(rng() * points.length) | 0];
    const side = rng() > 0.5 ? 1 : -1;
    const x = p.x + (rng() - 0.5) * 50;
    const y = p.y + side * (24 + rng() * 8);
    ctx.strokeStyle = `rgba(100,140,78,${0.2 + rng() * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2, y - 4, x + (rng() - 0.5) * 5, y - 7 - rng() * 3);
    ctx.stroke();
  }

  // Little wooden bridge where the path meets the yard.
  drawPlankBridge(ctx, 1040, 412, 0.05, 96);
}

function drawPlankBridge(ctx, x, y, angle, width) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(28,38,24,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 7, width * 0.5, 16, 0, 0, TAU);
  ctx.fill();
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = i % 2 ? '#6b4b33' : '#7a583c';
    roundedRect(ctx, i * 12 - 5, -11 + i * 0.5, 10, 24, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,18,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFieldBorder(ctx, rng) {
  const b = FIELD_BOUNDS;
  ctx.save();
  ctx.fillStyle = 'rgba(44,34,22,0.18)';
  roundedRect(ctx, b.x - 4, b.y + 6, b.w + 8, b.h + 8, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(67,50,32,0.32)';
  roundedRect(ctx, b.x, b.y, b.w, b.h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(176,143,94,0.28)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Scattered straw and pebbles.
  for (let i = 0; i < 90; i++) {
    const x = b.x + rng() * b.w;
    const y = b.y + rng() * b.h;
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(208,174,112,0.2)' : 'rgba(52,36,24,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 10, y + (rng() - 0.5) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFences(ctx) {
  const b = FIELD_BOUNDS;
  drawFenceLine(ctx, b.x + 6, b.y - 12, b.x + b.w - 10, b.y - 12, 10);
  drawFenceLine(ctx, b.x - 10, b.y + 3, b.x - 10, b.y + b.h - 8, 10);

  // Yard fence near the house and pond.
  drawFenceLine(ctx, 918, 372, 970, 372, 8);
  drawFenceLine(ctx, 1216, 390, 1216, 470, 8);
}

function drawFenceLine(ctx, x1, y1, x2, y2, posts) {
  const dx = (x2 - x1) / posts;
  const dy = (y2 - y1) / posts;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(24,34,22,0.18)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1 + 4);
  ctx.lineTo(x2, y2 + 4);
  ctx.stroke();

  ctx.strokeStyle = '#6d4f34';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214,177,118,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1 - 1);
  ctx.lineTo(x2, y2 - 1);
  ctx.stroke();

  for (let i = 0; i <= posts; i++) {
    const x = x1 + dx * i;
    const y = y1 + dy * i;
    ctx.fillStyle = 'rgba(24,34,22,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 4, 4, 2.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5b412c';
    roundedRect(ctx, x - 2.2, y - 9, 4.4, 13, 1.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,184,124,0.3)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPondBase(ctx, rng) {
  const { x, y, rx, ry } = POND;
  ctx.save();

  // Ground shadow.
  ctx.fillStyle = 'rgba(24,38,26,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 9, rx + 10, ry + 8, 0, 0, TAU);
  ctx.fill();

  // Outer bank.
  ctx.fillStyle = '#6f7b52';
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 8, ry + 7, 0, 0, TAU);
  ctx.fill();

  // Water.
  const wg = ctx.createRadialGradient(x - 28, y - 20, 12, x, y, rx);
  wg.addColorStop(0, '#5aa0a8');
  wg.addColorStop(0.42, '#3d7e8d');
  wg.addColorStop(0.8, '#2b5c70');
  wg.addColorStop(1, '#244c5e');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();

  // Rim stones.
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * TAU + rng() * 0.08;
    const px = x + Math.cos(a) * (rx + 2 + rng() * 4);
    const py = y + Math.sin(a) * (ry + 2 + rng() * 4);
    const s = 3 + rng() * 7;
    ctx.fillStyle = rng() > 0.5 ? '#8b9070' : '#6d735b';
    ctx.beginPath();
    ctx.ellipse(px, py, s, s * 0.6, rng() * TAU, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,52,36,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Lily pads.
  for (const [lx, ly, s, rot] of [[-54, 18, 13, 0.7], [36, -22, 10, 2.4], [68, 26, 8, 1.2], [-18, -34, 7, 3.7]]) {
    ctx.save();
    ctx.translate(x + lx, y + ly);
    ctx.rotate(rot);
    ctx.fillStyle = '#5f8f54';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, s, 0.32, TAU - 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(215,232,170,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.72, 0.4, TAU - 0.4);
    ctx.stroke();
    if (s > 9) {
      ctx.fillStyle = '#f4e3b0';
      ctx.beginPath();
      ctx.arc(2, -2, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // Reeds.
  for (let i = 0; i < 16; i++) {
    const a = -0.4 - rng() * 1.1;
    const px = x + Math.cos(a) * (rx + 2);
    const py = y + Math.sin(a) * (ry + 4);
    const h = 12 + rng() * 24;
    ctx.strokeStyle = `rgba(96,124,65,${0.5 + rng() * 0.3})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + 3, py - h * 0.6, px + (rng() - 0.5) * 8, py - h);
    ctx.stroke();
    if (rng() > 0.55) {
      ctx.fillStyle = '#7a5a36';
      ctx.beginPath();
      ctx.ellipse(px + (rng() - 0.5) * 5, py - h, 1.6, 4, 0.2, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawDecor(ctx, rng) {
  // Bushes.
  for (const b of BUSHES) drawBush(ctx, b, rng);
  // Rocks.
  for (const r of ROCKS) drawRock(ctx, r, rng);
  // Flowers.
  drawFlowerPatches(ctx, rng);
}

function drawBush(ctx, bush, rng) {
  const { x, y, s } = bush;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(28,44,24,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 23, 8, 0, 0, TAU);
  ctx.fill();
  const blobs = [[-10, -8, 12], [4, -12, 13], [14, -4, 10], [-2, -2, 12], [6, 2, 9]];
  for (const [bx, by, br] of blobs) {
    ctx.fillStyle = '#3e6539';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
  }
  for (const [bx, by, br] of blobs) {
    ctx.fillStyle = 'rgba(107,148,84,0.55)';
    ctx.beginPath();
    ctx.arc(bx - 2, by - 4, br * 0.62, 0, TAU);
    ctx.fill();
  }
  if (rng() > 0.4) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rng() > 0.5 ? '#eadb9b' : '#d78a74';
      ctx.beginPath();
      ctx.arc((rng() - 0.5) * 22, -6 - rng() * 10, 1.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRock(ctx, rock, rng) {
  const { x, y, s } = rock;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(22,34,22,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 15, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7b7f74';
  ctx.beginPath();
  ctx.moveTo(-13, 2);
  ctx.quadraticCurveTo(-12, -9, -2, -12);
  ctx.quadraticCurveTo(10, -13, 14, -2);
  ctx.quadraticCurveTo(12, 5, 2, 6);
  ctx.quadraticCurveTo(-8, 7, -13, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(198,202,186,0.35)';
  ctx.beginPath();
  ctx.ellipse(-3, -6, 7, 4, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50,58,48,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, -1);
  ctx.lineTo(3, 2);
  ctx.stroke();
  if (rng() > 0.5) {
    ctx.fillStyle = '#5d8752';
    ctx.beginPath();
    ctx.arc(-9, 3, 3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlowerPatches(ctx, rng) {
  for (const [x, y, color] of FLOWERS) {
    const count = 1 + ((rng() * 3) | 0);
    for (let i = 0; i < count; i++) {
      const px = x + (rng() - 0.5) * 16;
      const py = y + (rng() - 0.5) * 10;
      ctx.strokeStyle = 'rgba(58,96,50,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py + 3);
      ctx.lineTo(px, py);
      ctx.stroke();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(px + Math.cos(a) * 2, py + Math.sin(a) * 2, 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#f7e7a2';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(px, py, 1.1, 0, TAU);
      ctx.fill();
    }
  }
}

function drawStonePatches(ctx) {
  for (const [x, y] of STONE_PATCHES) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.fillStyle = i % 2 ? 'rgba(166,170,154,0.5)' : 'rgba(120,124,108,0.45)';
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 5, y + Math.sin(a) * 3, 3, 2, 0, 0, TAU);
      ctx.fill();
    }
  }
}

function drawFieldDetails(ctx, rng) {
  // Straw mulch and tiny stones in the field margin.
  for (let i = 0; i < 70; i++) {
    const x = FIELD_BOUNDS.x + 4 + rng() * (FIELD_BOUNDS.w - 8);
    const y = FIELD_BOUNDS.y + 4 + rng() * (FIELD_BOUNDS.h - 8);
    if (x > PLOT_LAYOUT.x - 10 && x < PLOT_LAYOUT.x + PLOT_LAYOUT.cols * 62 && y > PLOT_LAYOUT.y - 10) continue;
    ctx.strokeStyle = `rgba(196,160,100,${0.12 + rng() * 0.16})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 8, y + (rng() - 0.5) * 3);
    ctx.stroke();
  }

  // A little sign by the field.
  drawSign(ctx, 505, 442);
}

function drawSign(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(24,34,22,0.2)';
  ctx.beginPath();
  ctx.ellipse(2, 6, 16, 5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5d412b';
  roundedRect(ctx, -2.5, -6, 5, 20, 1.5);
  ctx.fill();
  ctx.fillStyle = '#7a5a3b';
  roundedRect(ctx, -17, -25, 34, 19, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,186,130,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,226,190,0.75)';
  ctx.font = '700 6px "Avenir Next", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOONGLOW', 0, -15);
  ctx.fillStyle = '#7fb066';
  ctx.beginPath();
  ctx.arc(-9, -19, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ organic art

export function drawTree(ctx, tree, time) {
  const { x, y, s, kind } = tree;
  const sway = Math.sin(time * 0.7 + x * 0.03) * 1.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = 'rgba(20,34,22,0.28)';
  ctx.beginPath();
  ctx.ellipse(6, 6, 34, 13, 0.08, 0, TAU);
  ctx.fill();

  // Trunk.
  ctx.strokeStyle = '#4e3524';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-2, -20, 1 + sway * 0.4, -38);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(175,136,88,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.quadraticCurveTo(-4, -20, -1, -34);
  ctx.stroke();

  ctx.translate(sway, 0);

  if (kind === 1) {
    // Pine.
    const layers = [
      { y: -36, w: 34, h: 26, c: '#2d5742' },
      { y: -52, w: 29, h: 24, c: '#356348' },
      { y: -67, w: 22, h: 21, c: '#3f7150' },
      { y: -80, w: 14, h: 17, c: '#4b7e58' },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.c;
      ctx.beginPath();
      ctx.moveTo(-layer.w, layer.y + layer.h);
      ctx.quadraticCurveTo(-layer.w * 0.6, layer.y + layer.h * 0.4, 0, layer.y);
      ctx.quadraticCurveTo(layer.w * 0.6, layer.y + layer.h * 0.4, layer.w, layer.y + layer.h);
      ctx.quadraticCurveTo(0, layer.y + layer.h * 0.7, -layer.w, layer.y + layer.h);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16,38,26,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(189,214,145,0.25)';
    ctx.beginPath();
    ctx.ellipse(-6, -68, 8, 4, -0.4, 0, TAU);
    ctx.fill();
  } else {
    // Broadleaf.
    const blobs = [
      [0, -58, 30], [-24, -46, 22], [23, -45, 23], [-13, -72, 23],
      [17, -70, 21], [0, -84, 17], [-30, -62, 15], [31, -60, 14],
    ];
    for (const [bx, by, br] of blobs) {
      ctx.fillStyle = '#315a3d';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.fill();
    }
    for (const [bx, by, br] of blobs) {
      ctx.fillStyle = 'rgba(93,138,82,0.58)';
      ctx.beginPath();
      ctx.arc(bx - 3, by - 6, br * 0.64, 0, TAU);
      ctx.fill();
    }
    for (const [bx, by, br] of blobs) {
      ctx.fillStyle = 'rgba(159,190,112,0.28)';
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.42, br * 0.3, 0, TAU);
      ctx.fill();
    }
    // Leaf flecks.
    ctx.fillStyle = 'rgba(213,228,160,0.32)';
    for (let i = 0; i < 12; i++) {
      const a = i * 2.3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 26, -56 + Math.sin(a) * 20, 1.1, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawHouse(ctx, time, nightFactor) {
  const x = 986;
  const baseY = 342;
  const glow = clamp(nightFactor, 0, 1);
  ctx.save();
  ctx.translate(x, baseY);

  // Ground shadow.
  ctx.fillStyle = 'rgba(18,30,22,0.3)';
  ctx.beginPath();
  ctx.ellipse(118, 8, 132, 25, 0, 0, TAU);
  ctx.fill();

  // Chimney smoke.
  for (let i = 0; i < 3; i++) {
    const t = (time * 0.24 + i * 0.35) % 1;
    const sx = 172 + Math.sin(t * 8 + i) * 8;
    const sy = -248 - t * 42;
    ctx.globalAlpha = (1 - t) * 0.15;
    ctx.fillStyle = '#d9d5c7';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 7 + t * 12, 5 + t * 8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Main wall.
  const wall = ctx.createLinearGradient(0, -172, 0, -12);
  wall.addColorStop(0, '#ecdcb9');
  wall.addColorStop(0.65, '#ddc9a0');
  wall.addColorStop(1, '#c9b389');
  ctx.fillStyle = wall;
  roundedRect(ctx, 14, -172, 208, 160, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(69,49,33,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Timber frame.
  ctx.strokeStyle = 'rgba(94,66,44,0.75)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(14, -172); ctx.lineTo(14, -12);
  ctx.moveTo(222, -172); ctx.lineTo(222, -12);
  ctx.moveTo(14, -170); ctx.lineTo(222, -170);
  ctx.moveTo(70, -170); ctx.lineTo(70, -12);
  ctx.moveTo(166, -170); ctx.lineTo(166, -12);
  ctx.moveTo(118, -170); ctx.lineTo(118, -12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(235,212,168,0.3)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(71, -168); ctx.lineTo(71, -14);
  ctx.moveTo(167, -168); ctx.lineTo(167, -14);
  ctx.stroke();

  // Foundation.
  ctx.fillStyle = '#8b8775';
  roundedRect(ctx, 10, -34, 216, 30, 4);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(196,190,168,0.4)' : 'rgba(93,90,79,0.3)';
    roundedRect(ctx, 16 + i * 26, -30, 22, 10, 3);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(109,157,93,0.55)';
  ctx.beginPath();
  ctx.ellipse(34, -32, 17, 5, 0, 0, TAU);
  ctx.fill();

  // Roof.
  const roof = ctx.createLinearGradient(0, -258, 0, -170);
  roof.addColorStop(0, '#8a5144');
  roof.addColorStop(0.55, '#7b443b');
  roof.addColorStop(1, '#663830');
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-24, -170);
  ctx.lineTo(24, -252);
  ctx.lineTo(214, -252);
  ctx.lineTo(246, -170);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,26,22,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Roof shingles.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-24, -170);
  ctx.lineTo(24, -252);
  ctx.lineTo(214, -252);
  ctx.lineTo(246, -170);
  ctx.closePath();
  ctx.clip();
  for (let row = 0; row < 9; row++) {
    const yy = -250 + row * 10;
    ctx.strokeStyle = row % 2 ? 'rgba(47,26,23,0.24)' : 'rgba(226,177,135,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-30, yy);
    ctx.lineTo(250, yy);
    ctx.stroke();
    for (let col = 0; col < 12; col++) {
      const ox = -22 + col * 24 + (row % 2 ? 12 : 0);
      ctx.strokeStyle = 'rgba(44,24,21,0.12)';
      ctx.beginPath();
      ctx.moveTo(ox, yy);
      ctx.lineTo(ox, yy + 10);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Roof ridge.
  ctx.strokeStyle = 'rgba(229,179,137,0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(24, -252);
  ctx.lineTo(214, -252);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(39,24,21,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-24, -170);
  ctx.lineTo(24, -252);
  ctx.moveTo(246, -170);
  ctx.lineTo(214, -252);
  ctx.stroke();

  // Chimney.
  ctx.fillStyle = '#7e6d5a';
  roundedRect(ctx, 158, -286, 28, 46, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,36,29,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#655848';
  roundedRect(ctx, 154, -290, 36, 10, 3);
  ctx.fill();

  // Door.
  const door = ctx.createLinearGradient(0, -76, 0, -16);
  door.addColorStop(0, '#855b37');
  door.addColorStop(1, '#5d3c26');
  ctx.fillStyle = door;
  roundedRect(ctx, 86, -78, 48, 62, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(45,29,18,0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(219,172,102,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(110, -76); ctx.lineTo(110, -18);
  ctx.moveTo(90, -54); ctx.lineTo(130, -54);
  ctx.stroke();
  ctx.fillStyle = '#f2c96a';
  ctx.beginPath();
  ctx.arc(124, -47, 2.2, 0, TAU);
  ctx.fill();
  // Door glow.
  if (glow > 0.02) {
    const dg = ctx.createRadialGradient(110, -42, 2, 110, -42, 32);
    dg.addColorStop(0, `rgba(255,205,112,${0.32 * glow})`);
    dg.addColorStop(1, 'rgba(255,205,112,0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(110, -42, 32, 0, TAU);
    ctx.fill();
  }

  // Windows.
  for (const wx of [34, 166]) {
    ctx.fillStyle = glow > 0.05 ? '#ffd77f' : '#a9bfc4';
    roundedRect(ctx, wx, -132, 38, 44, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,42,28,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,53,33,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + 19, -132); ctx.lineTo(wx + 19, -88);
    ctx.moveTo(wx, -110); ctx.lineTo(wx + 38, -110);
    ctx.stroke();
    if (glow > 0.02) {
      const wg = ctx.createRadialGradient(wx + 19, -110, 3, wx + 19, -110, 34);
      wg.addColorStop(0, `rgba(255,212,120,${0.45 * glow})`);
      wg.addColorStop(1, 'rgba(255,212,120,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.arc(wx + 19, -110, 34, 0, TAU);
      ctx.fill();
    }
    // Flower box.
    ctx.fillStyle = '#6e4c30';
    roundedRect(ctx, wx - 3, -84, 44, 8, 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#e98978' : '#f2c96a';
      ctx.beginPath();
      ctx.arc(wx + 5 + i * 10, -87, 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5e8f52';
      ctx.beginPath();
      ctx.arc(wx + 8 + i * 10, -84, 2, 0, TAU);
      ctx.fill();
    }
  }

  // Porch step.
  ctx.fillStyle = 'rgba(31,38,26,0.25)';
  ctx.beginPath();
  ctx.ellipse(110, 7, 52, 12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#9b8d74';
  roundedRect(ctx, 76, -8, 68, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#b5a78a';
  roundedRect(ctx, 82, -10, 56, 6, 2);
  ctx.fill();
  ctx.fillStyle = '#806f56';
  roundedRect(ctx, 92, 3, 36, 5, 2);
  ctx.fill();

  // Ivy.
  ctx.strokeStyle = 'rgba(88,133,75,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, -164);
  ctx.bezierCurveTo(6, -140, 22, -112, 9, -86);
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const iy = -160 + i * 8;
    ctx.fillStyle = i % 2 ? '#6c9b5e' : '#557f4b';
    ctx.beginPath();
    ctx.ellipse(12 + Math.sin(i * 1.8) * 8, iy, 3.4, 2.2, i * 0.8, 0, TAU);
    ctx.fill();
  }

  // Porch lantern.
  ctx.strokeStyle = '#4a3a2c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(148, -76);
  ctx.lineTo(148, -64);
  ctx.stroke();
  ctx.fillStyle = '#3f3a34';
  roundedRect(ctx, 142, -64, 12, 13, 2);
  ctx.fill();
  ctx.fillStyle = glow > 0.05 ? '#ffd479' : '#c2b591';
  roundedRect(ctx, 144, -62, 8, 9, 1);
  ctx.fill();

  // Cat on the step.
  ctx.save();
  ctx.translate(42, 0);
  ctx.fillStyle = 'rgba(31,38,26,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 28, 7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9804f';
  ctx.beginPath();
  ctx.ellipse(0, -6, 25, 10, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-21, -9, 9, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-27, -17); ctx.lineTo(-23, -23); ctx.lineTo(-19, -15);
  ctx.moveTo(-17, -16); ctx.lineTo(-13, -22); ctx.lineTo(-11, -14);
  ctx.fill();
  ctx.strokeStyle = '#a75f39';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(22, -6);
  ctx.quadraticCurveTo(34, -2, 30, 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-16 + i * 5, -7);
    ctx.lineTo(-13 + i * 5, -7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

export function drawWell(ctx, time, nightFactor) {
  const x = 562;
  const y = 574;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,32,22,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 42, 14, 0, 0, TAU);
  ctx.fill();

  // Stone base.
  const g = ctx.createRadialGradient(-10, -6, 4, 0, 0, 38);
  g.addColorStop(0, '#c1b89c');
  g.addColorStop(0.55, '#9d947c');
  g.addColorStop(1, '#726b5a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 17, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a3027';
  ctx.beginPath();
  ctx.ellipse(0, -2, 29, 11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1c2630';
  ctx.beginPath();
  ctx.ellipse(0, -1, 24, 8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,217,225,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 5, 0, 0, Math.PI);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    ctx.fillStyle = i % 2 ? '#b5ab8e' : '#8d8570';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 32, Math.sin(a) * 13, 6, 4, a, 0, TAU);
    ctx.fill();
  }

  // Posts and roof.
  ctx.strokeStyle = '#5c3f29';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, -10); ctx.lineTo(-24, -68);
  ctx.moveTo(24, -10); ctx.lineTo(24, -68);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(221,181,120,0.35)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-22, -14); ctx.lineTo(-22, -64);
  ctx.stroke();
  ctx.fillStyle = '#6f4b2f';
  ctx.beginPath();
  ctx.moveTo(-38, -66);
  ctx.lineTo(0, -86);
  ctx.lineTo(38, -66);
  ctx.lineTo(0, -74);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(38,25,16,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = '#4b3321';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -56);
  ctx.lineTo(26, -56);
  ctx.stroke();

  // Rope and bucket.
  ctx.strokeStyle = 'rgba(91,69,44,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.lineTo(0, -38 + Math.sin(time * 1.3) * 1.5);
  ctx.stroke();
  ctx.fillStyle = '#6d4a2e';
  ctx.beginPath();
  ctx.moveTo(-6, -39 + Math.sin(time * 1.3) * 1.5);
  ctx.lineTo(6, -39 + Math.sin(time * 1.3) * 1.5);
  ctx.lineTo(4, -28 + Math.sin(time * 1.3) * 1.5);
  ctx.lineTo(-4, -28 + Math.sin(time * 1.3) * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,184,124,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (nightFactor > 0.1) {
    const lg = ctx.createRadialGradient(-30, -30, 2, -30, -30, 30);
    lg.addColorStop(0, `rgba(255,212,120,${0.28 * nightFactor})`);
    lg.addColorStop(1, 'rgba(255,212,120,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(-30, -30, 30, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ ground details

export function drawPlot(ctx, plot, time, highlighted) {
  const { x, y, size } = plot;
  const half = size / 2;
  ctx.save();
  if (!plot.tilled) {
    ctx.fillStyle = 'rgba(65,88,55,0.16)';
    roundedRect(ctx, x - half, y - half, size, size, 8);
    ctx.fill();
    ctx.strokeStyle = highlighted ? 'rgba(255,226,155,0.7)' : 'rgba(233,222,186,0.14)';
    ctx.lineWidth = highlighted ? 1.8 : 1;
    ctx.setLineDash([4, 5]);
    roundedRect(ctx, x - half + 1, y - half + 1, size - 2, size - 2, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    // Grass tufts.
    ctx.strokeStyle = 'rgba(120,156,86,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const gx = x - half + 10 + i * 10;
      const gy = y + half - 8;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 1, gy - 5);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Tilled soil.
  const g = ctx.createLinearGradient(x, y - half, x, y + half);
  if (plot.watered) {
    g.addColorStop(0, '#4a3325');
    g.addColorStop(1, '#38251b');
  } else {
    g.addColorStop(0, '#674734');
    g.addColorStop(1, '#513628');
  }
  ctx.fillStyle = 'rgba(28,20,14,0.25)';
  roundedRect(ctx, x - half + 2, y - half + 5, size, size, 8);
  ctx.fill();
  ctx.fillStyle = g;
  roundedRect(ctx, x - half, y - half, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = highlighted ? 'rgba(255,226,155,0.75)' : 'rgba(36,23,16,0.32)';
  ctx.lineWidth = highlighted ? 2 : 1.2;
  ctx.stroke();

  // Furrows.
  ctx.strokeStyle = plot.watered ? 'rgba(28,18,13,0.45)' : 'rgba(44,29,20,0.4)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const yy = y - half + 12 + i * 14;
    ctx.beginPath();
    ctx.moveTo(x - half + 7, yy);
    ctx.quadraticCurveTo(x, yy + 2.5, x + half - 7, yy);
    ctx.stroke();
  }
  // Wet glints.
  if (plot.watered) {
    ctx.fillStyle = 'rgba(143,224,240,0.3)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(x - 10 + i * 10, y - 8 + i * 6, 2.5, 1.1, 0.3, 0, TAU);
      ctx.fill();
    }
  }
  // Pebbles.
  ctx.fillStyle = 'rgba(180,150,112,0.35)';
  ctx.beginPath();
  ctx.arc(x - 15, y + 15, 1.5, 0, TAU);
  ctx.arc(x + 13, y - 16, 1.2, 0, TAU);
  ctx.fill();

  if (highlighted) {
    const pulse = 0.55 + Math.sin(time * 4) * 0.25;
    ctx.strokeStyle = `rgba(255,226,155,${pulse})`;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, x - half - 3, y - half - 3, size + 6, size + 6, 10);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCrop(ctx, plot, time, nightFactor) {
  if (!plot.crop) return;
  const crop = plot.crop;
  const def = CROPS[crop.type];
  const stage = crop.growth;
  const mature = stage >= def.days;
  const sway = Math.sin(time * 1.7 + plot.x * 0.05) * 1.2;
  const x = plot.x;
  const y = plot.y + 7;
  ctx.save();
  ctx.translate(x, y);

  if (crop.type === 'turnip') {
    const grow = clamp(stage / def.days, 0.28, 1);
    // Leaves.
    ctx.strokeStyle = '#4f7f46';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const leafH = 7 + grow * 10;
    for (let i = 0; i < 3; i++) {
      const a = -1.2 + i * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(Math.cos(a) * 8 + sway * 0.3, -leafH * 0.6, Math.cos(a) * 11 + sway, -leafH);
      ctx.stroke();
      ctx.fillStyle = i === 1 ? '#6fa35c' : '#5f9350';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 11 + sway, -leafH, 4.2, 2.2, a, 0, TAU);
      ctx.fill();
    }
    // Bulb.
    const br = 3 + grow * 7;
    ctx.fillStyle = mature ? '#ead9ec' : '#d9c4d8';
    ctx.beginPath();
    ctx.ellipse(0, 1, br, br * 0.82, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = mature ? '#b98ac8' : '#c4a6c8';
    ctx.beginPath();
    ctx.ellipse(0, 3, br * 0.7, br * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,70,105,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 1, br, br * 0.82, 0, 0, TAU);
    ctx.stroke();
  } else if (crop.type === 'sunberry') {
    const grow = clamp(stage / def.days, 0.3, 1);
    const h = 9 + grow * 15;
    ctx.strokeStyle = '#4f7b45';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway, -h * 0.6, sway * 1.4, -h);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const yy = -h * (0.35 + i * 0.2);
      ctx.fillStyle = i % 2 ? '#5f9350' : '#6fa35c';
      ctx.beginPath();
      ctx.ellipse((i % 2 ? 1 : -1) * 5 + sway * 0.5, yy, 5, 2.8, i % 2 ? -0.5 : 0.5, 0, TAU);
      ctx.fill();
    }
    const berries = stage === 0 ? 0 : stage;
    for (let i = 0; i < berries; i++) {
      const a = i * 2.4 + 0.6;
      const bx = Math.cos(a) * 6 + sway * 0.5;
      const by = -h * 0.62 - Math.sin(a) * 5;
      ctx.fillStyle = mature ? '#e9893b' : '#d59a4b';
      ctx.beginPath();
      ctx.arc(bx, by, 2.8, 0, TAU);
      ctx.fill();
      if (mature) {
        ctx.fillStyle = 'rgba(255,220,150,0.75)';
        ctx.beginPath();
        ctx.arc(bx - 0.8, by - 0.8, 0.8, 0, TAU);
        ctx.fill();
      }
    }
  } else if (crop.type === 'moonflower') {
    const grow = clamp(stage / def.days, 0.25, 1);
    const h = 10 + grow * 22;
    ctx.strokeStyle = '#5d8d73';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway * 0.6, -h * 0.55, sway, -h);
    ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const yy = -h * (0.35 + i * 0.26);
      ctx.fillStyle = '#77a87b';
      ctx.beginPath();
      ctx.ellipse((i % 2 ? 1 : -1) * 6 + sway * 0.4, yy, 6, 2.6, i % 2 ? -0.4 : 0.4, 0, TAU);
      ctx.fill();
    }
    if (mature) {
      const bloom = 1 + Math.sin(time * 2 + plot.x) * 0.06;
      ctx.save();
      ctx.translate(sway, -h);
      ctx.scale(bloom, bloom);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU - Math.PI / 2;
        ctx.fillStyle = nightFactor > 0.2 ? '#c9ecff' : '#bfe7ff';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4, 2.4, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#f7e9a2';
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff8d5';
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, TAU);
      ctx.fill();
      if (nightFactor > 0.15) {
        const glow = 0.35 * nightFactor + Math.sin(time * 3 + plot.x) * 0.08;
        const lg = ctx.createRadialGradient(0, 0, 1, 0, 0, 26);
        lg.addColorStop(0, `rgba(190,231,255,${glow})`);
        lg.addColorStop(1, 'rgba(190,231,255,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#a8d5c5';
      ctx.beginPath();
      ctx.ellipse(sway, -h, 3.2, 5, 0, 0, TAU);
      ctx.fill();
    }
  }

  if (mature) {
    const tw = 0.5 + Math.sin(time * 3 + plot.x * 0.1) * 0.5;
    ctx.fillStyle = `rgba(255,240,180,${0.4 + tw * 0.4})`;
    ctx.beginPath();
    ctx.arc(11, -18, 1.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-13, -8, 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPad(ctx, pad, time, hovered, selected) {
  const { x, y } = pad;
  const pulse = 0.5 + Math.sin(time * 2 + pad.id) * 0.5;
  ctx.save();
  ctx.fillStyle = 'rgba(20,30,20,0.24)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 39, 17, 0, 0, TAU);
  ctx.fill();

  // Ring stones.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const sx = x + Math.cos(a) * 31;
    const sy = y + Math.sin(a) * 14;
    const s = 5 + Math.sin(i * 2.3) * 1.5;
    ctx.fillStyle = i % 3 === 0 ? '#a89f84' : i % 3 === 1 ? '#8a826c' : '#77705f';
    ctx.beginPath();
    ctx.ellipse(sx, sy, s, s * 0.68, a, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,50,38,0.28)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Mossy centre.
  ctx.fillStyle = pad.tower ? '#5b5743' : '#626b48';
  ctx.beginPath();
  ctx.ellipse(x, y, 23, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(111,139,82,0.35)';
  ctx.beginPath();
  ctx.ellipse(x - 6, y - 2, 11, 4, 0, 0, TAU);
  ctx.fill();

  // Rune.
  if (!pad.tower) {
    ctx.strokeStyle = `rgba(255,222,145,${0.35 + pulse * 0.35})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, TAU);
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(255,222,145,${0.16 + pulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, TAU);
    ctx.fill();
  }

  if (hovered || selected) {
    ctx.strokeStyle = selected ? 'rgba(255,226,155,0.85)' : 'rgba(255,226,155,0.5)';
    ctx.lineWidth = selected ? 2 : 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 38, 17, 0, 0, TAU);
    ctx.stroke();
    if (selected) {
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.ellipse(x, y, 44, 20, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(255,226,155,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

export function drawRange(ctx, x, y, range, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(x, y, range, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------ player

export function drawPlayer(ctx, player, time, nightFactor, toolId) {
  const { x, y, facing, moving, walkPhase } = player;
  const bob = moving ? Math.sin(walkPhase * 2) * 1.4 : Math.sin(time * 1.8) * 0.6;
  const flip = facing < 0 ? -1 : 1;

  ctx.save();
  ctx.fillStyle = 'rgba(17,28,21,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 14, 5, 0, 0, TAU);
  ctx.fill();

  ctx.translate(x, y + bob);
  ctx.scale(flip, 1);

  // Legs.
  const step = moving ? Math.sin(walkPhase * 2) * 3.2 : 0;
  ctx.fillStyle = '#3b2c23';
  roundedRect(ctx, -6.5, -8 + Math.max(0, step) * 0.4, 5, 10, 2);
  ctx.fill();
  roundedRect(ctx, 1.5, -8 - Math.min(0, step) * 0.4, 5, 10, 2);
  ctx.fill();
  ctx.fillStyle = '#241b16';
  roundedRect(ctx, -7, 0 + step * 0.35, 6, 3.4, 1.8);
  ctx.fill();
  roundedRect(ctx, 1.5, 0 - step * 0.35, 6, 3.4, 1.8);
  ctx.fill();

  // Coat.
  const coat = ctx.createLinearGradient(0, -22, 0, -4);
  coat.addColorStop(0, '#4a7668');
  coat.addColorStop(1, '#31564d');
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-10, -22);
  ctx.quadraticCurveTo(-12, -12, -8, -5);
  ctx.quadraticCurveTo(0, -2, 8, -5);
  ctx.quadraticCurveTo(12, -12, 10, -22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(24,44,37,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Scarf.
  ctx.fillStyle = '#cf764e';
  roundedRect(ctx, -8, -24, 16, 4.2, 2);
  ctx.fill();
  ctx.fillStyle = '#b45e3b';
  roundedRect(ctx, 4, -22, 5, 9, 2);
  ctx.fill();

  // Belt.
  ctx.fillStyle = '#59402c';
  roundedRect(ctx, -8.2, -10, 16.4, 3.2, 1.4);
  ctx.fill();
  ctx.fillStyle = '#e0b45c';
  ctx.beginPath();
  ctx.arc(0, -8.4, 1.4, 0, TAU);
  ctx.fill();

  // Head.
  ctx.fillStyle = '#e8b48a';
  ctx.beginPath();
  ctx.arc(0, -31, 7.6, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,76,48,0.3)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Hair.
  ctx.fillStyle = '#5a3f2e';
  ctx.beginPath();
  ctx.arc(0, -33, 7.4, Math.PI * 0.95, Math.PI * 2.1);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -31.5, 7.4, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();

  // Eyes.
  ctx.fillStyle = '#3b2a20';
  ctx.beginPath();
  ctx.arc(-2.4, -30.2, 0.85, 0, TAU);
  ctx.arc(2.4, -30.2, 0.85, 0, TAU);
  ctx.fill();

  // Hat.
  ctx.fillStyle = '#d7b06b';
  ctx.beginPath();
  ctx.ellipse(0, -38.5, 11.5, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e5c47e';
  ctx.beginPath();
  ctx.ellipse(0, -43.5, 7.4, 5.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(117,82,40,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -40.4, 7.6, 2, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#a97f42';
  roundedRect(ctx, -7.4, -40.8, 14.8, 1.9, 1);
  ctx.fill();

  // Arms.
  ctx.strokeStyle = '#e8b48a';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -19);
  ctx.lineTo(-11.5, -10 + (moving ? Math.sin(walkPhase * 2 + Math.PI) * 1.5 : 0));
  ctx.stroke();

  // Tool in left hand.
  if (toolId === 'hoe') {
    ctx.strokeStyle = '#7b5a38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.lineTo(-15, -30);
    ctx.stroke();
    ctx.fillStyle = '#8e9691';
    ctx.beginPath();
    ctx.moveTo(-15, -30);
    ctx.lineTo(-21, -29);
    ctx.lineTo(-20, -25);
    ctx.lineTo(-15, -26);
    ctx.closePath();
    ctx.fill();
  } else if (toolId === 'water') {
    ctx.fillStyle = '#6da9a6';
    roundedRect(ctx, -19, -11, 9, 7, 2);
    ctx.fill();
    ctx.strokeStyle = '#4d8382';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-19, -9);
    ctx.lineTo(-24, -12);
    ctx.stroke();
  }

  // Right arm + lantern.
  ctx.strokeStyle = '#e8b48a';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(9, -19);
  ctx.lineTo(13, -12);
  ctx.stroke();

  if (nightFactor > 0.12) {
    ctx.strokeStyle = '#3f3427';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13, -12);
    ctx.lineTo(13, -6);
    ctx.stroke();
    ctx.fillStyle = '#3f4a47';
    roundedRect(ctx, 10, -6, 6.5, 8, 1.5);
    ctx.fill();
    ctx.fillStyle = `rgba(255,213,121,${0.75 + Math.sin(time * 4) * 0.1})`;
    roundedRect(ctx, 11.2, -4.8, 4.1, 5.4, 1);
    ctx.fill();
    const g = ctx.createRadialGradient(13, -2, 1, 13, -2, 19);
    g.addColorStop(0, 'rgba(255,220,140,0.5)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(13, -2, 19, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#8a7a5b';
    ctx.beginPath();
    ctx.arc(14, -11, 2, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

// ------------------------------------------------------------------ towers

export function drawTower(ctx, tower, time, nightFactor) {
  const type = TOWER_TYPES[tower.typeId];
  const { x, y, level, recoil, spin, firing } = tower;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(16,26,19,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 26, 10, 0, 0, TAU);
  ctx.fill();

  // Base stones.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.5;
    ctx.fillStyle = i % 2 ? '#8c8168' : '#756b57';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 18, Math.sin(a) * 7 + 1, 7, 4, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#5f5b48';
  ctx.beginPath();
  ctx.ellipse(0, 0, 19, 8, 0, 0, TAU);
  ctx.fill();

  if (tower.typeId === 'lantern') {
    // Post.
    const post = ctx.createLinearGradient(-4, 0, 4, 0);
    post.addColorStop(0, '#4a3322');
    post.addColorStop(0.5, '#7a5436');
    post.addColorStop(1, '#3f2b1d');
    ctx.fillStyle = post;
    roundedRect(ctx, -3.5, -56, 7, 58, 2.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(33,22,14,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Crossarm.
    ctx.strokeStyle = '#5b3f29';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -50);
    ctx.lineTo(12, -54);
    ctx.stroke();
    // Hanging lantern.
    const swing = recoil * 0.35;
    ctx.save();
    ctx.translate(0, -52);
    ctx.rotate(swing);
    ctx.strokeStyle = 'rgba(66,50,32,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 6);
    ctx.stroke();
    ctx.fillStyle = '#3d423c';
    roundedRect(ctx, -7, 5, 14, 17, 2.5);
    ctx.fill();
    ctx.fillStyle = `rgba(255,215,125,${0.78 + Math.sin(time * 4 + x) * 0.08})`;
    roundedRect(ctx, -5, 7, 10, 12, 1.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,204,0.8)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-2.6, 8);
    ctx.lineTo(-2.6, 17);
    ctx.moveTo(1.5, 8);
    ctx.lineTo(1.5, 17);
    ctx.stroke();
    const glow = 0.25 + nightFactor * 0.35;
    const g = ctx.createRadialGradient(0, 13, 2, 0, 13, 28);
    g.addColorStop(0, `rgba(255,213,121,${glow})`);
    g.addColorStop(1, 'rgba(255,213,121,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 13, 28, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Level pips.
    for (let i = 0; i < level; i++) {
      ctx.fillStyle = '#f2c96a';
      ctx.beginPath();
      ctx.arc(-6 + i * 6, -14, 1.8, 0, TAU);
      ctx.fill();
    }
  } else if (tower.typeId === 'frost') {
    // Copper pedestal.
    ctx.fillStyle = '#8b6a45';
    roundedRect(ctx, -10, -14, 20, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#b38a5a';
    roundedRect(ctx, -7, -17, 14, 5, 2);
    ctx.fill();
    // Pipe.
    ctx.strokeStyle = '#9a754b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -38);
    ctx.stroke();
    // Crystal.
    ctx.save();
    ctx.translate(0, -42);
    ctx.fillStyle = '#a8dcff';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(240,253,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(2.5, -1);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Spinning arms.
    ctx.save();
    ctx.translate(0, -35);
    ctx.rotate(spin);
    ctx.strokeStyle = '#b38a5a';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(TAU / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();
      ctx.fillStyle = '#7fd5ee';
      ctx.beginPath();
      ctx.arc(15, 0, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    if (firing > 0) {
      ctx.strokeStyle = `rgba(168,220,255,${firing * 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -35, 18, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < level; i++) {
      ctx.fillStyle = '#a8dcff';
      ctx.beginPath();
      ctx.arc(-6 + i * 6, -8, 1.6, 0, TAU);
      ctx.fill();
    }
  } else {
    // Bramble totem.
    ctx.strokeStyle = '#5b3f29';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, -22, 3, -42);
    ctx.stroke();
    ctx.strokeStyle = '#7a5735';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-1, -2);
    ctx.quadraticCurveTo(-4, -22, 3, -42);
    ctx.stroke();
    // Face.
    ctx.fillStyle = '#3f2d1e';
    ctx.beginPath();
    ctx.ellipse(3, -43, 10, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(166,210,126,${0.65 + Math.sin(time * 3 + x) * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, -45, 1.8, 0, TAU);
    ctx.arc(7, -44, 1.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4f3a25';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(3, -40, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Thorn arms.
    ctx.strokeStyle = '#6f8f50';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-1, -30);
    ctx.quadraticCurveTo(-14, -34, -16, -44);
    ctx.moveTo(5, -26);
    ctx.quadraticCurveTo(17, -30, 18, -39);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#8fbf70' : '#6f9b54';
      ctx.beginPath();
      ctx.arc(-8 + i * 4, -34 - (i % 2) * 5, 1.8, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < level; i++) {
      ctx.fillStyle = '#a6d27e';
      ctx.beginPath();
      ctx.ellipse(-8 + i * 8, -7, 3.5, 2, 0.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ enemies

export function drawEnemy(ctx, enemy, time, nightFactor) {
  const { x, y, type, radius, angle, slowTimer, hitFlash, dead } = enemy;
  if (dead) return;
  const spawnScale = 0.55 + 0.45 * enemy.spawn;
  const bob = Math.sin(time * 3 + enemy.bob) * (type === 'wisp' ? 4 : 1.6);
  const flip = Math.cos(angle) < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(x, y + bob);

  // Shadow.
  ctx.fillStyle = 'rgba(18,24,28,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 6 - bob, radius * 1.1, radius * 0.4, 0, 0, TAU);
  ctx.fill();

  ctx.scale(spawnScale * flip, spawnScale);

  const slowGlow = slowTimer > 0;
  if (slowGlow) {
    ctx.strokeStyle = 'rgba(168,220,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, TAU);
    ctx.stroke();
  }

  if (type === 'shade') {
    ctx.fillStyle = '#2a2245';
    ctx.beginPath();
    ctx.moveTo(-radius, 2);
    ctx.quadraticCurveTo(-radius * 0.9, -radius * 1.2, 0, -radius * 1.25);
    ctx.quadraticCurveTo(radius * 0.9, -radius * 1.2, radius, 2);
    ctx.quadraticCurveTo(radius * 0.7, radius * 0.9, radius * 0.35, radius * 0.4);
    ctx.quadraticCurveTo(0, radius * 1.15, -radius * 0.35, radius * 0.4);
    ctx.quadraticCurveTo(-radius * 0.7, radius * 0.9, -radius, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(106,84,156,0.35)';
    ctx.beginPath();
    ctx.ellipse(-3, -radius * 0.55, radius * 0.55, radius * 0.35, -0.3, 0, TAU);
    ctx.fill();
    // Horns.
    ctx.strokeStyle = '#1b1630';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.6, -radius * 1.05);
    ctx.lineTo(-radius * 0.8, -radius * 1.5);
    ctx.moveTo(radius * 0.6, -radius * 1.05);
    ctx.lineTo(radius * 0.8, -radius * 1.5);
    ctx.stroke();
    // Eyes.
    ctx.fillStyle = `rgba(198,230,255,${0.85 + Math.sin(time * 4 + enemy.bob) * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(-4.2, -4, 2, 2.6, 0, 0, TAU);
    ctx.ellipse(4.2, -4, 2, 2.6, 0, 0, TAU);
    ctx.fill();
  } else if (type === 'wisp') {
    const g = ctx.createRadialGradient(0, -4, 1, 0, -4, radius * 1.6);
    g.addColorStop(0, '#e8ffff');
    g.addColorStop(0.32, '#8fe6f2');
    g.addColorStop(1, 'rgba(95,184,216,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -4, radius * 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c8f7ff';
    ctx.beginPath();
    ctx.arc(0, -4, radius * 0.62, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1.5, -5, 2.4, 0, TAU);
    ctx.fill();
    // Tail.
    ctx.strokeStyle = 'rgba(127,213,238,0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, radius * 0.5);
    ctx.quadraticCurveTo(-4, radius * 1.3, 2, radius * 1.9);
    ctx.stroke();
    // Tiny eyes.
    ctx.fillStyle = '#2b5c70';
    ctx.beginPath();
    ctx.arc(-2.2, -5, 0.9, 0, TAU);
    ctx.arc(2.2, -5, 0.9, 0, TAU);
    ctx.fill();
  } else if (type === 'brute') {
    const g = ctx.createLinearGradient(0, -radius * 1.4, 0, radius);
    g.addColorStop(0, '#4b3657');
    g.addColorStop(1, '#2a1e32');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.2, radius, radius * 1.1, 0, 0, TAU);
    ctx.fill();
    // Shoulders.
    ctx.fillStyle = '#3b2a46';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.85, -radius * 0.25, radius * 0.55, radius * 0.5, -0.3, 0, TAU);
    ctx.ellipse(radius * 0.85, -radius * 0.25, radius * 0.55, radius * 0.5, 0.3, 0, TAU);
    ctx.fill();
    // Bone mask.
    ctx.fillStyle = '#cfc6aa';
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.55, radius * 0.55, radius * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1e32';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.2, -radius * 0.62, radius * 0.12, radius * 0.18, 0, 0, TAU);
    ctx.ellipse(radius * 0.2, -radius * 0.62, radius * 0.12, radius * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8f8266';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.35);
    ctx.lineTo(0, -radius * 0.18);
    ctx.stroke();
    // Horns.
    ctx.strokeStyle = '#b7ae91';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.45, -radius * 1.02);
    ctx.quadraticCurveTo(-radius * 1.1, -radius * 1.4, -radius * 1.25, -radius * 1.1);
    ctx.moveTo(radius * 0.45, -radius * 1.02);
    ctx.quadraticCurveTo(radius * 1.1, -radius * 1.4, radius * 1.25, -radius * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#d9d0b8';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, radius * 0.3, 1.7, 0, TAU);
    ctx.arc(radius * 0.3, radius * 0.3, 1.7, 0, TAU);
    ctx.fill();
  } else if (type === 'boss') {
    // Aura.
    const aura = ctx.createRadialGradient(0, -radius * 0.4, 4, 0, -radius * 0.4, radius * 1.8);
    aura.addColorStop(0, 'rgba(120,92,180,0.26)');
    aura.addColorStop(1, 'rgba(120,92,180,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.4, radius * 1.8, 0, TAU);
    ctx.fill();
    // Body.
    const g = ctx.createLinearGradient(0, -radius * 1.5, 0, radius);
    g.addColorStop(0, '#4d3c68');
    g.addColorStop(1, '#231b35');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.2, radius * 1.1, radius * 1.2, 0, 0, TAU);
    ctx.fill();
    // Ribs.
    ctx.strokeStyle = 'rgba(190,186,210,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, -radius * 0.1 + i * 5, radius * (0.55 - i * 0.08), 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    // Skull.
    ctx.fillStyle = '#ddd3ba';
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.9, radius * 0.55, radius * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a2038';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.22, -radius * 0.98, radius * 0.14, radius * 0.2, 0.2, 0, TAU);
    ctx.ellipse(radius * 0.22, -radius * 0.98, radius * 0.14, radius * 0.2, -0.2, 0, TAU);
    ctx.fill();
    // Antlers.
    ctx.strokeStyle = '#c8bfa4';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * radius * 0.28, -radius * 1.36);
      ctx.quadraticCurveTo(s * radius * 0.8, -radius * 1.9, s * radius * 1.15, -radius * 1.7);
      ctx.moveTo(s * radius * 0.55, -radius * 1.58);
      ctx.lineTo(s * radius * 0.86, -radius * 2.0);
      ctx.moveTo(s * radius * 0.4, -radius * 1.5);
      ctx.lineTo(s * radius * 0.32, -radius * 1.95);
      ctx.stroke();
    }
    // Eyes.
    ctx.fillStyle = `rgba(220,245,255,${0.8 + Math.sin(time * 4) * 0.2})`;
    ctx.beginPath();
    ctx.arc(-radius * 0.22, -radius * 0.98, radius * 0.08, 0, TAU);
    ctx.arc(radius * 0.22, -radius * 0.98, radius * 0.08, 0, TAU);
    ctx.fill();
  }

  if (hitFlash > 0) {
    ctx.globalAlpha = hitFlash * 0.55;
    ctx.fillStyle = '#fff7e0';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.4, radius * 1.02, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Health bar.
  if (enemy.hp < enemy.maxHp) {
    const w = Math.max(22, radius * 2.2);
    ctx.fillStyle = 'rgba(8,12,18,0.65)';
    roundedRect(ctx, -w / 2, -radius * 1.9 - 12, w, 4, 2);
    ctx.fill();
    const pct = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.fillStyle = pct > 0.5 ? '#a6d27e' : pct > 0.25 ? '#f2c96a' : '#ec8d7c';
    roundedRect(ctx, -w / 2 + 0.5, -radius * 1.9 - 11.5, (w - 1) * pct, 3, 1.5);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ fx

export function drawBolt(ctx, p, time) {
  ctx.save();
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const a = (i / p.trail.length) * 0.35;
    ctx.fillStyle = `rgba(255,212,121,${a})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.5 + i * 0.28, 0, TAU);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
  g.addColorStop(0, '#fff8dc');
  g.addColorStop(0.35, '#ffd479');
  g.addColorStop(1, 'rgba(255,212,121,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 2.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawSeed(ctx, p, time) {
  const wobble = Math.sin(time * 18 + p.t * 20) * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(140,190,100,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8, 5, 2, 0, 0, TAU);
  ctx.fill();
  ctx.translate(p.x, p.y);
  ctx.rotate(time * 8);
  ctx.fillStyle = '#a6d27e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6f9b54';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,255,200,0.8)';
  ctx.beginPath();
  ctx.arc(-1.5, -1.2, 1.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawRing(ctx, ring, time) {
  const alpha = ring.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = ring.width || 2;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r, 0, TAU);
  ctx.stroke();
  if ((ring.width || 2) > 2.5) {
    ctx.globalAlpha = Math.max(0, alpha * 0.35);
    ctx.lineWidth = (ring.width || 2) * 2.2;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const t = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = Math.min(1, t * 1.5);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.6 + t * 0.4), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx, floaters) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const t = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = Math.min(1, t * 1.6);
    ctx.font = `800 ${f.size || 13}px "Avenir Next", "Segoe UI", sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,14,8,0.45)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color || '#ffe29b';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
