import {
  WORLD, DAY_LENGTH, NIGHT_PREP, NIGHT_CLEAR_DELAY, MAX_HEARTS, TOTAL_NIGHTS,
  START_COINS, WATER_CAPACITY, CROPS, TOOLS, TOWER_TYPES, ENEMY_TYPES,
  PLOT_LAYOUT, PADS, HOUSE, WELL, POND, PATH_WAYPOINTS, NIGHT_REWARDS,
  buildWave,
} from './constants.js';
import {
  clamp, dist, makePath, pointAtDistance, formatTime, lerp, smoothstep, TAU,
} from './utils.js';

const HOUSE_BLOCK = { x: 976, y: 54, w: 246, h: 286 };

export class Game {
  constructor(audio) {
    this.audio = audio;
    this.listeners = new Set();
    this.pointerVerb = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'Tap' : 'Click';
    this.path = makePath(PATH_WAYPOINTS, 16);
    this.time = 0;
    this.mode = 'title';
    this.shake = 0;
    this.redFlash = 0;
    this.pointer = { x: WORLD.w / 2, y: WORLD.h / 2, active: false };
    this.titleScene = true;
    this.reset();
    this.setupTitleScene();
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, data) {
    for (const fn of this.listeners) fn(type, data);
  }

  reset() {
    this.mode = 'title';
    this.phase = 'day';
    this.day = 1;
    this.phaseTime = 0;
    this.coins = START_COINS;
    this.hearts = MAX_HEARTS;
    this.water = WATER_CAPACITY;
    this.selectedTool = 0;
    this.player = {
      x: 566, y: 512, facing: 1, vx: 0, vy: 0, speed: 184,
      walkPhase: 0, moving: false, lanternSwing: 0,
    };
    this.moveVector = { x: 0, y: 0 };
    this.walkTarget = null;
    this.walkStuck = 0;
    this.plots = this.makePlots();
    this.pads = PADS.map((p, i) => ({ ...p, id: i, tower: null, pulse: Math.random() * TAU }));
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.flareLights = [];
    this.flare = { cooldown: 0, max: 5.4 };
    this.selectedPad = null;
    this.hoverPad = null;
    this.hoverPlot = null;
    this.nearby = null;
    this.spawnQueue = [];
    this.spawnIndex = 0;
    this.nightTime = 0;
    this.nightTotal = 0;
    this.nightKills = 0;
    this.nightClearTimer = 0;
    this.nightOver = false;
    this.dawnTimer = 0;
    this.nightReward = 0;
    this.stats = { harvested: 0, kills: 0, built: 0, coinsEarned: 0, nights: 0, planted: 0, flares: 0 };
    this.tutorial = { till: false, plant: false, water: false, harvest: false, build: false, night: false };
    this.tipTimer = 0;
    this.shotSfxTimer = 0;
    this.titleScene = false;
    this.shake = 0;
    this.redFlash = 0;
  }

  makePlots() {
    const { cols, rows, x, y, size, gap } = PLOT_LAYOUT;
    const plots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        plots.push({
          id: r * cols + c,
          col: c, row: r,
          x: x + c * (size + gap) + size / 2,
          y: y + r * (size + gap) + size / 2,
          size,
          tilled: false,
          watered: false,
          crop: null,
          pulse: Math.random() * TAU,
        });
      }
    }
    return plots;
  }

  setupTitleScene() {
    this.titleScene = true;
    this.phase = 'day';
    this.day = 1;
    this.phaseTime = DAY_LENGTH * 0.18;
    const demo = [
      [6, 'turnip', 1, true], [7, 'turnip', 1, true], [8, 'sunberry', 2, true],
      [11, 'sunberry', 1, true], [12, 'moonflower', 2, true], [13, 'turnip', 0, false],
      [16, 'moonflower', 1, true], [17, 'turnip', 1, true],
    ];
    for (const [i, type, growth, watered] of demo) {
      const plot = this.plots[i];
      if (!plot) continue;
      plot.tilled = true;
      plot.watered = watered;
      plot.crop = { type, growth };
    }
    this.player.x = 430;
    this.player.y = 588;
    this.addTowerToPad(this.pads[3], 'lantern', true);
    this.addTowerToPad(this.pads[6], 'frost', true);
    this.mode = 'title';
  }

  startNewGame() {
    this.reset();
    this.mode = 'playing';
    this.phase = 'day';
    this.day = 1;
    this.phaseTime = 0;
    this.selectedTool = 0;
    this.tutorial = { till: false, plant: false, water: false, harvest: false, build: false, night: false };
    this.emit('mode', this.mode);
    this.emit('event', {
      kicker: 'Day one',
      title: 'The hollow is yours',
      sub: 'A little farm, a long shadow, and seven nights ahead.',
      duration: 4200,
    });
    this.emit('toast', { text: 'Till a plot, then choose a seed from the hotbar.', tone: 'good', icon: '#i-hoe' });
    this.audio.click();
  }

  returnToTitle() {
    this.reset();
    this.setupTitleScene();
    this.mode = 'title';
    this.emit('mode', this.mode);
  }

  // ---------------------------------------------------------------- update

  update(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 42);
    if (this.redFlash > 0) this.redFlash = Math.max(0, this.redFlash - dt * 2.2);
    this.shotSfxTimer = Math.max(0, this.shotSfxTimer - dt);

    if (this.mode !== 'playing') return;

    this.phaseTime += dt;
    this.flare.cooldown = Math.max(0, this.flare.cooldown - dt);

    if (this.phase === 'day') {
      if (this.phaseTime >= DAY_LENGTH) this.beginNight();
      else this.updatePlayer(dt);
    } else if (this.phase === 'night') {
      this.updatePlayer(dt);
      this.updateNight(dt);
    } else if (this.phase === 'dawn') {
      this.dawnTimer += dt;
      this.updatePlayer(dt);
      if (this.dawnTimer >= 4.3) this.startDay(this.day + 1);
    }

    this.updateTowers(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.updateRings(dt);
    this.updateNearby();

    for (const pad of this.pads) pad.pulse += dt * 1.4;
  }

  updatePlayer(dt) {
    const p = this.player;
    let ix = 0;
    let iy = 0;
    const keys = this.keys || {};
    if (keys.left) ix -= 1;
    if (keys.right) ix += 1;
    if (keys.up) iy -= 1;
    if (keys.down) iy += 1;
    ix += this.moveVector.x;
    iy += this.moveVector.y;

    if (Math.abs(ix) > 0.06 || Math.abs(iy) > 0.06) {
      this.walkTarget = null;
      const len = Math.hypot(ix, iy) || 1;
      ix /= len;
      iy /= len;
      p.facing = ix < -0.05 ? -1 : ix > 0.05 ? 1 : p.facing;
      this.tryMove(ix * p.speed * dt, iy * p.speed * dt);
      p.walkPhase += dt * 11.5;
      p.moving = true;
    } else if (this.walkTarget) {
      const t = this.walkTarget;
      const d = dist(p.x, p.y, t.x, t.y);
      const stop = t.stop || 4;
      if (d <= stop) {
        this.walkTarget = null;
        p.moving = false;
        if (t.action) t.action();
      } else {
        const nx = (t.x - p.x) / d;
        const ny = (t.y - p.y) / d;
        if (nx < -0.05) p.facing = -1;
        else if (nx > 0.05) p.facing = 1;
        const beforeX = p.x;
        const beforeY = p.y;
        this.tryMove(nx * p.speed * 0.95 * dt, ny * p.speed * 0.95 * dt);
        if (Math.abs(beforeX - p.x) < 0.01 && Math.abs(beforeY - p.y) < 0.01) {
          this.walkStuck += dt;
          if (this.walkStuck > 0.35) {
            this.walkTarget = null;
            this.walkStuck = 0;
            p.moving = false;
          }
        } else {
          this.walkStuck = 0;
          p.walkPhase += dt * 10.5;
          p.moving = true;
        }
      }
    } else {
      p.moving = false;
      p.walkPhase += dt * 2.2;
    }

    this.clampPlayer();
    p.vx = ix;
    p.vy = iy;
    p.lanternSwing = Math.sin(this.time * 2.4) * 0.06 + (p.moving ? Math.sin(p.walkPhase) * 0.04 : 0);
  }

  tryMove(dx, dy) {
    const p = this.player;
    const nextX = clamp(p.x + dx, 22, WORLD.w - 22);
    if (!this.blocked(nextX, p.y)) p.x = nextX;
    const nextY = clamp(p.y + dy, 26, WORLD.h - 20);
    if (!this.blocked(p.x, nextY)) p.y = nextY;
  }

  clampPlayer() {
    this.player.x = clamp(this.player.x, 22, WORLD.w - 22);
    this.player.y = clamp(this.player.y, 26, WORLD.h - 20);
  }

  blocked(x, y) {
    if (
      x > HOUSE_BLOCK.x && x < HOUSE_BLOCK.x + HOUSE_BLOCK.w &&
      y > HOUSE_BLOCK.y && y < HOUSE_BLOCK.y + HOUSE_BLOCK.h
    ) return true;
    const px = (x - POND.x) / (POND.rx - 12);
    const py = (y - POND.y) / (POND.ry - 10);
    if (px * px + py * py < 1) return true;
    return false;
  }

  // ---------------------------------------------------------------- phases

  beginNight() {
    if (this.phase === 'night') return;
    this.phase = 'night';
    this.phaseTime = 0;
    this.nightTime = 0;
    this.nightOver = false;
    this.nightClearTimer = 0;
    this.nightKills = 0;
    this.spawnQueue = buildWave(this.day);
    this.spawnIndex = 0;
    this.nightTotal = this.spawnQueue.length;
    this.enemies = [];
    this.projectiles = [];
    this.rings = [];
    this.walkTarget = null;
    this.player.x = clamp(this.player.x, 40, WORLD.w - 40);
    this.player.y = clamp(this.player.y, 44, WORLD.h - 34);
    this.audio.setPhase('night');
    this.audio.nightStart();
    this.emit('night-start', { night: this.day, total: this.nightTotal });
    this.emit('event', {
      kicker: `Night ${this.day} of ${TOTAL_NIGHTS}`,
      title: 'The hollow wakes',
      sub: 'Shadows are gathering at the treeline. Raise a ward.',
      duration: 4600,
    });
    if (!this.tutorial.night) {
      this.tutorial.night = true;
      this.emit('toast', { text: `${this.pointerVerb} a stone pad to build a ward before the shadows arrive.`, tone: '', icon: '#i-lantern' });
    }
  }

  updateNight(dt) {
    this.nightTime += dt;
    while (this.spawnIndex < this.spawnQueue.length && this.spawnQueue[this.spawnIndex].t <= this.nightTime) {
      this.spawnEnemy(this.spawnQueue[this.spawnIndex].type);
      this.spawnIndex++;
    }
    const alive = this.enemies.some((e) => !e.dead);
    if (!this.nightOver && this.spawnIndex >= this.spawnQueue.length && !alive) {
      this.nightOver = true;
      this.nightClearTimer = 0;
      this.emit('event', {
        kicker: 'The last shadow fades',
        title: 'Dawn is near',
        sub: 'The lanterns gutter. The field is quiet.',
        duration: 2800,
      });
      this.audio.dawn();
    }
    if (this.nightOver) {
      this.nightClearTimer += dt;
      if (this.nightClearTimer >= NIGHT_CLEAR_DELAY) this.finishNight();
    }
  }

  finishNight() {
    if (this.phase !== 'night') return;
    this.stats.nights = this.day;
    const reward = NIGHT_REWARDS[this.day] || 200;
    this.nightReward = reward;
    this.coins += reward;
    this.stats.coinsEarned += reward;
    this.enemies = [];
    this.projectiles = [];
    this.rings = [];
    this.phase = 'dawn';
    this.phaseTime = 0;
    this.dawnTimer = 0;
    this.hearts = Math.min(MAX_HEARTS, this.hearts + 3);
    this.water = WATER_CAPACITY;
    this.audio.setPhase('day');
    this.audio.dawn();
    if (this.day >= TOTAL_NIGHTS) {
      this.victory();
      return;
    }
    this.emit('dawn', { night: this.day, reward, hearts: this.hearts });

    // Crops grow at first light if they were watered.
    let grew = 0;
    let matured = 0;
    for (const plot of this.plots) {
      if (!plot.crop) continue;
      if (plot.watered) {
        plot.crop.growth = Math.min(this.cropDef(plot.crop).days, plot.crop.growth + 1);
        grew++;
        if (plot.crop.growth >= this.cropDef(plot.crop).days) {
          matured++;
          this.spawnHarvestSparkle(plot);
        }
      }
      plot.watered = false;
    }
    if (grew > 0) {
      this.emit('toast', {
        text: matured > 0 ? `${matured} crop${matured > 1 ? 's' : ''} ready to harvest.` : `${grew} crop${grew > 1 ? 's' : ''} grew overnight.`,
        tone: 'good', icon: '#i-sparkle',
      });
    }
  }

  startDay(n) {
    this.phase = 'day';
    this.day = n;
    this.phaseTime = 0;
    this.enemies = [];
    this.spawnQueue = [];
    this.projectiles = [];
    this.rings = [];
    this.nightOver = false;
    this.water = WATER_CAPACITY;
    this.player.x = 700;
    this.player.y = 500;
    this.walkTarget = null;
    this.audio.setPhase('day');
    this.emit('day-start', { day: n });
    this.emit('event', {
      kicker: `Day ${n} of ${TOTAL_NIGHTS}`,
      title: n === 2 ? 'Morning light' : `Day ${n}`,
      sub: 'The field is dew-wet. Tend what you can before dusk.',
      duration: 3200,
    });
  }

  victory() {
    this.mode = 'ended';
    this.phase = 'dawn';
    this.emit('mode', this.mode);
    this.emit('ended', {
      victory: true,
      stats: { ...this.stats, nights: TOTAL_NIGHTS },
    });
    this.audio.victory();
  }

  gameOver() {
    this.mode = 'ended';
    this.emit('mode', this.mode);
    this.emit('ended', {
      victory: false,
      stats: { ...this.stats },
    });
    this.audio.defeat();
  }

  // ---------------------------------------------------------------- farming

  cropDef(crop) {
    return CROPS[crop.type];
  }

  selectedToolDef() {
    return TOOLS[this.selectedTool];
  }

  selectTool(index) {
    this.selectedTool = clamp(index, 0, TOOLS.length - 1);
    this.audio.click();
    this.emit('tool', this.selectedTool);
    const tool = TOOLS[this.selectedTool];
    if (tool.kind === 'seed') {
      const crop = CROPS[tool.id];
      this.emit('toast', {
        text: `${crop.name} seed · ${crop.cost} coins · sells for ${crop.sell} after ${crop.days} day${crop.days > 1 ? 's' : ''}.`,
        tone: '', icon: crop.icon, short: true,
      });
    }
  }

  actOnPlot(plot) {
    if (!plot) return;
    const tool = TOOLS[this.selectedTool];
    if (plot.crop) {
      const def = CROPS[plot.crop.type];
      if (plot.crop.growth >= def.days) {
        this.harvest(plot);
      } else if (!plot.watered) {
        this.waterPlot(plot);
      } else {
        const left = def.days - plot.crop.growth;
        this.emit('toast', {
          text: `${def.name} is watered — ${left} more day${left > 1 ? 's' : ''} until harvest.`,
          tone: '', icon: def.icon, short: true,
        });
        this.audio.error();
      }
      return;
    }
    if (!plot.tilled) {
      this.tillPlot(plot);
      if (tool.kind !== 'seed') return;
    }
    if (tool.kind === 'seed') {
      this.plantSeed(plot, tool.id);
    } else if (tool.id === 'water') {
      this.waterPlot(plot);
    } else {
      this.emit('toast', { text: 'Choose a seed from the hotbar to plant here.', tone: '', icon: '#i-sparkle', short: true });
    }
  }

  tillPlot(plot) {
    if (plot.tilled) return;
    plot.tilled = true;
    plot.watered = false;
    this.audio.till();
    this.burst(plot.x, plot.y + 8, 12, ['#6d4a30', '#8b6240', '#4e3524'], 1.1, 34, 0.55);
    this.emit('tool-done', 'till');
    if (!this.tutorial.till) {
      this.tutorial.till = true;
      this.emit('toast', { text: 'Soil turned. Choose a seed, then plant and water it.', tone: 'good', icon: '#i-hoe' });
    }
  }

  plantSeed(plot, type) {
    if (plot.crop) return;
    const def = CROPS[type];
    if (this.coins < def.cost) {
      this.audio.error();
      this.emit('toast', { text: `You need ${def.cost - this.coins} more coins for ${def.name} seeds.`, tone: 'warn', icon: '#i-coin' });
      return;
    }
    this.coins -= def.cost;
    if (!plot.tilled) plot.tilled = true;
    plot.crop = { type, growth: 0 };
    this.stats.planted++;
    this.audio.plant();
    this.burst(plot.x, plot.y, 8, ['#7da961', '#a9c87d', '#5e7f4a'], 0.9, 26, 0.45);
    this.floaters.push({ text: `-${def.cost}`, x: plot.x, y: plot.y - 22, vy: -22, life: 1, maxLife: 1, color: '#f2c96a', size: 12 });
    if (!this.tutorial.plant) {
      this.tutorial.plant = true;
      this.emit('toast', { text: 'Planted. Water it before dusk or it will not grow.', tone: 'good', icon: def.icon });
    }
    this.emit('tool-done', 'plant');
  }

  waterPlot(plot) {
    if (!plot.tilled) {
      this.emit('toast', { text: 'Till the soil before watering.', tone: '', icon: '#i-water', short: true });
      this.audio.error();
      return;
    }
    if (plot.watered) {
      this.emit('toast', { text: 'This plot is already watered.', tone: '', icon: '#i-water', short: true });
      return;
    }
    if (this.water <= 0) {
      this.audio.error();
      this.emit('toast', { text: 'The watering can is empty. Refill at the well.', tone: 'warn', icon: '#i-water' });
      return;
    }
    this.water--;
    plot.watered = true;
    this.audio.water();
    this.burst(plot.x, plot.y + 6, 10, ['#8fe0f0', '#c8f4ff', '#5fb8d8'], 0.9, 24, 0.5);
    this.emit('tool-done', 'water');
    if (!this.tutorial.water) {
      this.tutorial.water = true;
      this.emit('toast', { text: 'Watered. Crops grow at dawn. Rest at the farmhouse door when ready.', tone: 'good', icon: '#i-water' });
    }
  }

  harvest(plot) {
    const crop = plot.crop;
    if (!crop) return;
    const def = CROPS[crop.type];
    if (crop.growth < def.days) return;
    this.coins += def.sell;
    this.stats.coinsEarned += def.sell;
    this.stats.harvested++;
    plot.crop = null;
    plot.watered = false;
    plot.tilled = true;
    this.audio.harvest();
    this.audio.coin();
    this.floaters.push({
      text: `+${def.sell}`, x: plot.x, y: plot.y - 24, vy: -30, life: 1.35,
      maxLife: 1.35, color: '#ffe29b', size: 15,
    });
    this.burst(plot.x, plot.y - 6, 18, [def.color, '#f2c96a', '#ffffff', '#86ad6c'], 1.4, 60, 0.75);
    if (!this.tutorial.harvest) {
      this.tutorial.harvest = true;
      this.emit('toast', { text: `${def.name} harvested. Moon coins keep the lanterns lit.`, tone: 'good', icon: '#i-coin' });
    }
    this.emit('tool-done', 'harvest');
  }

  refillWater() {
    if (this.water >= WATER_CAPACITY) {
      this.emit('toast', { text: 'The watering can is already full.', tone: '', icon: '#i-water', short: true });
      return;
    }
    this.water = WATER_CAPACITY;
    this.audio.water();
    this.burst(WELL.x, WELL.y - 20, 14, ['#8fe0f0', '#c8f4ff', '#6fc2da'], 1.1, 44, 0.6);
    this.emit('toast', { text: 'Watering can refilled to the brim.', tone: 'good', icon: '#i-water', short: true });
  }

  // ---------------------------------------------------------------- towers

  buildTower(typeId) {
    const pad = this.selectedPad;
    if (!pad || pad.tower) return false;
    const type = TOWER_TYPES[typeId];
    if (!type) return false;
    const cost = type.levels[0].cost;
    if (this.coins < cost) {
      this.audio.error();
      this.emit('toast', { text: `You need ${cost - this.coins} more coins for a ${type.name}.`, tone: 'warn', icon: '#i-coin' });
      return false;
    }
    this.coins -= cost;
    this.stats.built++;
    this.addTowerToPad(pad, typeId, false);
    this.audio.build();
    this.shake = Math.max(this.shake, 4);
    this.burst(pad.x, pad.y, 26, [type.color, '#f2c96a', '#ffffff', '#6b5a3c'], 1.5, 70, 0.9);
    this.rings.push({ x: pad.x, y: pad.y, r: 10, maxR: 66, life: 0.55, maxLife: 0.55, color: type.color, width: 3 });
    if (!this.tutorial.build) {
      this.tutorial.build = true;
      this.emit('toast', { text: 'A ward is raised. It will fire on its own — keep the path covered.', tone: 'good', icon: type.icon });
    }
    this.emit('build-done', { pad, type });
    this.closeBuild();
    return true;
  }

  addTowerToPad(pad, typeId, silent) {
    const type = TOWER_TYPES[typeId];
    const tower = {
      id: `tower-${pad.id}-${this.time}`,
      typeId,
      pad,
      x: pad.x,
      y: pad.y,
      level: 1,
      cooldown: Math.random() * 0.5,
      angle: -Math.PI / 2,
      recoil: 0,
      spin: Math.random() * TAU,
      invested: type.levels[0].cost,
      firing: 0,
      builtAt: this.time,
    };
    pad.tower = tower;
    this.towers.push(tower);
    if (!silent) this.emit('hud-dirty');
    return tower;
  }

  upgradeTower() {
    const pad = this.selectedPad;
    const tower = pad?.tower;
    if (!tower) return;
    const type = TOWER_TYPES[tower.typeId];
    if (tower.level >= 3) {
      this.emit('toast', { text: 'This ward is already at its final form.', tone: '', icon: type.icon, short: true });
      return;
    }
    const next = type.levels[tower.level];
    if (this.coins < next.cost) {
      this.audio.error();
      this.emit('toast', { text: `Upgrading needs ${next.cost - this.coins} more coins.`, tone: 'warn', icon: '#i-coin' });
      return;
    }
    this.coins -= next.cost;
    tower.invested += next.cost;
    tower.level++;
    this.audio.upgrade();
    this.burst(tower.x, tower.y - 16, 20, [type.color, '#fff3c4', '#f2c96a'], 1.3, 55, 0.8);
    this.rings.push({ x: tower.x, y: tower.y, r: 6, maxR: 52, life: 0.6, maxLife: 0.6, color: type.color, width: 3 });
    this.emit('build-done', { pad, type });
  }

  sellTower() {
    const pad = this.selectedPad;
    const tower = pad?.tower;
    if (!tower) return;
    const type = TOWER_TYPES[tower.typeId];
    const refund = Math.floor(tower.invested * 0.62);
    this.coins += refund;
    pad.tower = null;
    this.towers = this.towers.filter((t) => t !== tower);
    this.audio.coin();
    this.floaters.push({ text: `+${refund}`, x: tower.x, y: tower.y - 20, vy: -26, life: 1.2, maxLife: 1.2, color: '#ffe29b', size: 14 });
    this.burst(tower.x, tower.y, 16, ['#9a8060', '#c4a777', type.color], 1.1, 46, 0.7);
    this.emit('toast', { text: `${type.name} dismantled. ${refund} coins returned.`, tone: '', icon: '#i-coin', short: true });
    this.selectedPad = null;
    this.closeBuild();
  }

  openBuild(pad) {
    if (!pad) return;
    this.selectedPad = pad;
    this.mode = 'build';
    this.audio.click();
    this.emit('mode', this.mode);
    this.emit('build-open', { pad });
  }

  closeBuild() {
    this.selectedPad = null;
    if (this.mode === 'build') {
      this.mode = 'playing';
      this.emit('mode', this.mode);
    }
    this.emit('build-close');
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.emit('mode', this.mode);
    this.emit('pause');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.emit('mode', this.mode);
  }

  // ---------------------------------------------------------------- combat

  spawnEnemy(typeId) {
    const base = ENEMY_TYPES[typeId];
    const scale = 1 + (this.day - 1) * 0.14;
    const hp = Math.round(base.hp * scale);
    const e = {
      id: `e-${Math.random().toString(36).slice(2, 9)}`,
      type: typeId,
      hp,
      maxHp: hp,
      baseSpeed: base.speed * (1 + (this.day - 1) * 0.018),
      speed: base.speed,
      damage: base.damage,
      radius: base.radius,
      color: base.color,
      d: -Math.random() * 12,
      x: -40,
      y: 150,
      angle: 0,
      dead: false,
      slowTimer: 0,
      slowFactor: 1,
      hitFlash: 0,
      bob: Math.random() * TAU,
      spawn: 0,
    };
    this.enemies.push(e);
    this.burst(e.x + 30, e.y, 10, ['#6d5aa8', '#3a2d56', '#a68ce0'], 1, 40, 0.7);
  }

  getTowerStats(tower) {
    return TOWER_TYPES[tower.typeId].levels[tower.level - 1];
  }

  updateTowers(dt) {
    for (const tower of this.towers) {
      const stats = this.getTowerStats(tower);
      tower.cooldown -= dt;
      tower.recoil = Math.max(0, tower.recoil - dt * 5);
      tower.spin += dt * (tower.typeId === 'frost' ? 1.9 : 0.7);
      if (tower.firing > 0) tower.firing -= dt;
      if (tower.cooldown > 0) continue;
      if (tower.typeId === 'frost') {
        const hit = this.enemies.filter((e) => !e.dead && dist(tower.x, tower.y, e.x, e.y) <= stats.range + e.radius);
        if (hit.length) {
          tower.cooldown = stats.cd;
          tower.firing = 0.3;
          this.rings.push({
            x: tower.x, y: tower.y, r: 8, maxR: stats.range,
            life: 0.5, maxLife: 0.5, color: '#a8dcff', width: 2,
          });
          for (const e of hit) {
            this.damageEnemy(e, stats.dmg);
            this.applySlow(e, stats.slow, stats.slowTime);
          }
          if (this.shotSfxTimer <= 0) {
            this.audio.frost();
            this.shotSfxTimer = 0.22;
          }
        }
        continue;
      }
      let target = null;
      let best = -Infinity;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = dist(tower.x, tower.y, e.x, e.y);
        if (d <= stats.range + e.radius && e.d > best) {
          best = e.d;
          target = e;
        }
      }
      if (target) {
        tower.cooldown = stats.cd;
        tower.recoil = 1;
        tower.firing = 0.2;
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.typeId === 'lantern') {
          this.projectiles.push({
            kind: 'bolt', x: tower.x + Math.cos(tower.angle) * 16, y: tower.y - 30,
            target, speed: 430, dmg: stats.dmg, color: '#ffd479', life: 2.4, trail: [],
          });
          if (this.shotSfxTimer <= 0) {
            this.audio.shoot();
            this.shotSfxTimer = 0.12;
          }
        } else {
          this.projectiles.push({
            kind: 'seed', sx: tower.x, sy: tower.y - 34, x: tower.x, y: tower.y - 34,
            tx: target.x, ty: target.y, t: 0, dur: 0.55,
            dmg: stats.dmg, splash: stats.splash, color: '#a6d27e', target,
          });
          if (this.shotSfxTimer <= 0) {
            this.audio.bramble();
            this.shotSfxTimer = 0.18;
          }
        }
      }
    }
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.spawn = Math.min(1, e.spawn + dt * 3);
      e.bob += dt * 2.2;
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        e.slowFactor = e.slowAmount || 0.6;
      } else {
        e.slowFactor = 1;
      }
      const speed = e.baseSpeed * e.slowFactor;
      e.d += speed * dt;
      const pos = pointAtDistance(this.path, e.d);
      e.x = pos.x;
      e.y = pos.y;
      e.angle = pos.angle;
      if (e.d >= this.path.length - 3) {
        this.enemyReachedHouse(e);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }

  applySlow(enemy, amount, time) {
    if (!enemy || enemy.dead) return;
    enemy.slowAmount = 1 - amount;
    enemy.slowFactor = Math.min(enemy.slowFactor, 1 - amount);
    enemy.slowTimer = Math.max(enemy.slowTimer, time);
  }

  damageEnemy(enemy, amount) {
    if (!enemy || enemy.dead) return;
    enemy.hp -= amount;
    enemy.hitFlash = 1;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      this.stats.kills++;
      this.nightKills++;
      this.audio.enemyDie();
      const colors = enemy.type === 'wisp'
        ? ['#9be9f5', '#e6ffff', '#5fb8d8']
        : enemy.type === 'brute'
          ? ['#5a3f66', '#8c6ba6', '#2c2038']
          : ['#4b3a78', '#9c86d4', '#221a38'];
      this.burst(enemy.x, enemy.y, enemy.type === 'boss' ? 50 : 16, colors, 1.2, enemy.type === 'boss' ? 110 : 55, 0.9);
      const reward = enemy.type === 'boss' ? 60 : 2;
      this.coins += reward;
      this.stats.coinsEarned += reward;
      if (reward > 2) {
        this.floaters.push({ text: `+${reward}`, x: enemy.x, y: enemy.y - 18, vy: -22, life: 1, maxLife: 1, color: '#ffe29b', size: 13 });
      }
      if (enemy.type === 'boss') {
        this.shake = Math.max(this.shake, 10);
        this.emit('toast', { text: 'The Hollow Stag falls. The night loosens its grip.', tone: 'good', icon: '#i-sparkle' });
      }
    }
  }

  enemyReachedHouse(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.hearts = Math.max(0, this.hearts - enemy.damage);
    this.shake = Math.max(this.shake, 8 + enemy.damage * 2);
    this.redFlash = 1;
    this.audio.hearthHit();
    this.burst(HOUSE.doorX, HOUSE.doorY - 20, 20, ['#ff9f6e', '#ffd479', '#7c3f3f'], 1.3, 70, 1);
    this.floaters.push({
      text: `-${enemy.damage}`, x: HOUSE.doorX, y: HOUSE.doorY - 44, vy: -30,
      life: 1.2, maxLife: 1.2, color: '#ff9f8e', size: 17,
    });
    this.emit('hearth-hit', { damage: enemy.damage, hearts: this.hearts });
    if (this.hearts <= 0) this.gameOver();
  }

  // ---------------------------------------------------------------- projectiles

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (p.kind === 'bolt') {
        const target = p.target;
        if (!target || target.dead) {
          p.life -= dt;
          p.x += Math.cos(p.angle || 0) * p.speed * dt * 0.4;
          p.y += Math.sin(p.angle || 0) * p.speed * dt * 0.4;
          if (p.life <= 0) p.dead = true;
          continue;
        }
        const dx = target.x - p.x;
        const dy = target.y - 8 - p.y;
        const d = Math.hypot(dx, dy);
        p.angle = Math.atan2(dy, dx);
        if (d < 13) {
          p.dead = true;
          this.damageEnemy(target, p.dmg);
          this.burst(target.x, target.y - 8, 7, ['#ffe29b', '#f2c96a', '#fff8dc'], 0.7, 32, 0.45);
          continue;
        }
        p.trail.push({ x: p.x, y: p.y, life: 0.25 });
        if (p.trail.length > 9) p.trail.shift();
        p.x += (dx / d) * p.speed * dt;
        p.y += (dy / d) * p.speed * dt;
        p.life -= dt;
        if (p.life <= 0) p.dead = true;
      } else if (p.kind === 'seed') {
        p.t += dt / p.dur;
        if (p.t >= 1) {
          p.dead = true;
          this.damageArea(p.tx, p.ty, p.splash, p.dmg);
          this.rings.push({ x: p.tx, y: p.ty, r: 4, maxR: p.splash, life: 0.42, maxLife: 0.42, color: '#a6d27e', width: 4 });
          this.burst(p.tx, p.ty, 16, ['#a6d27e', '#7da961', '#4c6e3c', '#d9e8a8'], 0.9, 64, 0.8);
          this.audio.hit();
          continue;
        }
        const targetX = p.target && !p.target.dead ? p.target.x : p.tx;
        const targetY = p.target && !p.target.dead ? p.target.y : p.ty;
        p.tx = lerp(p.tx, targetX, 0.14);
        p.ty = lerp(p.ty, targetY, 0.14);
        p.x = lerp(p.sx, p.tx, p.t);
        p.y = lerp(p.sy, p.ty, p.t) - Math.sin(p.t * Math.PI) * 60;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  damageArea(x, y, radius, dmg) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (dist(x, y, e.x, e.y) <= radius + e.radius) {
        this.damageEnemy(e, dmg);
        this.applySlow(e, 0.18, 0.8);
      }
    }
  }

  fireFlare(x, y) {
    if (this.phase !== 'night') {
      this.emit('toast', { text: 'The lantern flare is only needed after dark.', tone: '', icon: '#i-flame', short: true });
      return;
    }
    if (this.flare.cooldown > 0) {
      this.audio.error();
      return;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const target = this.nearestEnemy(this.player.x, this.player.y, 600);
      x = target ? target.x : this.player.x;
      y = target ? target.y : this.player.y - 60;
    }
    this.flare.cooldown = this.flare.max;
    this.stats.flares++;
    this.audio.flare();
    this.shake = Math.max(this.shake, 4);
    this.flareLights.push({ x, y, life: 1.4, maxLife: 1.4 });
    this.rings.push({ x, y, r: 8, maxR: 88, life: 0.55, maxLife: 0.55, color: '#ffd479', width: 4 });
    this.burst(x, y, 28, ['#ffe29b', '#ffb86b', '#fff8dc', '#ff8f5e'], 1.3, 100, 1);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < 86) {
        this.damageEnemy(e, 48 + this.day * 9);
        this.applySlow(e, 0.3, 1.2);
      }
    }
    this.emit('flare');
  }

  nearestEnemy(x, y, maxDist = Infinity) {
    let best = null;
    let bd = maxDist;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- particles

  burst(x, y, count, colors, life = 1, speed = 50, size = 0.6) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.35 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 8,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.55 + Math.random() * 0.9),
        color: colors[(Math.random() * colors.length) | 0],
        gravity: 52,
        drag: 0.93,
        kind: 'dot',
        spin: Math.random() * TAU,
      });
    }
  }

  spawnHarvestSparkle(plot) {
    this.burst(plot.x, plot.y - 8, 10, ['#ffe29b', '#fff8dc', '#bde7ff'], 1.2, 38, 0.45);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.vx *= p.drag || 0.96;
      p.vy *= p.drag || 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  updateFloaters(dt) {
    for (const f of this.floaters) {
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.97;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  updateRings(dt) {
    for (const r of this.rings) {
      r.life -= dt;
      const t = 1 - r.life / r.maxLife;
      r.r = lerp(r.r, r.maxR, Math.min(1, dt * 9));
      r.alpha = Math.max(0, 1 - t);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const l of this.flareLights) l.life -= dt;
    this.flareLights = this.flareLights.filter((l) => l.life > 0);
  }

  // ---------------------------------------------------------------- interaction

  updateNearby() {
    this.nearby = this.findNearby();
  }

  findNearby() {
    const p = this.player;
    let best = null;
    const consider = (kind, target, radius, prompt) => {
      const d = dist(p.x, p.y, target.x, target.y);
      if (d <= radius && (!best || d < best.dist)) {
        best = { kind, target, dist: d, prompt };
      }
    };
    for (const plot of this.plots) {
      if (dist(p.x, p.y, plot.x, plot.y) > 78) continue;
      consider('plot', plot, 78, this.plotPrompt(plot));
    }
    for (const pad of this.pads) {
      if (pad.tower) consider('tower', pad, 66, `Inspect the ${TOWER_TYPES[pad.tower.typeId].name}`);
      else consider('pad', pad, 62, 'Build a ward on this stone pad');
    }
    consider('well', WELL, 98, this.water >= WATER_CAPACITY ? 'The can is full' : 'Refill the watering can');
    if (this.phase === 'day' || this.phase === 'dawn') {
      consider('door', { x: HOUSE.doorX, y: HOUSE.doorY + 18 }, 92, 'Rest until nightfall');
    }
    return best;
  }

  plotPrompt(plot) {
    const tool = TOOLS[this.selectedTool];
    if (plot.crop) {
      const def = CROPS[plot.crop.type];
      if (plot.crop.growth >= def.days) return `Harvest the ${def.name}`;
      if (!plot.watered) return `Water the ${def.name}`;
      return `${def.name} is watered`;
    }
    if (!plot.tilled) {
      if (tool.kind === 'seed') return `Plant ${CROPS[tool.id].name} (tills first)`;
      return 'Till the soil';
    }
    if (tool.kind === 'seed') return `Plant ${CROPS[tool.id].name}`;
    if (tool.id === 'water') return 'Water the soil';
    return 'Choose a seed to plant';
  }

  contextPrompt() {
    if (this.nearby) {
      return { key: 'Space', text: this.nearby.prompt };
    }
    if (this.phase === 'night') {
      return { key: 'F', text: 'Cast a lantern flare at the shadows' };
    }
    return null;
  }

  contextAction() {
    if (this.mode !== 'playing') return;
    if (this.nearby) {
      this.actOnNearby(this.nearby);
      return;
    }
    if (this.phase === 'night') {
      const target = this.pointer.active ? this.pointer : this.nearestEnemy(this.player.x, this.player.y, 620);
      this.fireFlare(target ? target.x : this.player.x, target ? target.y : this.player.y - 80);
      return;
    }
    this.emit('toast', { text: 'Walk closer to a plot, stone pad, or the well.', tone: '', icon: '#i-sparkle', short: true });
  }

  actOnNearby(near) {
    if (!near) return;
    if (near.kind === 'plot') this.actOnPlot(near.target);
    else if (near.kind === 'pad' || near.kind === 'tower') this.openBuild(near.target);
    else if (near.kind === 'well') this.refillWater();
    else if (near.kind === 'door') {
      if (this.phase !== 'day') return;
      this.audio.click();
      this.emit('toast', { text: 'You bank the fire and wait for dusk…', tone: '', icon: '#i-moon' });
      this.beginNight();
    }
  }

  pointerDown(x, y) {
    if (this.mode !== 'playing') return;
    this.pointer.active = true;
    this.pointer.x = x;
    this.pointer.y = y;
    const clickedPad = this.padAt(x, y);
    const clickedTower = clickedPad?.tower ? clickedPad : null;
    const clickedPlot = this.plotAt(x, y);
    const clickedWell = dist(x, y, WELL.x, WELL.y) < 52 ? WELL : null;
    const clickedDoor = this.phase === 'day' && dist(x, y, HOUSE.doorX, HOUSE.doorY + 20) < 76;

    if (this.phase === 'night') {
      if (clickedPad) {
        if (this.isPlayerNear(clickedPad, 92)) this.openBuild(clickedPad);
        else this.walkTo(clickedPad.x, clickedPad.y, 58, () => this.openBuild(clickedPad));
        return;
      }
      this.fireFlare(x, y);
      return;
    }

    if (this.phase === 'dawn') return;

    const p = this.player;
    if (clickedPlot) {
      if (this.isPlayerNear(clickedPlot, 78)) this.actOnPlot(clickedPlot);
      else this.walkTo(clickedPlot.x, clickedPlot.y, 52, () => this.actOnPlot(clickedPlot));
      return;
    }
    if (clickedPad) {
      if (this.isPlayerNear(clickedPad, 66)) this.openBuild(clickedPad);
      else this.walkTo(clickedPad.x, clickedPad.y, 58, () => this.openBuild(clickedPad));
      return;
    }
    if (clickedWell) {
      if (dist(p.x, p.y, WELL.x, WELL.y) < 98) this.refillWater();
      else this.walkTo(WELL.x, WELL.y + 40, 66, () => this.refillWater());
      return;
    }
    if (clickedDoor) {
      if (dist(p.x, p.y, HOUSE.doorX, HOUSE.doorY + 18) < 92) this.actOnNearby({ kind: 'door' });
      else this.walkTo(HOUSE.doorX, HOUSE.doorY + 48, 70, () => this.actOnNearby({ kind: 'door' }));
      return;
    }
    this.walkTo(x, y, 2, null);
  }

  pointerMove(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.hoverPad = this.padAt(x, y);
    this.hoverPlot = this.plotAt(x, y);
  }

  isPlayerNear(target, radius) {
    return dist(this.player.x, this.player.y, target.x, target.y) <= radius;
  }

  plotAt(x, y) {
    for (const plot of this.plots) {
      if (Math.abs(x - plot.x) <= plot.size / 2 + 4 && Math.abs(y - plot.y) <= plot.size / 2 + 4) return plot;
    }
    return null;
  }

  padAt(x, y) {
    for (const pad of this.pads) {
      if (dist(x, y, pad.x, pad.y) <= 54) return pad;
    }
    return null;
  }

  walkTo(x, y, stop = 2, action = null) {
    this.walkTarget = { x, y, stop, action };
    this.walkStuck = 0;
  }

  // ---------------------------------------------------------------- presentation helpers

  getObjective() {
    if (this.phase === 'night') {
      const remaining = this.enemies.filter((e) => !e.dead).length + Math.max(0, this.spawnQueue.length - this.spawnIndex);
      if (this.nightTime < NIGHT_PREP) {
        return { label: `Night ${this.day}`, text: 'Shadows gather at the treeline. Raise a ward on a stone pad.' };
      }
      if (this.nightOver) return { label: 'First light', text: 'The last shadow is fading. Hold on until dawn.' };
      return {
        label: `Night ${this.day}`,
        text: `Hold until dawn — ${remaining} shadow${remaining === 1 ? '' : 's'} still stirring.`,
      };
    }
    if (this.phase === 'dawn') {
      return { label: 'Dawn', text: 'The field is safe. A new day is beginning.' };
    }
    const planted = this.plots.filter((p) => p.crop).length;
    const unwatered = this.plots.filter((p) => p.crop && !p.watered).length;
    const mature = this.plots.filter((p) => p.crop && p.crop.growth >= CROPS[p.crop.type].days).length;
    if (this.day === 1 && planted < 3) {
      return {
        label: 'Day one',
        text: `Till the field and plant three crops — ${planted} of 3 planted.`,
      };
    }
    if (mature > 0) {
      return { label: 'Harvest', text: `${mature} crop${mature === 1 ? ' is' : 's are'} ready. Gather them before dusk.` };
    }
    if (unwatered > 0) {
      return { label: 'Before dusk', text: `${unwatered} crop${unwatered === 1 ? '' : 's'} need water to grow overnight.` };
    }
    if (this.day === 1) {
      return { label: 'Day one', text: 'Good work. Rest at the farmhouse door when you are ready for night.' };
    }
    return {
      label: `Day ${this.day}`,
      text: 'Tend the field, raise another ward, or rest at the door to call dusk.',
    };
  }

  getTip() {
    if (this.phase === 'night') {
      return `${this.pointerVerb} a stone pad to raise a ward · F or click the ground to cast a flare`;
    }
    if (this.phase === 'dawn') return 'Crops grow overnight when watered. The hearth mends at dawn.';
    if (this.nearby?.kind === 'well') return 'Water is free. Fill the can whenever it runs low.';
    if (this.selectedToolDef().kind === 'seed') return `${this.pointerVerb} a plot to walk over and plant · Space acts on the nearest plot.`;
    return `${this.pointerVerb} a plot to walk over and tend it · Rest at the farmhouse door to call dusk.`;
  }

  getTimeLabel() {
    if (this.phase === 'night') return 'Night';
    if (this.phase === 'dawn') return 'Dawn';
    const t = this.phaseTime / DAY_LENGTH;
    if (t < 0.3) return 'Morning';
    if (t < 0.62) return 'Afternoon';
    if (t < 0.85) return 'Golden hour';
    return 'Dusk';
  }

  getPhaseTimer() {
    if (this.phase === 'day') return formatTime(DAY_LENGTH - this.phaseTime);
    if (this.phase === 'night') {
      const remaining = this.enemies.filter((e) => !e.dead).length + Math.max(0, this.spawnQueue.length - this.spawnIndex);
      return remaining > 0 ? `${remaining}` : '—';
    }
    return '—';
  }

  getPhaseProgress() {
    if (this.phase === 'day') return clamp(1 - this.phaseTime / DAY_LENGTH, 0, 1);
    if (this.phase === 'night') {
      const total = Math.max(1, this.nightTotal);
      const remaining = this.enemies.filter((e) => !e.dead).length + Math.max(0, this.spawnQueue.length - this.spawnIndex);
      return clamp(1 - remaining / total, 0, 1);
    }
    return 1;
  }

  getNightProgress() {
    const total = Math.max(1, this.nightTotal);
    const remaining = this.enemies.filter((e) => !e.dead).length + Math.max(0, this.spawnQueue.length - this.spawnIndex);
    return clamp(1 - remaining / total, 0, 1);
  }
}
