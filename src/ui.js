import { TOOLS, TOWER_TYPES, WATER_CAPACITY, TOTAL_NIGHTS } from './constants.js';
import { clamp } from './utils.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game, audio, renderer) {
    this.game = game;
    this.audio = audio;
    this.renderer = renderer;
    this.hud = $('hud');
    this.titleScreen = $('titleScreen');
    this.pauseScreen = $('pauseScreen');
    this.helpScreen = $('helpScreen');
    this.endScreen = $('endScreen');
    this.buildTray = $('buildTray');
    this.buildOptions = $('buildOptions');
    this.buildKicker = $('buildKicker');
    this.buildTitle = $('buildTitle');
    this.buildFoot = $('buildFoot');
    this.toastStack = $('toastStack');
    this.eventBanner = $('eventBanner');
    this.eventKicker = $('eventKicker');
    this.eventTitle = $('eventTitle');
    this.eventSub = $('eventSub');
    this.dawnBanner = $('dawnBanner');
    this.dawnKicker = $('dawnKicker');
    this.dawnTitle = $('dawnTitle');
    this.dawnSub = $('dawnSub');
    this.phaseCard = document.querySelector('.phase-card');
    this.phaseIconUse = document.querySelector('#phaseIcon use');
    this.phaseLabel = $('phaseLabel');
    this.phaseName = $('phaseName');
    this.phaseTimer = $('phaseTimer');
    this.phaseRing = $('phaseRing');
    this.coinCount = $('coinCount');
    this.heartsEl = $('hearts');
    this.mobileHealth = $('mobileHealth');
    this.mobileHeartCount = $('mobileHeartCount');
    this.objectiveLabel = $('objectiveLabel');
    this.objectiveText = $('objectiveText');
    this.objectiveChip = $('objectiveChip');
    this.contextHint = $('contextHint');
    this.contextText = $('contextText');
    this.contextKey = this.contextHint.querySelector('kbd');
    this.tipStrip = $('tipStrip');
    this.nightTools = $('nightTools');
    this.flareBtn = $('flareBtn');
    this.flareSweep = $('flareSweep');
    this.touchFlare = $('touchFlare');
    this.touchAct = $('touchAct');
    this.joystick = $('joystick');
    this.joystickStick = $('joystickStick');
    this.rotateTip = $('rotateTip');
    this.soundBtn = $('soundBtn');
    this.soundUse = this.soundBtn.querySelector('use');
    this.bannerTimer = null;
    this.dawnTimer = null;
    this.helpReturn = 'title';
    this.rotateTipUntil = 0;
    this.last = {};
    this.heartCount = 0;
    this.joystickPointer = null;
    this.joystickVector = { x: 0, y: 0 };

    this.buildHotbar();
    this.buildHearts();
    this.bind();
    this.game.on((type, data) => this.onGameEvent(type, data));
    this.syncSoundIcon();
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (touch) {
      const foot = $('titleFoot');
      if (foot) {
        foot.innerHTML = 'Joystick to walk <span class="dot">·</span> tap the farm to tend it <span class="dot">·</span> Act uses your tool';
      }
    }
    this.showOverlay(this.titleScreen, true);
    this.hud.classList.add('is-hidden');
  }

  // ---------------------------------------------------------------- setup

  buildHotbar() {
    const hotbar = $('hotbar');
    hotbar.innerHTML = TOOLS.map((tool, i) => {
      const isSeed = tool.kind === 'seed';
      return `<button class="slot" type="button" data-tool="${i}" title="${tool.name}" aria-label="${tool.name}">
        <span class="slot-key">${i + 1}</span>
        <span class="slot-icon"><svg><use href="${tool.icon}"/></svg></span>
        <span class="slot-name">${tool.name.replace(' Seed', '')}</span>
        <span class="slot-cost" data-cost="${i}">${isSeed ? `<svg><use href="#i-coin"/></svg>${tool.cost}` : tool.id === 'water' ? `${WATER_CAPACITY}/${WATER_CAPACITY}` : 'free'}</span>
      </button>`;
    }).join('');
    hotbar.addEventListener('click', (event) => {
      const btn = event.target.closest('.slot');
      if (!btn || this.game.mode !== 'playing') return;
      this.audio.init();
      this.game.selectTool(Number(btn.dataset.tool));
      this.updateHotbar();
    });
  }

  buildHearts() {
    this.heartsEl.innerHTML = Array.from({ length: 12 }, () => `<svg viewBox="0 0 32 32"><use href="#i-heart"/></svg>`).join('');
  }

  bind() {
    $('playBtn').addEventListener('click', () => {
      this.audio.init();
      this.audio.click();
      this.hideOverlay(this.titleScreen);
      this.game.startNewGame();
      this.renderer.resize(true);
    });
    $('howBtn').addEventListener('click', () => this.openHelp('title'));
    $('helpClose').addEventListener('click', () => this.closeHelp());
    $('helpDone').addEventListener('click', () => this.closeHelp());
    $('pauseBtn').addEventListener('click', () => {
      this.audio.init();
      this.game.pause();
    });
    $('resumeBtn').addEventListener('click', () => {
      this.audio.click();
      this.game.resume();
      this.hideOverlay(this.pauseScreen);
    });
    $('pauseHelpBtn').addEventListener('click', () => this.openHelp('pause'));
    $('restartBtn').addEventListener('click', () => {
      this.hideOverlay(this.pauseScreen);
      this.audio.init();
      this.audio.click();
      this.game.startNewGame();
    });
    $('endAgainBtn').addEventListener('click', () => {
      this.hideOverlay(this.endScreen);
      this.audio.init();
      this.audio.click();
      this.game.startNewGame();
    });
    $('endTitleBtn').addEventListener('click', () => {
      this.hideOverlay(this.endScreen);
      this.game.returnToTitle();
    });
    $('soundBtn').addEventListener('click', () => {
      this.audio.init();
      const muted = this.audio.toggle();
      this.syncSoundIcon();
      try { localStorage.setItem('moonglow-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    });
    $('buildClose').addEventListener('click', () => this.game.closeBuild());
    this.buildOptions.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action) {
        if (action.dataset.action === 'upgrade') this.game.upgradeTower();
        else if (action.dataset.action === 'sell') this.game.sellTower();
        return;
      }
      const option = event.target.closest('[data-type]');
      if (option) {
        this.game.buildTower(option.dataset.type);
      }
    });
    this.flareBtn.addEventListener('click', () => {
      this.audio.init();
      this.game.fireFlare(NaN, NaN);
    });
    this.touchAct.addEventListener('click', () => {
      this.audio.init();
      this.game.contextAction();
    });
    this.touchFlare.addEventListener('click', () => {
      this.audio.init();
      this.game.fireFlare(NaN, NaN);
    });
    this.bindJoystick();

    // Restore mute preference.
    try {
      if (localStorage.getItem('moonglow-muted') === '1') {
        this.audio.muted = true;
        this.audio.init();
        if (this.audio.master) this.audio.master.gain.value = 0;
        this.syncSoundIcon();
      }
    } catch { /* ignore */ }

    window.addEventListener('resize', () => this.positionRotateTip());
  }

  bindJoystick() {
    const el = this.joystick;
    const knob = this.joystickStick;
    const setFromEvent = (event) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const max = rect.width * 0.32;
      const len = Math.hypot(dx, dy);
      const k = len > max ? max / len : 1;
      const rx = dx * k;
      const ry = dy * k;
      knob.style.transform = `translate(calc(-50% + ${rx}px), calc(-50% + ${ry}px))`;
      const dead = 0.14;
      const nx = rx / max;
      const ny = ry / max;
      const mag = Math.hypot(nx, ny);
      this.joystickVector = {
        x: mag < dead ? 0 : nx * clamp((mag - dead) / (1 - dead), 0, 1),
        y: mag < dead ? 0 : ny * clamp((mag - dead) / (1 - dead), 0, 1),
      };
      this.game.moveVector = this.joystickVector;
    };
    el.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.audio.init();
      this.joystickPointer = event.pointerId;
      el.setPointerCapture(event.pointerId);
      setFromEvent(event);
    });
    el.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      event.preventDefault();
      setFromEvent(event);
    });
    const end = (event) => {
      if (event.pointerId !== this.joystickPointer) return;
      this.joystickPointer = null;
      knob.style.transform = 'translate(-50%, -50%)';
      this.joystickVector = { x: 0, y: 0 };
      this.game.moveVector = this.joystickVector;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  syncSoundIcon() {
    const muted = this.audio.muted;
    this.soundUse.setAttribute('href', muted ? '#i-muted' : '#i-sound');
    this.soundBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    this.soundBtn.title = muted ? 'Unmute sound' : 'Mute sound';
  }

  // ---------------------------------------------------------------- event handling

  onGameEvent(type, data) {
    if (type === 'toast') this.addToast(data);
    else if (type === 'event') this.showEvent(data);
    else if (type === 'dawn') this.showDawn(data);
    else if (type === 'ended') this.showEnd(data);
    else if (type === 'mode') this.onMode(data);
    else if (type === 'build-open') this.renderBuildTray(data.pad);
    else if (type === 'build-close') this.hideOverlay(this.buildTray);
    else if (type === 'build-done') {
      if (this.game.mode === 'build') this.renderBuildTray(this.game.selectedPad);
    } else if (type === 'hearth-hit') {
      this.pulseHeart(data.hearts);
    } else if (type === 'night-start') {
      this.hideDawn();
      this.hideOverlay(this.eventBanner);
    }
  }

  onMode(mode) {
    const playing = mode === 'playing' || mode === 'paused' || mode === 'build';
    if (playing) {
      this.hud.classList.remove('is-hidden');
      this.hideOverlay(this.titleScreen);
      this.hideOverlay(this.endScreen);
      if (mode === 'paused') this.showOverlay(this.pauseScreen, true);
      else this.hideOverlay(this.pauseScreen);
      if (mode === 'playing') {
        this.rotateTipUntil = performance.now() + 6000;
      }
    } else if (mode === 'title') {
      this.hud.classList.add('is-hidden');
      this.showOverlay(this.titleScreen, true);
      this.hideOverlay(this.pauseScreen);
      this.hideOverlay(this.helpScreen);
      this.hideOverlay(this.endScreen);
      this.hideOverlay(this.buildTray);
      this.hideOverlay(this.dawnBanner);
      this.hideOverlay(this.eventBanner);
      this.renderer.resize(true);
    } else if (mode === 'ended') {
      this.hud.classList.add('is-hidden');
      this.hideOverlay(this.pauseScreen);
      this.hideOverlay(this.helpScreen);
      this.hideOverlay(this.buildTray);
    }
    // The title view and the in-game view use different framing.
    this.renderer.resize(true);
  }

  addToast(data) {
    if (!data?.text) return;
    const existing = [...this.toastStack.children].find((el) => el.dataset.text === data.text);
    if (existing) {
      existing.remove();
    }
    const el = document.createElement('div');
    el.className = `toast ${data.tone || ''}`;
    el.dataset.text = data.text;
    el.innerHTML = `<span class="toast-icon"><svg><use href="${data.icon || '#i-sparkle'}"/></svg></span><span>${data.text}</span>`;
    this.toastStack.appendChild(el);
    while (this.toastStack.children.length > 3) this.toastStack.firstElementChild.remove();
    const life = data.short ? 2300 : 3400;
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    }, life);
  }

  showEvent(data) {
    this.eventKicker.textContent = data.kicker || '';
    this.eventTitle.textContent = data.title || '';
    this.eventSub.textContent = data.sub || '';
    this.eventBanner.classList.remove('is-hidden');
    this.eventBanner.classList.add('visible');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.eventBanner.classList.remove('visible');
      setTimeout(() => this.eventBanner.classList.add('is-hidden'), 500);
    }, data.duration || 3600);
  }

  showDawn(data) {
    this.dawnKicker.textContent = `Night ${data.night} survived`;
    this.dawnTitle.textContent = 'Dawn breaks';
    this.dawnSub.textContent = `+${data.reward} moon coins · the hearth is mended`;
    this.dawnBanner.classList.remove('is-hidden');
    this.dawnBanner.classList.add('visible');
    clearTimeout(this.dawnTimer);
    this.dawnTimer = setTimeout(() => this.hideDawn(), 3300);
  }

  hideDawn() {
    this.dawnBanner.classList.remove('visible');
    this.dawnBanner.classList.add('is-hidden');
  }

  showEnd(data) {
    const victory = data.victory;
    $('endKicker').textContent = victory ? 'Seven nights survived' : 'The hollow keeps its own';
    $('endTitle').textContent = victory ? 'The hollow is quiet' : 'The hearth went dark';
    $('endSub').textContent = victory
      ? 'The Stag is gone, the lanterns still burn, and the field will see another morning. You kept the hollow.'
      : 'Shadows reached the farmhouse. The farm is not lost — not yet. Try another night.';
    const stats = data.stats || {};
    $('endStats').innerHTML = `
      <div class="stat-box"><strong>${victory ? TOTAL_NIGHTS : Math.max(0, stats.nights || 0)}</strong><span>Nights kept</span></div>
      <div class="stat-box"><strong>${stats.harvested || 0}</strong><span>Crops reaped</span></div>
      <div class="stat-box"><strong>${stats.kills || 0}</strong><span>Shadows turned</span></div>
    `;
    $('endAgainBtn').querySelector('span').textContent = victory ? 'Play again' : 'Try again';
    this.showOverlay(this.endScreen, true);
  }

  openHelp(from) {
    this.helpReturn = from;
    if (from === 'title') this.hideOverlay(this.titleScreen);
    if (from === 'pause') this.hideOverlay(this.pauseScreen);
    this.showOverlay(this.helpScreen, true);
  }

  closeHelp() {
    this.hideOverlay(this.helpScreen);
    if (this.helpReturn === 'title') this.showOverlay(this.titleScreen, true);
    else if (this.helpReturn === 'pause') this.showOverlay(this.pauseScreen, true);
  }

  handleEscape() {
    if (!this.helpScreen.classList.contains('is-hidden')) {
      this.closeHelp();
      return;
    }
    if (!this.buildTray.classList.contains('is-hidden')) {
      this.game.closeBuild();
      return;
    }
    if (this.game.mode === 'paused') {
      this.game.resume();
      this.hideOverlay(this.pauseScreen);
    } else if (this.game.mode === 'playing') {
      this.game.pause();
    }
  }

  showOverlay(el, visible) {
    if (!el) return;
    el.classList.toggle('is-hidden', !visible);
  }

  hideOverlay(el) {
    if (!el) return;
    el.classList.add('is-hidden');
  }

  // ---------------------------------------------------------------- build tray

  renderBuildTray(pad) {
    if (!pad) {
      this.hideOverlay(this.buildTray);
      return;
    }
    const tower = pad.tower;
    const coins = this.game.coins;
    if (!tower) {
      this.buildKicker.textContent = 'Carved stone pad';
      this.buildTitle.textContent = 'Raise a ward';
      this.buildFoot.textContent = 'Wards fire on their own, day or night. Place them close to the path.';
      this.buildOptions.innerHTML = Object.values(TOWER_TYPES).map((type) => {
        const cost = type.levels[0].cost;
        const disabled = coins < cost;
        return `<button class="ward-option" type="button" data-type="${type.id}" ${disabled ? 'disabled' : ''}>
          <div class="ward-top">
            <span class="ward-icon"><svg><use href="${type.icon}"/></svg></span>
            <span class="ward-cost"><svg viewBox="0 0 32 32"><use href="#i-coin"/></svg>${cost}</span>
          </div>
          <strong>${type.name}</strong>
          <p>${type.desc}</p>
          <span class="ward-stat">${type.stat}</span>
        </button>`;
      }).join('');
    } else {
      const type = TOWER_TYPES[tower.typeId];
      const stats = type.levels[tower.level - 1];
      const next = type.levels[tower.level];
      const refund = Math.floor(tower.invested * 0.62);
      this.buildKicker.textContent = `Ward · level ${tower.level} of 3`;
      this.buildTitle.textContent = type.name;
      const damageLine = tower.typeId === 'frost'
        ? `Pulse damage ${stats.dmg} · range ${stats.range} · slows ${Math.round(stats.slow * 100)}%`
        : tower.typeId === 'bramble'
          ? `Burst damage ${stats.dmg} · range ${stats.range} · splash ${stats.splash}`
          : `Bolt damage ${stats.dmg} · range ${stats.range} · every ${stats.cd.toFixed(2)}s`;
      const upgradeCost = next ? next.cost : 0;
      this.buildOptions.innerHTML = `<div class="ward-option built" style="grid-column:1/-1; min-height:0;">
        <div class="ward-top">
          <span class="ward-icon"><svg><use href="${type.icon}"/></svg></span>
          <span class="ward-cost">LV ${tower.level}</span>
        </div>
        <p>${damageLine}</p>
        <div class="tray-actions">
          <button class="tray-action gold" type="button" data-action="upgrade" ${next ? '' : 'disabled'}>
            ${next ? `Upgrade to LV ${tower.level + 1} · ${upgradeCost} coins` : 'Fully grown'}
          </button>
          <button class="tray-action danger" type="button" data-action="sell">Dismantle · +${refund} coins</button>
        </div>
      </div>`;
      this.buildFoot.textContent = next
        ? `Next: ${type.levels[tower.level].dmg} damage${type.id === 'frost' ? ` and ${Math.round(type.levels[tower.level].slow * 100)}% slow` : ''}.`
        : 'This ward has reached its final form.';
    }
    this.showOverlay(this.buildTray, true);
  }

  // ---------------------------------------------------------------- per-frame

  tick(dt) {
    const g = this.game;
    if (!g || g.mode === 'title') {
      if (!this.hud.classList.contains('is-hidden')) this.hud.classList.add('is-hidden');
      return;
    }
    if (g.mode === 'ended') return;
    if (this.hud.classList.contains('is-hidden')) return;

    // Phase and clock.
    const night = g.phase === 'night';
    this.phaseCard.classList.toggle('night', night);
    this.phaseIconUse.setAttribute('href', night ? '#i-moon' : '#i-sun');
    const phaseKey = `${g.phase}-${g.day}`;
    if (this.last.phaseKey !== phaseKey) {
      this.last.phaseKey = phaseKey;
      this.phaseLabel.textContent = night ? `NIGHT ${g.day}` : g.phase === 'dawn' ? 'DAWN' : `DAY ${g.day}`;
      this.phaseName.textContent = night ? 'Night watch' : g.getTimeLabel();
    }
    const timerText = g.getPhaseTimer();
    if (this.last.timer !== timerText) {
      this.last.timer = timerText;
      this.phaseTimer.textContent = timerText;
    }
    const progress = g.getPhaseProgress();
    this.phaseRing.style.strokeDashoffset = String(113.1 * (1 - progress));

    // Coins.
    if (this.last.coins !== g.coins) {
      this.last.coins = g.coins;
      this.coinCount.textContent = g.coins;
    }

    // Hearts.
    if (this.last.hearts !== g.hearts) {
      this.last.hearts = g.hearts;
      [...this.heartsEl.children].forEach((svg, i) => {
        svg.classList.toggle('empty', i >= g.hearts);
      });
      this.mobileHeartCount.textContent = g.hearts;
      this.mobileHealth.classList.toggle('low', g.hearts <= 3);
    }

    // Objective.
    const objective = g.getObjective();
    const objKey = objective.label + objective.text;
    if (this.last.objective !== objKey) {
      this.last.objective = objKey;
      this.objectiveLabel.textContent = objective.label;
      this.objectiveText.textContent = objective.text;
      this.objectiveChip.classList.remove('swap');
      void this.objectiveChip.offsetWidth;
      this.objectiveChip.classList.add('swap');
    }

    // Context hint.
    const prompt = g.mode === 'playing' ? g.contextPrompt() : null;
    if (prompt) {
      if (this.last.prompt !== prompt.text) {
        this.last.prompt = prompt.text;
        this.contextText.textContent = prompt.text;
        this.contextKey.textContent = prompt.key;
      }
      this.contextHint.classList.add('visible');
      this.tipStrip.classList.add('muted');
    } else {
      this.last.prompt = null;
      this.contextHint.classList.remove('visible');
      this.tipStrip.classList.remove('muted');
    }

    // Tip line.
    const tip = g.getTip();
    if (this.last.tip !== tip) {
      this.last.tip = tip;
      this.tipStrip.textContent = tip;
    }

    // Hotbar.
    this.updateHotbar();

    // Night tools.
    const showNight = night && g.mode === 'playing';
    this.nightTools.classList.toggle('is-hidden', !showNight);
    this.touchFlare.classList.toggle('is-hidden', !showNight);

    // Flare cooldown.
    const pct = clamp(1 - g.flare.cooldown / g.flare.max, 0, 1);
    if (this.last.flarePct !== pct) {
      this.last.flarePct = pct;
      this.flareSweep.style.background = `conic-gradient(from -90deg, rgba(255,226,155,0.38) ${pct * 360}deg, transparent ${pct * 360}deg)`;
      this.flareBtn.classList.toggle('cooling', pct < 1);
      this.touchFlare.style.opacity = pct < 1 ? '0.55' : '1';
    }

    // Cursor.
    const cursor = g.phase === 'night' && g.mode === 'playing' ? 'crosshair' : 'default';
    if (this.last.cursor !== cursor) {
      this.last.cursor = cursor;
      this.renderer.canvas.style.cursor = cursor;
    }

    this.positionRotateTip();
  }

  updateHotbar() {
    const g = this.game;
    const hotbar = $('hotbar');
    const slots = hotbar.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      slot.classList.toggle('active', i === g.selectedTool);
      slot.setAttribute('aria-pressed', i === g.selectedTool ? 'true' : 'false');
      const tool = TOOLS[i];
      if (tool.kind === 'seed') {
        slot.classList.toggle('locked', g.coins < tool.cost);
        const cost = slot.querySelector('.slot-cost');
        if (cost.textContent !== String(tool.cost)) {
          cost.innerHTML = `<svg viewBox="0 0 32 32"><use href="#i-coin"/></svg>${tool.cost}`;
        }
      } else if (tool.id === 'water') {
        const cost = slot.querySelector('.slot-cost');
        const text = `${g.water}/${WATER_CAPACITY}`;
        if (cost.textContent !== text) {
          cost.textContent = text;
          cost.classList.add('slot-water');
        }
      }
    }
  }

  pulseHeart(hearts) {
    const svg = this.heartsEl.children[Math.max(0, Math.min(11, hearts))];
    if (svg) {
      svg.classList.add('pulse');
      setTimeout(() => svg.classList.remove('pulse'), 420);
    }
    this.mobileHealth.classList.add('pulse');
    setTimeout(() => this.mobileHealth.classList.remove('pulse'), 420);
  }

  positionRotateTip() {
    if (!this.rotateTip) return;
    const portrait = this.renderer.cssH > this.renderer.cssW * 1.05;
    const show = portrait && this.renderer.cssW < 880 && this.game.mode === 'playing' && performance.now() < this.rotateTipUntil;
    this.rotateTip.classList.toggle('is-hidden', !show);
  }
}
