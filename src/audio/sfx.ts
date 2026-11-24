/** All game sounds, synthesised with Web Audio – no files. Soft sine/triangle tones with envelopes. */

const C5 = 523.25;
export const nutPitch = (index: number): number => C5 * 2 ** (index / 12);
const note = (semisFromC5: number) => C5 * 2 ** (semisFromC5 / 12);

const MASTER = 0.4;

/** Half a second of silence as a WAV data URI (8 kHz, 8-bit mono). */
function silentWav(): string {
  const n = 4000;
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const str = (o: number, t: string) => [...t].forEach((c, i) => (buf[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44);
  let bin = '';
  buf.forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

// Background music: an upbeat, "racing" 8-bar loop (C G Am F | C G F G) – driving bass,
// steady drums and a quick arcade-style lead. Cheerful, never aggressive.
const BPM = 138;
const EIGHTH = 60 / BPM / 2;
const CHORDS = [
  [0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0],
  [0, 4, 7], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2],
];
const MELODY: (number | null)[] = [
  0, 4, 7, 12, 7, 4, 7, null,
  2, 7, 11, 14, 11, 7, 11, null,
  0, 4, 9, 12, 9, 4, 9, null,
  5, 9, 12, 9, 7, 5, 4, 2,
  12, null, 12, 11, 12, null, 7, null,
  14, null, 14, 12, 11, null, 7, null,
  9, 12, 9, 7, 5, 7, 9, 12,
  11, null, 7, null, 14, null, 11, null,
];
const MUSIC_VOL = 0.7;
/** Volume of a custom music track relative to the master (tracks are mastered loud). */
const TRACK_VOL = 0.45;
/** Music level while someone speaks. */
const DUCK = 0.35;
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

  private silentEl: HTMLAudioElement | null = null;

  /**
   * iOS mutes Web Audio when the ring/silent switch is on, unless the page plays media.
   * Declare a "playback" audio session (Safari 17+) and keep a silent looping <audio> for older iOS.
   */
  private enablePlaybackSession(): void {
    try {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* ignore */
    }
    if (this.silentEl) return;
    try {
      const el = new Audio(silentWav());
      el.loop = true;
      el.setAttribute('playsinline', '');
      this.silentEl = el;
      void el.play()?.catch(() => {
        this.silentEl = null; // not allowed yet – try again on the next tap
      });
    } catch {
      /* ignore */
    }
  }

  /** Call on every user tap: creates the context on first use and resumes it after iOS suspends it. */
  unlock(): void {
    this.enablePlaybackSession();
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
      void this.loadClips();
    } catch {
      /* audio unavailable – the game works silently */
    }
  }

  private clips = new Map<string, AudioBuffer | null>();

  /**
   * Plays a recorded clip through the (already unlocked) AudioContext, so it also works outside a tap on iOS.
   * Resolves to a handle for stopping it, or null if the clip is missing or can't be decoded.
   */
  async playClip(url: string): Promise<{ stop(): void; ended: Promise<void> } | null> {
    const ctx = this.ctx;
    if (!ctx || !this.master) return null;
    let buf = this.clips.get(url);
    if (buf === undefined) {
      try {
        const res = await fetch(url);
        buf = res.ok ? await ctx.decodeAudioData(await res.arrayBuffer()) : null;
      } catch {
        buf = null;
      }
      this.clips.set(url, buf);
    }
    if (!buf) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    const ended = new Promise<void>((resolve) => (src.onended = () => resolve()));
    src.start();
    return {
      ended,
      stop: () => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      },
    };
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

  /** Splash into a puddle + a little "brr". */
  splash(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.05, 900 + i * 500, 0.12, 0.12);
    this.tone(520, 0.25, 'triangle', 0.08, 0.2, 380);
    this.tone(500, 0.25, 'sine', 0.05, 0.22, 360);
  }

  /** One paw scrape: earth pours off the paws – a short granular trickle over a soft sliding hiss, with a light thud. */
  dig(): void {
    if (!this.ctx) return;
    // recorded claw rakes, each a little higher or lower so quick digging doesn't repeat
    if (this.digBuf) return this.playBuf(this.digBuf, 0.92 + Math.random() * 0.16, 1);
    const t = this.ctx.currentTime;
    this.pour(t, 0.5, 0.5, 28);
    this.toneAt(t + 0.02, 110, 0.1, 'sine', 0.25, 70);
  }

  /** A mound or a block of soil breaks open: a longer, heavier pour of earth with a deep thump. */
  crumble(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.digBuf) {
      // the same rakes, slower and deeper, with a thump of falling earth
      this.playBuf(this.digBuf, 0.78, 1);
      this.toneAt(t, 80, 0.3, 'sine', 0.45, 48);
      return;
    }
    this.pour(t, 0.85, 0.7, 55);
    this.toneAt(t, 80, 0.3, 'sine', 0.45, 48);
  }

  /**
   * Pouring soil: a band of sliding hiss (fades in and out) plus many tiny grain clicks scattered over `dur`,
   * densest in the first half – like earth trickling off a shovel.
   */
  private pour(t0: number, dur: number, vol: number, grains: number): void {
    this.scrape(t0, 900, 420, dur, vol * 0.55, 'lowpass', dur * 0.35);
    for (let i = 0; i < grains; i++) {
      const k = Math.random() ** 1.6; // more grains early on
      const tt = t0 + k * dur * 0.9;
      const fade = 1 - k * 0.7;
      this.noiseHit(tt, 900 + Math.random() * 2600, 0.012 + Math.random() * 0.02, vol * 0.28 * fade * (0.5 + Math.random() * 0.5));
    }
  }

  /** Old alarm clock going off: a fast metallic brrring for about two seconds. */
  ring(): void {
    for (let i = 0; i < 32; i++) {
      const f = i % 2 ? 2350 : 2650;
      this.tone(f, 0.05, 'triangle', 0.09 * (1 - i / 40), i * 0.06);
      this.tone(f * 2.76, 0.04, 'sine', 0.03 * (1 - i / 40), i * 0.06);
    }
  }

  /** Paw against a stone: a dull knock. */
  thud(): void {
    this.tone(150, 0.12, 'sine', 0.25, 0, 90);
  }

  /** Sleepy beetle snore. */
  snore(): void {
    this.tone(90, 0.5, 'sawtooth', 0.05, 0, 70);
    this.tone(120, 0.35, 'sine', 0.06, 0.6, 160);
  }

  /** Pop out of a molehill. */
  pop(): void {
    this.tone(400, 0.09, 'sine', 0.2, 0, 900);
  }

  /** Frog "ribbit": two quick croaks falling in pitch. */
  croak(): void {
    for (let i = 0; i < 2; i++) {
      this.tone(330, 0.11, 'sawtooth', 0.07, i * 0.16, 190);
      this.tone(165, 0.11, 'square', 0.04, i * 0.16, 110);
    }
  }

  /** "Plop" of a lily pad starting to sink. */
  plop(): void {
    this.tone(600, 0.15, 'sine', 0.2, 0, 150);
  }

  /** Friendly bee buzz. */
  buzz(): void {
    for (let i = 0; i < 3; i++) this.tone(200 + i * 15, 0.22, 'triangle', 0.09, i * 0.16, 230 + i * 15);
  }

  /** Light butterfly flutter. */
  flutter(): void {
    for (let i = 0; i < 4; i++) this.tone(1900 + Math.random() * 500, 0.06, 'sine', 0.06, i * 0.07, 2600);
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

  constructor(
    private readonly musicUrl?: string,
    /** Recorded sound effects (e.g. the dig sound); the generated ones are used until they load. */
    private readonly sfxUrls: { dig?: string } = {},
  ) {}

  private digBuf: AudioBuffer | null = null;
  private clipsLoading: Promise<void> | null = null;

  /** Loads the recorded sound effects (after the audio is unlocked; a failed load is retried next time). */
  async loadClips(): Promise<void> {
    if (this.clipsLoading) await this.clipsLoading;
    const ctx = this.ctx;
    const url = this.sfxUrls.dig;
    if (!ctx || this.digBuf || !url) return;
    this.clipsLoading = (async () => {
      try {
        const res = await fetch(url);
        if (res.ok) this.digBuf = await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* keep the generated sound */
      }
    })();
    await this.clipsLoading;
    this.clipsLoading = null;
  }

  /** Plays a decoded buffer once at a playback rate (pitch) and volume. */
  private playBuf(buf: AudioBuffer, rate: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    src.start();
    src.onended = () => g.disconnect();
  }

  private musicSrc: AudioBufferSourceNode | null = null;
  private trackGain: GainNode | null = null;
  private ducked = false;

  /** Lower the music while someone speaks (and bring it back afterwards). */
  duck(on: boolean): void {
    this.ducked = on;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const k = on ? DUCK : 1;
    const tc = on ? 0.08 : 0.35;
    this.musicBus?.gain.setTargetAtTime(MUSIC_VOL * k, t, tc);
    this.trackGain?.gain.setTargetAtTime(TRACK_VOL * k, t, tc);
  }
  private musicOn = false;

  /** Background music: the custom track (e.g. from Suno) looped if available, else the generated melody. */
  async startMusic(): Promise<void> {
    if (this.musicOn || !this.ctx) return;
    this.musicOn = true;
    if (this.musicUrl) {
      const ctx = this.ctx;
      try {
        const res = await fetch(this.musicUrl);
        if (!res.ok) throw new Error('missing');
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        if (!this.musicOn || !this.master) return;
        const gain = ctx.createGain();
        gain.gain.value = TRACK_VOL * (this.ducked ? DUCK : 1);
        this.trackGain = gain;
        gain.connect(this.master);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(gain);
        src.start();
        this.musicSrc = src;
        return;
      } catch {
        /* fall back to the generated melody */
      }
    }
    this.startGeneratedMusic();
  }

  private startGeneratedMusic(): void {
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
    this.musicOn = false;
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    try {
      this.musicSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.musicSrc = null;
    this.trackGain = null;
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
    delay.delayTime.value = EIGHTH * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.2;
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
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
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const inBar = step % 8;
    const root = chord[0];

    // driving bass: octave "pump" on every eighth
    this.toneAt(t, note(root - (inBar % 2 === 0 ? 24 : 12)), EIGHTH * 0.9, 'triangle', 0.075, undefined, bus, 0.005);
    // quiet chord stab on the off-beats keeps the energy up
    if (inBar % 2 === 1) for (const n of chord) this.toneAt(t, note(n), EIGHTH * 0.6, 'triangle', 0.012, undefined, bus, 0.005);
    // lead: bright arcade voice (triangle body + a little square bite through the low-pass)
    const m = MELODY[step];
    if (m !== null) {
      this.toneAt(t, note(m), EIGHTH * 1.1, 'triangle', 0.07, undefined, bus, 0.005);
      this.toneAt(t, note(m), EIGHTH * 0.9, 'square', 0.012, undefined, bus, 0.005);
    }
    // drums: kick on every beat, clap on 2 and 4, hi-hat on the off-beats
    if (inBar % 2 === 0) this.toneAt(t, 150, 0.11, 'sine', 0.12, 42, bus, 0.002);
    if (inBar === 2 || inBar === 6) this.noiseHit(t, 1900, 0.11, 0.05, bus);
    if (inBar % 2 === 1) this.noiseHit(t, 8000, 0.03, 0.016, bus);
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
  private scrapeNoise: AudioBuffer | null = null;

  private crunch(delay: number): void {
    if (!this.ctx) return;
    this.noiseHit(this.ctx.currentTime + delay, 1400 + Math.random() * 900, 0.07, 0.22);
  }

  /** Short filtered noise burst (crunch, shaker). */
  /** Band-passed noise sweeping from f0 to f1 – a scratch of paws in the soil. */
  private scrape(t0: number, f0: number, f1: number, dur: number, vol: number, type: BiquadFilterType = 'bandpass', attack = 0.012): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this._muted || ctx.state !== 'running') return;
    if (!this.scrapeNoise) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      this.scrapeNoise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.scrapeNoise.getChannelData(0);
      // grainy noise: random bursts make it sound like soil rather than hiss
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.35 ? 1 : 0.35);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.scrapeNoise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    f.Q.setValueAtTime(0.8, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

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
