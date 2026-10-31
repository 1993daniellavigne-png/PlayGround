import { AudioEngine } from './audio.js';
import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const audio = new AudioEngine();
const game = new Game(audio);
const renderer = new Renderer(canvas, game);
const ui = new UI(game, audio, renderer);

game.keys = {
  left: false, right: false, up: false, down: false,
};

const movementKeys = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};

let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  audio.init();
}

window.addEventListener('pointerdown', ensureAudio, { passive: true });
window.addEventListener('keydown', ensureAudio, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.target && /input|textarea|select/i.test(event.target.tagName)) return;
  const code = event.code;
  if (movementKeys[code]) {
    game.keys[movementKeys[code]] = true;
    if (game.mode === 'playing') {
      game.walkTarget = null;
      event.preventDefault();
    }
    return;
  }
  if (event.repeat) return;
  if (code === 'Space' || code === 'KeyE') {
    if (game.mode === 'playing' || game.mode === 'build') {
      event.preventDefault();
      game.contextAction();
    }
    return;
  }
  if (code === 'KeyF') {
    if (game.mode === 'playing') {
      event.preventDefault();
      const target = game.pointer.active ? game.pointer : null;
      if (target && game.pointer.x >= 0 && game.pointer.x <= 1280 && game.pointer.y >= 0 && game.pointer.y <= 720) {
        game.fireFlare(game.pointer.x, game.pointer.y);
      } else {
        game.fireFlare(NaN, NaN);
      }
    }
    return;
  }
  if (code === 'Escape') {
    event.preventDefault();
    ui.handleEscape();
    return;
  }
  if (code === 'KeyP') {
    if (game.mode === 'playing') game.pause();
    else if (game.mode === 'paused') {
      game.resume();
      ui.hideOverlay(ui.pauseScreen);
    }
    return;
  }
  if (code === 'KeyM') {
    ensureAudio();
    const muted = audio.toggle();
    ui.syncSoundIcon();
    try { localStorage.setItem('moonglow-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    return;
  }
  if (/^Digit[1-5]$/.test(code) && game.mode === 'playing') {
    game.selectTool(Number(code.slice(5)) - 1);
    ui.updateHotbar();
    return;
  }
  if (code === 'Enter' && game.mode === 'title' && ui.titleScreen && !ui.titleScreen.classList.contains('is-hidden')) {
    const helpOpen = ui.helpScreen && !ui.helpScreen.classList.contains('is-hidden');
    if (!helpOpen) {
      audio.init();
      ui.hideOverlay(ui.titleScreen);
      game.startNewGame();
      renderer.resize(true);
    }
  }
});

window.addEventListener('keyup', (event) => {
  const key = movementKeys[event.code];
  if (key) game.keys[key] = false;
});

window.addEventListener('blur', () => {
  game.keys.left = false;
  game.keys.right = false;
  game.keys.up = false;
  game.keys.down = false;
  game.moveVector = { x: 0, y: 0 };
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.mode === 'playing') game.pause();
});

// Canvas pointer interaction.
function pointerWorld(event) {
  return renderer.screenToWorld(event.clientX, event.clientY);
}

canvas.addEventListener('pointerdown', (event) => {
  ensureAudio();
  if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
  const pos = pointerWorld(event);
  if (game.mode === 'playing') {
    event.preventDefault();
    game.pointer.active = true;
    game.pointer.x = pos.x;
    game.pointer.y = pos.y;
    game.pointerDown(pos.x, pos.y);
  }
});

canvas.addEventListener('pointermove', (event) => {
  const pos = pointerWorld(event);
  game.pointerMove(pos.x, pos.y);
  game.pointer.active = true;
});

canvas.addEventListener('pointerleave', () => {
  game.pointer.active = false;
});

canvas.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('contextmenu', (event) => {
  if (event.target === canvas) event.preventDefault();
});

// Keep iOS from bouncing while using the joystick.
document.addEventListener('touchmove', (event) => {
  if (event.target === canvas) event.preventDefault();
}, { passive: false });

// Frame loop.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  game.update(dt);
  ui.tick(dt);
  renderer.draw(dt);
  audio.update();
  requestAnimationFrame(frame);
}

renderer.resize(true);
requestAnimationFrame(frame);

// A small debug handle used by the automated smoke tests.
window.__moonglow = { game, renderer, ui, audio };
