// Procedural sound — synthesised with the Web Audio API, no asset files or API
// keys. Game feel research is blunt: sound is a core part of "juice"; a
// mechanically simple game feels flat without it. Each cue is a tiny synth
// patch (oscillator envelopes + filtered noise).
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  muted = false;

  /** must be called from a user gesture to satisfy autoplay policy */
  resume(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  }

  clear(): void {
    this.tone({ freq: 620, to: 940, type: 'triangle', dur: 0.09, gain: 0.18 });
  }

  gem(combo = 1): void {
    const base = 880 * Math.pow(1.0595, Math.min(combo, 16)); // pitch climbs with combo
    this.tone({ freq: base, to: base * 1.5, type: 'square', dur: 0.07, gain: 0.12 });
  }

  embed(): void {
    this.noise({ dur: 0.22, gain: 0.3, filter: 420, sweepTo: 90 });
    this.tone({ freq: 150, to: 70, type: 'sawtooth', dur: 0.22, gain: 0.18 });
  }

  levelUp(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.5, gain: 0.13, delay: i * 0.06 }));
  }

  evolve(): void {
    this.tone({ freq: 300, to: 1600, type: 'sawtooth', dur: 0.55, gain: 0.16 });
    [784, 988, 1318].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.4, gain: 0.1, delay: 0.18 + i * 0.05 }));
  }

  boss(): void {
    this.tone({ freq: 120, to: 48, type: 'sawtooth', dur: 1.1, gain: 0.32 });
    this.noise({ dur: 1.0, gain: 0.2, filter: 240, sweepTo: 60 });
  }

  rupture(): void {
    this.noise({ dur: 0.9, gain: 0.45, filter: 1600, sweepTo: 40 });
    this.tone({ freq: 90, to: 28, type: 'sawtooth', dur: 0.9, gain: 0.3 });
  }

  heartbeat(strength: number): void {
    this.tone({ freq: 64, to: 40, type: 'sine', dur: 0.16, gain: 0.12 * strength });
  }

  uiClick(): void {
    this.tone({ freq: 440, to: 540, type: 'square', dur: 0.05, gain: 0.08 });
  }

  private init(): void {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 1.0);
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }

  private tone(opts: { freq: number; to?: number; type: OscillatorType; dur: number; gain: number; delay?: number }): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + opts.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + opts.dur + 0.02);
  }

  private noise(opts: { dur: number; gain: number; filter: number; sweepTo?: number; delay?: number }): void {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.muted) return;
    const t = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.filter, t);
    if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), t + opts.dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + opts.dur + 0.02);
  }
}
