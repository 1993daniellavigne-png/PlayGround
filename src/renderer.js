import {
  WORLD, DAY_LENGTH, POND, HOUSE, WELL, TOWER_TYPES, CROPS, TREES,
} from './constants.js';
import {
  clamp, lerp, smoothstep, seededRandom, TAU,
} from './utils.js';
import {
  buildBackground, drawTree, drawHouse, drawWell, drawPlot, drawCrop,
  drawPad, drawRange, drawPlayer, drawTower, drawEnemy, drawBolt, drawSeed,
  drawRing, drawParticles, drawFloaters,
} from './art.js';

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.background = buildBackground(game.path.points);
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = WORLD.w;
    this.lightCanvas.height = WORLD.h;
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.stars = this.makeStars();
    this.view = null;
    this.targetView = null;
    this.lastCssW = 0;
    this.lastCssH = 0;
    this.dpr = 1;
    this.resize(true);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(true), 240));
  }

  makeStars() {
    const rng = seededRandom(1931);
    return Array.from({ length: 150 }, () => ({
      x: rng(),
      y: rng(),
      r: 0.4 + rng() * 1.6,
      a: 0.08 + rng() * 0.35,
      phase: rng() * TAU,
      speed: 0.3 + rng() * 1.4,
    }));
  }

  resize(force = false) {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!force && Math.abs(cssW - this.lastCssW) < 0.5 && Math.abs(cssH - this.lastCssH) < 0.5 && dpr === this.dpr) return;
    this.lastCssW = cssW;
    this.lastCssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.cssW = cssW;
    this.cssH = cssH;
    this.view = null;
    this.targetView = null;
  }

  getTargetView() {
    const g = this.game;
    const title = g.mode === 'title';
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const portrait = this.cssH >= this.cssW;
    const mobile = this.cssW < 760 || (touch && this.cssW < 1100);
    const side = title ? Math.max(14, Math.min(42, this.cssW * 0.024)) : mobile ? 7 : 24;
    const top = title ? Math.max(12, Math.min(28, this.cssH * 0.02)) : mobile ? (portrait ? 138 : 62) : 84;
    const bottom = title ? Math.max(12, Math.min(28, this.cssH * 0.02)) : mobile ? (portrait ? 234 : 100) : 112;
    const availW = Math.max(120, this.cssW - side * 2);
    const availH = Math.max(100, this.cssH - top - bottom);
    const scale = Math.min(availW / WORLD.w, availH / WORLD.h);
    const w = WORLD.w * scale;
    const h = WORLD.h * scale;
    return {
      scale,
      ox: (this.cssW - w) / 2,
      oy: top + (availH - h) / 2,
      w,
      h,
      radius: clamp(18 * scale + 8, 10, 28),
    };
  }

  updateView(dt) {
    const target = this.getTargetView();
    if (!this.view) {
      this.view = { ...target };
      return;
    }
    const k = 1 - Math.pow(0.0005, Math.min(0.1, dt || 0.016));
    this.view.scale = lerp(this.view.scale, target.scale, k);
    this.view.ox = lerp(this.view.ox, target.ox, k);
    this.view.oy = lerp(this.view.oy, target.oy, k);
    this.view.w = WORLD.w * this.view.scale;
    this.view.h = WORLD.h * this.view.scale;
    this.view.radius = target.radius;
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const v = this.view || this.getTargetView();
    return {
      x: (x - v.ox) / v.scale,
      y: (y - v.oy) / v.scale,
    };
  }

  getNightFactor() {
    const g = this.game;
    if (g.phase === 'night') return 0.55 + smoothstep(0, 2.2, g.nightTime) * 0.45;
    if (g.phase === 'dawn') return clamp(1 - g.dawnTimer / 3.6, 0, 1) * 0.95;
    if (g.phase === 'day') {
      const start = DAY_LENGTH - 15;
      const t = clamp((g.phaseTime - start) / 15, 0, 1);
      return smoothstep(0, 1, t) * 0.32;
    }
    return 0;
  }

  draw(dt) {
    const ctx = this.ctx;
    const g = this.game;
    const now = g.time;
    this.updateView(dt);
    const v = this.view;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    this.drawBackdrop(ctx, now);

    const shake = g.shake;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    // Soft shadow beneath the diorama.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = clamp(this.cssW * 0.045, 24, 70);
    ctx.shadowOffsetY = clamp(this.cssH * 0.02, 10, 28);
    ctx.fillStyle = '#0a1412';
    this.roundRect(ctx, v.ox, v.oy, v.w, v.h, v.radius);
    ctx.fill();
    ctx.restore();

    // World.
    ctx.save();
    this.roundRect(ctx, v.ox, v.oy, v.w, v.h, v.radius);
    ctx.clip();
    ctx.save();
    ctx.translate(v.ox + sx * v.scale, v.oy + sy * v.scale);
    ctx.scale(v.scale, v.scale);
    this.drawWorld(ctx, now);
    this.drawFrameOverlay(ctx, now);
    ctx.restore();
    ctx.restore();

    // Frame edge.
    ctx.save();
    this.roundRect(ctx, v.ox, v.oy, v.w, v.h, v.radius);
    ctx.strokeStyle = 'rgba(255,236,190,0.17)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    this.roundRect(ctx, v.ox + 3, v.oy + 3, v.w - 6, v.h - 6, Math.max(4, v.radius - 3));
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Corner marks.
    const mark = clamp(16 * v.scale + 8, 12, 26);
    ctx.strokeStyle = 'rgba(242,201,106,0.32)';
    ctx.lineWidth = 1.4;
    for (const [cx, cy, dx, dy] of [
      [v.ox, v.oy, 1, 1], [v.ox + v.w, v.oy, -1, 1],
      [v.ox, v.oy + v.h, 1, -1], [v.ox + v.w, v.oy + v.h, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx * 9, cy + dy * 3);
      ctx.lineTo(cx + dx * 9, cy + dy * 9);
      ctx.lineTo(cx + dx * 3, cy + dy * 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + dx * 16, cy + dy * 16, 1.5, 0, TAU);
      ctx.fillStyle = 'rgba(242,201,106,0.4)';
      ctx.fill();
    }
    ctx.restore();
  }

  drawBackdrop(ctx, now) {
    const g = this.game;
    const night = this.getNightFactor();
    const g1 = ctx.createLinearGradient(0, 0, this.cssW * 0.35, this.cssH);
    g1.addColorStop(0, night > 0.4 ? '#070d18' : '#0a1117');
    g1.addColorStop(0.45, night > 0.4 ? '#0b1424' : '#0d1a1c');
    g1.addColorStop(1, '#080d11');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Warm pool of light behind the diorama.
    const rg = ctx.createRadialGradient(this.cssW * 0.5, this.cssH * 0.48, 20, this.cssW * 0.5, this.cssH * 0.48, Math.max(this.cssW, this.cssH) * 0.6);
    rg.addColorStop(0, `rgba(214,164,82,${0.05 + night * 0.02})`);
    rg.addColorStop(0.5, 'rgba(72,108,94,0.03)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Moon haze top-right.
    const mx = this.cssW * 0.86;
    const my = this.cssH * 0.12;
    const mg = ctx.createRadialGradient(mx, my, 4, mx, my, Math.min(this.cssW, this.cssH) * 0.4);
    mg.addColorStop(0, `rgba(208,226,255,${0.05 + night * 0.08})`);
    mg.addColorStop(1, 'rgba(208,226,255,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Stars and drifting dust in the backdrop.
    for (const s of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(now * s.speed + s.phase);
      ctx.globalAlpha = s.a * (0.35 + night * 0.85) * (0.4 + tw * 0.6);
      ctx.fillStyle = s.r > 1.4 ? '#ffe9bd' : '#cfe6ff';
      ctx.beginPath();
      ctx.arc(s.x * this.cssW, s.y * this.cssH, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // A few slow motes.
    for (let i = 0; i < 12; i++) {
      const t = now * (0.008 + (i % 4) * 0.004) + i * 0.17;
      const x = ((t * this.cssW + i * 137) % (this.cssW + 60)) - 30;
      const y = (i * 83 + Math.sin(now * 0.35 + i) * 22 + this.cssH * 0.22) % this.cssH;
      ctx.globalAlpha = 0.08 + (i % 3) * 0.03;
      ctx.fillStyle = i % 4 === 0 ? '#ffd479' : '#9fb8a5';
      ctx.beginPath();
      ctx.arc(x, y, 0.9 + (i % 3) * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title screen extra atmosphere.
    if (g.mode === 'title') {
      const tg = ctx.createRadialGradient(this.cssW * 0.2, this.cssH * 0.45, 10, this.cssW * 0.2, this.cssH * 0.45, this.cssW * 0.6);
      tg.addColorStop(0, 'rgba(242,201,106,0.045)');
      tg.addColorStop(1, 'rgba(242,201,106,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }
  }

  drawWorld(ctx, now) {
    const g = this.game;
    const night = this.getNightFactor();

    ctx.drawImage(this.background, 0, 0, WORLD.w, WORLD.h);
    this.drawPondShimmer(ctx, now, night);

    // Plots and crops.
    const nearbyPlot = g.nearby?.kind === 'plot' ? g.nearby.target : null;
    for (const plot of g.plots) {
      const highlighted = plot === nearbyPlot || plot === g.hoverPlot;
      drawPlot(ctx, plot, now, highlighted);
      drawCrop(ctx, plot, now, night);
    }

    // Stone pads.
    const nearbyPad = (g.nearby?.kind === 'pad' || g.nearby?.kind === 'tower') ? g.nearby.target : null;
    for (const pad of g.pads) {
      const hovered = pad === g.hoverPad || pad === nearbyPad;
      const selected = pad === g.selectedPad;
      drawPad(ctx, pad, now, hovered, selected);
    }

    // Range preview.
    const focusPad = g.selectedPad || g.hoverPad || nearbyPad;
    if (focusPad && focusPad.tower) {
      const type = TOWER_TYPES[focusPad.tower.typeId];
      const stats = type.levels[focusPad.tower.level - 1];
      drawRange(ctx, focusPad.x, focusPad.y, stats.range, `${type.color}66`);
    }

    // Walk target marker.
    if (g.walkTarget && g.mode === 'playing') {
      const t = g.walkTarget;
      const pulse = 0.6 + Math.sin(now * 7) * 0.3;
      ctx.save();
      ctx.strokeStyle = `rgba(255,226,155,${pulse * 0.65})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 9 + pulse * 2, 4.5 + pulse, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,226,155,${pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 2, 1.8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Depth-sorted world objects.
    const items = [];
    items.push({ y: 342, fn: () => drawHouse(ctx, now, night) });
    for (const tree of TREES) {
      items.push({ y: tree.y, fn: () => drawTree(ctx, tree, now) });
    }
    items.push({ y: WELL.y, fn: () => drawWell(ctx, now, night) });
    for (const tower of g.towers) {
      items.push({ y: tower.y, fn: () => drawTower(ctx, tower, now, night) });
    }
    for (const enemy of g.enemies) {
      if (!enemy.dead) items.push({ y: enemy.y + 4, fn: () => drawEnemy(ctx, enemy, now, night) });
    }
    items.push({
      y: g.player.y + 0.5,
      fn: () => drawPlayer(ctx, g.player, now, night, g.selectedToolDef().id),
    });

    items.sort((a, b) => a.y - b.y);
    for (const item of items) item.fn();

    // Projectiles.
    for (const p of g.projectiles) {
      if (p.kind === 'bolt') drawBolt(ctx, p, now);
      else drawSeed(ctx, p, now);
    }
    for (const ring of g.rings) drawRing(ctx, ring, now);

    // Lighting.
    this.drawLighting(ctx, now, night);

    // Ambient life.
    this.drawAmbient(ctx, now, night);

    // Particles and floating numbers.
    drawParticles(ctx, g.particles);
    drawFloaters(ctx, g.floaters);

    // Flare aim reticle.
    this.drawReticle(ctx, now);

    // Subtle inner vignette.
    const vg = ctx.createRadialGradient(WORLD.w * 0.5, WORLD.h * 0.46, WORLD.h * 0.34, WORLD.w * 0.5, WORLD.h * 0.5, WORLD.w * 0.66);
    vg.addColorStop(0, 'rgba(4,8,10,0)');
    vg.addColorStop(0.72, 'rgba(4,8,10,0.03)');
    vg.addColorStop(1, `rgba(4,8,10,${0.22 + night * 0.16})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  }

  drawPondShimmer(ctx, now, night) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(POND.x, POND.y, POND.rx - 2, POND.ry - 2, 0, 0, TAU);
    ctx.clip();
    for (let i = 0; i < 7; i++) {
      const y = POND.y - POND.ry + 14 + i * 15 + Math.sin(now * 0.8 + i) * 3;
      const x = POND.x + Math.sin(now * 0.5 + i * 1.7) * 18;
      const w = 26 + i * 8 + Math.sin(now + i) * 8;
      ctx.strokeStyle = `rgba(173,229,237,${0.08 + (i % 3) * 0.035})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 3, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Lily shadow/reflection.
    ctx.fillStyle = 'rgba(8,20,24,0.15)';
    ctx.beginPath();
    ctx.ellipse(POND.x - 40, POND.y + 26, 20, 6, 0.2, 0, TAU);
    ctx.fill();
    if (night > 0.2) {
      ctx.fillStyle = `rgba(180,225,255,${0.08 * night})`;
      ctx.beginPath();
      ctx.ellipse(POND.x, POND.y - 40, 60, 7, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  collectLights(now, night) {
    const g = this.game;
    const lights = [];
    const add = (x, y, r, color, strength, flicker = 0) => {
      const f = flicker ? 1 + Math.sin(now * flicker + x) * 0.06 : 1;
      lights.push({ x, y, r: r * f, color, strength });
    };

    if (night > 0.08) {
      add(g.player.x + 10, g.player.y - 4, 150 + night * 22, '255,212,121', 0.2 * night, 5.2);
      add(HOUSE.x + 34, HOUSE.y - 110, 105, '255,215,130', 0.14 * night, 2.1);
      add(HOUSE.x + 166, HOUSE.y - 110, 105, '255,215,130', 0.14 * night, 2.4);
      add(HOUSE.doorX, HOUSE.doorY - 38, 96, '255,196,106', 0.11 * night, 1.9);
      add(HOUSE.x + 148, HOUSE.y - 58, 64, '255,206,118', 0.12 * night, 4.4);

      for (const tower of g.towers) {
        const type = TOWER_TYPES[tower.typeId];
        const r = tower.typeId === 'lantern' ? 138 : tower.typeId === 'frost' ? 104 : 96;
        const y = tower.y - (tower.typeId === 'lantern' ? 38 : 40);
        add(tower.x, y, r, tower.typeId === 'frost' ? '150,211,255' : tower.typeId === 'bramble' ? '166,210,126' : '255,212,121', 0.14 * night, 3.2);
      }

      for (const plot of g.plots) {
        if (!plot.crop || plot.crop.type !== 'moonflower') continue;
        if (plot.crop.growth >= CROPS.moonflower.days) {
          add(plot.x, plot.y - 18, 62, '190,231,255', 0.12 * night, 2.6);
        }
      }

      for (const flare of g.flareLights) {
        const t = flare.life / flare.maxLife;
        add(flare.x, flare.y, 80 + 150 * t, '255,206,120', 0.34 * t, 9);
      }

      // A soft moon-wash, not a lantern.
      add(WORLD.w * 0.2, WORLD.h * 0.1, 280, '140,170,230', 0.05 * night, 0);
    }
    return lights;
  }

  drawLighting(ctx, now, night) {
    if (night < 0.02) return;
    const darkness = night * 0.84;
    const lc = this.lightCtx;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, WORLD.w, WORLD.h);
    lc.fillStyle = `rgba(7,10,27,${darkness})`;
    lc.fillRect(0, 0, WORLD.w, WORLD.h);

    const lights = this.collectLights(now, night);

    lc.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const grad = lc.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.36, 'rgba(0,0,0,0.92)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = grad;
      lc.beginPath();
      lc.arc(l.x, l.y, l.r, 0, TAU);
      lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.lightCanvas, 0, 0, WORLD.w, WORLD.h);

    // Warm and cool halos.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (l.strength <= 0) continue;
      const grad = ctx.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r * 0.92);
      grad.addColorStop(0, `rgba(${l.color},${l.strength})`);
      grad.addColorStop(0.42, `rgba(${l.color},${l.strength * 0.44})`);
      grad.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r * 0.92, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Moon beams.
    if (night > 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beams = [
        { x: 80, w: 120, drift: 18 },
        { x: 480, w: 90, drift: -14 },
      ];
      for (const beam of beams) {
        const x = beam.x + Math.sin(now * 0.12 + beam.x) * beam.drift;
        const grad = ctx.createLinearGradient(x, 0, x + 420, WORLD.h);
        grad.addColorStop(0, `rgba(160,190,255,${0.028 * night})`);
        grad.addColorStop(0.6, `rgba(140,175,240,${0.012 * night})`);
        grad.addColorStop(1, 'rgba(120,160,220,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.lineTo(x + beam.w, -10);
        ctx.lineTo(x + beam.w + 360, WORLD.h + 10);
        ctx.lineTo(x + 260, WORLD.h + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Cool colour grade.
    ctx.save();
    ctx.fillStyle = `rgba(40,56,120,${night * 0.045})`;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.restore();
  }

  drawAmbient(ctx, now, night) {
    // Day pollen.
    if (night < 0.55) {
      const alpha = (1 - night) * 0.5;
      for (let i = 0; i < 32; i++) {
        const h1 = ((i * 73.13) % 1);
        const h2 = ((i * 31.77) % 1);
        const x = ((i * 91 + now * (5 + (i % 4) * 3)) % (WORLD.w + 40)) - 20;
        const y = 120 + ((i * 137) % 520) + Math.sin(now * 0.5 + i) * 12;
        ctx.globalAlpha = alpha * (0.25 + ((i * 17) % 10) / 22);
        ctx.fillStyle = i % 3 === 0 ? '#ffe6a8' : '#dfeac0';
        ctx.beginPath();
        ctx.arc(x, y, 0.9 + (i % 3) * 0.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Fireflies.
    if (night > 0.15) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) {
        const baseX = 90 + ((i * 137.3) % 1100);
        const baseY = 150 + ((i * 83.7) % 500);
        const x = baseX + Math.sin(now * (0.32 + (i % 5) * 0.08) + i) * 22;
        const y = baseY + Math.cos(now * (0.27 + (i % 4) * 0.09) + i * 1.7) * 16;
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now * (1.2 + (i % 3) * 0.4) + i));
        const a = pulse * night * 0.7;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 11);
        grad.addColorStop(0, `rgba(232,255,168,${a})`);
        grad.addColorStop(0.3, `rgba(198,244,120,${a * 0.6})`);
        grad.addColorStop(1, 'rgba(198,244,120,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(250,255,220,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // Drifting leaves.
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const x = ((i * 181 + now * (10 + i * 2.2)) % (WORLD.w + 80)) - 40;
      const y = 80 + ((i * 97) % 540) + Math.sin(now * 0.8 + i * 1.4) * 18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(now * 0.6 + i);
      ctx.globalAlpha = 0.18 + (i % 3) * 0.05;
      ctx.fillStyle = i % 2 ? '#b58d52' : '#8ca95f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawReticle(ctx, now) {
    const g = this.game;
    if (g.mode !== 'playing' || g.phase !== 'night' || !g.pointer.active) return;
    const ready = g.flare.cooldown <= 0;
    const x = g.pointer.x;
    const y = g.pointer.y;
    if (x < 0 || y < 0 || x > WORLD.w || y > WORLD.h) return;
    const pct = 1 - g.flare.cooldown / g.flare.max;
    ctx.save();
    ctx.globalAlpha = ready ? 0.85 : 0.35;
    ctx.strokeStyle = ready ? 'rgba(255,226,155,0.9)' : 'rgba(255,226,155,0.5)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0.4, Math.PI - 0.4);
    ctx.arc(x, y, 13, Math.PI + 0.4, TAU - 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 19, y); ctx.lineTo(x - 9, y);
    ctx.moveTo(x + 9, y); ctx.lineTo(x + 19, y);
    ctx.moveTo(x, y - 19); ctx.lineTo(x, y - 9);
    ctx.moveTo(x, y + 9); ctx.lineTo(x, y + 19);
    ctx.stroke();
    ctx.fillStyle = ready ? '#ffe29b' : '#9c8c6a';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, TAU);
    ctx.fill();
    if (!ready) {
      ctx.strokeStyle = 'rgba(255,226,155,0.4)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + pct * TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFrameOverlay(ctx, now) {
    // Soft top shade for readability of overlays.
    const top = ctx.createLinearGradient(0, 0, 0, 110);
    top.addColorStop(0, 'rgba(4,8,10,0.3)');
    top.addColorStop(1, 'rgba(4,8,10,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, WORLD.w, 120);

    const bottom = ctx.createLinearGradient(0, WORLD.h - 90, 0, WORLD.h);
    bottom.addColorStop(0, 'rgba(4,8,10,0)');
    bottom.addColorStop(1, 'rgba(4,8,10,0.22)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, WORLD.h - 90, WORLD.w, 90);
  }

  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

// Imported here to keep the art module's data access simple.
