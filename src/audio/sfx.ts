/** All game sounds, synthesised with Web Audio – no files. Soft sine/triangle tones with envelopes. */

const C5 = 523.25;
export const nutPitch = (index: number): number => C5 * 2 ** (index / 12);
const note = (semisFromC5: number) => C5 * 2 ** (semisFromC5 / 12);

const MASTER = 0.4;

// Background music: a gentle 8-bar music-box song (C G Am F | C G F G) with soft pad, bass and percussion.
const BPM = 104;
const EIGHTH = 60 / BPM / 2;
const SWING = 0.12; // off-beats a touch late for a bouncy feel
const CHORDS = [
  [0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0],
  [0, 4, 7], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2],
];
const MELODY: (number | null)[] = [
  7, null, 4, null, 7, 9, 7, null,
  2, null, -1, null, 2, 4, 2, null,
  0, null, 4, null, 9, null, 7, 4,
  5, null, 4, null, 2, null, 0, null,
  7, null, 12, null, 11, 9, 7, null,
  2, null, 7, null, 11, null, 9, 7,
  9, null, 5, null, 4, 2, 0, null,
  2, null, 4, 2, -1, null, 0, null,
];
const MUSIC_VOL = 0.75;
const LOOKAHEAD = 0.25;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private _muted = false;
  private ambienceTimer: ReturnType<typeof setTimeout> | null = null;
  private ambienceOn = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private musicNext = 0;
  private musicBus: GainNode | null = null;
  musicLoops = 0;

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

  /** Quiet looping background melody. */
  startMusic(): void {
    if (this.musicTimer || !this.ctx) return;
    this.ensureMusicBus();
    this.musicStep = 0;
    this.musicLoops = 0;
    this.musicNext = this.ctx.currentTime + 0.1;
    const tick = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      // after a long pause (backgrounded tab) don't try to catch up
      if (this.musicNext < ctx.currentTime) this.musicNext = ctx.currentTime + 0.05;
      while (this.musicNext < ctx.currentTime + LOOKAHEAD) {
        this.musicNote(this.musicStep, this.musicNext);
        this.musicStep = (this.musicStep + 1) % MELODY.length;
        if (this.musicStep === 0) this.musicLoops++;
        this.musicNext += EIGHTH;
      }
    };
    tick();
    this.musicTimer = setInterval(tick, 100);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  /** Music bus: soft low-pass + a little echo, so the music sits gently behind the effects. */
  private ensureMusicBus(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.musicBus) return;
    const bus = ctx.createGain();
    bus.gain.value = MUSIC_VOL;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = EIGHTH * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    bus.connect(lp);
    lp.connect(this.master);
    lp.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    this.musicBus = bus;
  }

  private musicNote(step: number, t: number): void {
    const bus = this.musicBus ?? undefined;
    const bar = Math.floor(step / 8);
    const chord = CHORDS[bar % CHORDS.length];
    const inBar = step % 8;
    if (inBar % 2 === 1) t += EIGHTH * SWING;

    // soft pad: whole-bar chord
    if (inBar === 0) for (const n of chord) this.toneAt(t, note(n - 12), EIGHTH * 8.5, 'triangle', 0.018, undefined, bus, 0.25);
    // bouncy bass: root on 1, fifth on 3, passing note before the next bar
    if (inBar === 0) this.toneAt(t, note(chord[0] - 24), EIGHTH * 2.5, 'sine', 0.11, undefined, bus);
    if (inBar === 4) this.toneAt(t, note(chord[2] - 24), EIGHTH * 2.5, 'sine', 0.09, undefined, bus);
    if (inBar === 6) this.toneAt(t, note(chord[1] - 24), EIGHTH * 1.5, 'sine', 0.06, undefined, bus);
    // music-box sparkle on off-beats
    if (inBar % 2 === 1) this.musicBox(t, note(chord[(inBar >> 1) % 3] + 12), 0.022, bus);
    // melody
    const m = MELODY[step];
    if (m !== null) this.musicBox(t, note(m), 0.085, bus);
    // light percussion: soft kick on beats 1 and 3, shaker on off-beats
    if (inBar === 0 || inBar === 4) this.toneAt(t, 140, 0.12, 'sine', 0.09, 45, bus);
    if (inBar % 2 === 1) this.noiseHit(t, 7000, 0.035, 0.012, bus);
  }

  /** Music-box tone: pure sine with a soft bell overtone and quick decay. */
  private musicBox(t: number, f: number, vol: number, dest?: AudioNode): void {
    this.toneAt(t, f, EIGHTH * 3, 'sine', vol, undefined, dest);
    this.toneAt(t, f * 2.01, EIGHTH * 1.2, 'sine', vol * 0.35, undefined, dest);
    this.toneAt(t, f * 3.98, EIGHTH * 0.5, 'sine', vol * 0.1, undefined, dest);
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
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime + delay, 1400 + Math.random() * 900, 0.07, 0.22);
  }

  /** Short filtered noise burst (crunch, shaker). */
  private noiseHit(t0: number, freq: number, dur: number, vol: number, dest?: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 0.08);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t0);
    f.Q.setValueAtTime(1.2, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest ?? this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void {
    if (!this.ctx) return;
    this.toneAt(this.ctx.currentTime + delay, freq, dur, type, vol, slideTo);
  }

  private toneAt(t0: number, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, dest?: AudioNode, attack = 0.015): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(attack, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => g.disconnect();
  }
}
