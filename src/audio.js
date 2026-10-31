const DAY_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const DAY_PATTERN = [0, 2, 4, 2, 5, 4, 2, 0, 3, 2, 4, 5, 4, 2, 1, 0];
const NIGHT_SCALE = [110.0, 130.81, 146.83, 174.61, 196.0, 220.0, 261.63];
const NIGHT_PATTERN = [0, 4, 2, 5, 3, 6, 1, 4, 0, 3, 5, 2];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.started = false;
    this.phase = 'day';
    this.noteIndex = 0;
    this.nextNote = 0;
    this.dayStep = 0;
    this.drone = null;
    this.droneGain = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.62;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 3;
    comp.attack.value = 0.006;
    comp.release.value = 0.22;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.34;
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;

    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);

    const len = Math.floor(ctx.sampleRate * 1.2);
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.nextNote = ctx.currentTime + 0.2;
    this.started = true;
  }

  toggle() {
    this.muted = !this.muted;
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.62, t, 0.06);
    }
    return this.muted;
  }

  setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.noteIndex = 0;
    if (this.ctx) this.nextNote = Math.max(this.nextNote, this.ctx.currentTime + 0.1);
  }

  update() {
    if (!this.ctx || this.muted || !this.started) return;
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const interval = this.phase === 'night' ? 0.78 : 0.44;
    let guard = 0;
    while (this.nextNote < ctx.currentTime + 0.35 && guard++ < 8) {
      this.scheduleNote(this.phase === 'night' ? NIGHT_SCALE : DAY_SCALE, this.nextNote);
      this.nextNote += interval;
    }
  }

  scheduleNote(scale, time) {
    if (this.phase === 'night') {
      const pattern = NIGHT_PATTERN;
      const idx = pattern[this.noteIndex % pattern.length];
      const freq = scale[idx] * (this.noteIndex % 4 === 0 ? 1 : 2);
      this.softTone(freq, time, this.phase === 'night' ? 2.6 : 1.6, 0.05, 'sine', {
        attack: 0.06,
        detune: 4,
        bus: this.musicBus,
      });
      if (this.noteIndex % 4 === 0) {
        this.softTone(freq / 2, time, 3.2, 0.035, 'triangle', { attack: 0.4, bus: this.musicBus });
      }
    } else {
      const pattern = DAY_PATTERN;
      const idx = pattern[this.noteIndex % pattern.length];
      const freq = scale[idx];
      this.softTone(freq, time, 0.9, 0.045, 'triangle', { attack: 0.02, bus: this.musicBus });
      if (this.noteIndex % 4 === 0) {
        this.softTone(freq / 2, time, 1.8, 0.04, 'sine', { attack: 0.15, bus: this.musicBus });
      }
      if (this.noteIndex % 8 === 0) {
        this.softTone(scale[(idx + 2) % scale.length], time + 0.05, 1.2, 0.025, 'sine', { attack: 0.05, bus: this.musicBus });
      }
    }
    this.noteIndex++;
  }

  softTone(freq, time, dur, vol, type = 'sine', opts = {}) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.filter || 2200;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (opts.detune) osc.detune.value = opts.detune;
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), time + dur);
    const attack = opts.attack ?? 0.01;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(opts.bus || this.sfxBus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  tone(freq, dur = 0.2, vol = 0.18, type = 'sine', slideTo = null, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    this.softTone(freq, t, dur, vol, type, { slideTo, bus: this.sfxBus, filter: 5000 });
  }

  noise(dur = 0.2, vol = 0.12, filterFreq = 1200, type = 'lowpass', when = 0, q = 0.8) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.35), t + dur);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  chord(freqs, dur = 0.8, vol = 0.05, type = 'sine', when = 0) {
    freqs.forEach((f, i) => this.tone(f, dur, vol, type, null, when + i * 0.02));
  }

  // ---- Effects ----
  click() {
    this.tone(620, 0.06, 0.06, 'triangle', 760);
  }

  till() {
    this.noise(0.24, 0.2, 700, 'lowpass', 0, 1.4);
    this.tone(92, 0.18, 0.12, 'sine', 55);
  }

  plant() {
    this.tone(420, 0.12, 0.1, 'triangle', 620);
    this.noise(0.1, 0.07, 2400, 'highpass');
  }

  water() {
    this.noise(0.42, 0.13, 3200, 'bandpass', 0, 1.2);
    for (let i = 0; i < 4; i++) this.tone(780 + i * 120, 0.08, 0.03, 'sine', 600, i * 0.055);
  }

  harvest() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this.tone(n, 0.5, 0.08, 'triangle', null, i * 0.055));
    this.noise(0.18, 0.05, 4500, 'highpass');
  }

  build() {
    this.noise(0.25, 0.12, 900, 'lowpass');
    this.tone(196, 0.35, 0.09, 'triangle', 294);
    this.tone(392, 0.6, 0.05, 'sine', 523, 0.12);
  }

  upgrade() {
    [392, 523.25, 659.25, 783.99].forEach((n, i) => this.tone(n, 0.6, 0.07, 'triangle', null, i * 0.06));
  }

  shoot() {
    this.tone(880, 0.12, 0.05, 'sine', 480);
    this.noise(0.06, 0.04, 3200, 'highpass');
  }

  frost() {
    [1046, 1318, 1568].forEach((n, i) => this.tone(n, 0.28, 0.022, 'sine', n * 0.8, i * 0.02));
  }

  bramble() {
    this.tone(180, 0.28, 0.1, 'triangle', 90);
    this.noise(0.2, 0.08, 900, 'bandpass');
  }

  hit() {
    this.noise(0.08, 0.06, 1800, 'bandpass');
    this.tone(140, 0.08, 0.05, 'sine', 90);
  }

  enemyDie() {
    this.tone(260, 0.3, 0.07, 'sine', 110);
    this.noise(0.22, 0.06, 1400, 'lowpass');
  }

  hearthHit() {
    this.tone(96, 0.7, 0.18, 'sine', 48);
    this.noise(0.4, 0.2, 500, 'lowpass');
  }

  flare() {
    this.noise(0.5, 0.16, 2200, 'bandpass');
    this.tone(180, 0.5, 0.16, 'triangle', 760);
    this.tone(520, 0.9, 0.08, 'sine', 1300, 0.04);
  }

  nightStart() {
    [196, 146.83, 110].forEach((n, i) => this.tone(n, 3.5, 0.09, 'sine', n * 0.98, i * 0.3));
    this.noise(1.4, 0.05, 600, 'lowpass');
  }

  dawn() {
    [261.63, 329.63, 392, 523.25, 659.25].forEach((n, i) => this.tone(n, 2.6, 0.07, 'sine', null, i * 0.16));
  }

  victory() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    seq.forEach((n, i) => this.tone(n, 1.8, 0.09, 'triangle', null, i * 0.17));
    this.chord([261.63, 329.63, 392], 4, 0.06, 'sine', 1.1);
  }

  defeat() {
    [392, 349.23, 293.66, 220].forEach((n, i) => this.tone(n, 1.6, 0.1, 'triangle', n * 0.98, i * 0.28));
    this.noise(1.8, 0.05, 400, 'lowpass');
  }

  error() {
    this.tone(180, 0.14, 0.09, 'square', 140);
  }

  coin() {
    this.tone(1046, 0.1, 0.05, 'triangle');
    this.tone(1568, 0.24, 0.04, 'triangle', null, 0.06);
  }
}
