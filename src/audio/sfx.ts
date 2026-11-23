/** All game sounds, synthesised with Web Audio – no files. Soft sine/triangle tones with envelopes. */

const C5 = 523.25;
export const nutPitch = (index: number): number => C5 * 2 ** (index / 12);
const note = (semisFromC5: number) => C5 * 2 ** (semisFromC5 / 12);

const MASTER = 0.4;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private ambienceTimer: ReturnType<typeof setTimeout> | null = null;
  private ambienceOn = false;

  get muted(): boolean {
    return this._muted;
  }

  /** Call on every user tap: creates the context on first use and resumes it after iOS suspends it. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this._muted ? 0 : MASTER;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
    } catch {
      /* audio unavailable – the game works silently */
    }
  }

  setMuted(m: boolean): void {
    this._muted = m;
    if (this.master) this.master.gain.value = m ? 0 : MASTER;
  }

  step(): void {
    this.tone(1300 + Math.random() * 300, 0.035, 'sine', 0.05);
  }

  collectNut(index: number): void {
    const f = nutPitch(index);
    this.tone(f * 0.6, 0.06, 'sine', 0.25, 0, f);
    this.tone(f, 0.3, 'triangle', 0.3, 0.05);
    this.tone(f * 2, 0.25, 'sine', 0.12, 0.05);
  }

  collectBonus(): void {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone(note(s), 0.22, 'triangle', 0.28, i * 0.07));
  }

  /** Soft crunchy munching after eating something (starts slightly delayed). */
  munch(): void {
    for (let i = 0; i < 6; i++) this.crunch(0.25 + i * 0.17);
  }

  jump(): void {
    this.tone(320, 0.18, 'sine', 0.22, 0, 640);
  }

  /** Squeaky animal "talking": a few cheerful blips. */
  chatter(syllables: number): void {
    const n = Math.max(2, Math.min(10, Math.round(syllables)));
    for (let i = 0; i < n; i++) {
      const f = 750 + Math.random() * 450;
      this.tone(f, 0.07, 'triangle', 0.16, i * 0.11, f * (0.85 + Math.random() * 0.4));
    }
  }

  fanfare(): void {
    const seq: [number, number, number][] = [
      [-5, 0, 0.15], [0, 0.15, 0.15], [4, 0.3, 0.15], [7, 0.45, 0.35], [4, 0.85, 0.15], [7, 1.0, 0.15], [12, 1.15, 0.6],
    ];
    for (const [s, t, d] of seq) {
      this.tone(note(s), d + 0.1, 'triangle', 0.3, t);
      this.tone(note(s - 12), d + 0.1, 'sine', 0.15, t);
    }
  }

  click(): void {
    this.tone(880, 0.06, 'sine', 0.15, 0, 660);
  }

  /** Soft bird chirps in the background. */
  startAmbience(): void {
    if (this.ambienceOn) return;
    this.ambienceOn = true;
    const next = () => {
      if (!this.ambienceOn) return;
      if (!this._muted) this.chirp();
      this.ambienceTimer = setTimeout(next, 1500 + Math.random() * 3500);
    };
    this.ambienceTimer = setTimeout(next, 1200);
  }

  stopAmbience(): void {
    this.ambienceOn = false;
    if (this.ambienceTimer) clearTimeout(this.ambienceTimer);
    this.ambienceTimer = null;
  }

  private chirp(): void {
    const base = 2600 + Math.random() * 1200;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.tone(base, 0.07, 'sine', 0.035, i * 0.09, base * 1.25);
  }

  private noise: AudioBuffer | null = null;

  private crunch(delay: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 0.08);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1400 + Math.random() * 900, t0);
    f.Q.setValueAtTime(1.2, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.22, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + 0.09);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => g.disconnect();
  }
}
