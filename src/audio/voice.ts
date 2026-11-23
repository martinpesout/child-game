import { remainingText } from '../levels/level1';

/** Every spoken line in the game, by id. A recording at public/voice/<id>.m4a replaces the device voice. */
export const LINES = {
  story: 'Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu!',
  intro: 'Ahoj! Pomůžeš mi najít 10 oříšků?',
  thanks: 'Hurá, děkuju!',
  remaining1: remainingText(1),
  remaining2: remainingText(2),
  remaining3: remainingText(3),
  remaining4: remainingText(4),
  remaining5: remainingText(5),
  remaining6: remainingText(6),
  remaining7: remainingText(7),
  remaining8: remainingText(8),
  remaining9: remainingText(9),
} as const;
export type LineId = keyof typeof LINES;

interface SpeechLike {
  say(text: string): void;
  stop(): void;
}

/** Plays a recording; resolves true if it started, false if it is missing or can't play. */
export type ClipPlayer = (url: string) => Promise<boolean>;

let current: HTMLAudioElement | null = null;
const missing = new Set<string>();

export const playClip: ClipPlayer = (url) =>
  new Promise((resolve) => {
    if (missing.has(url)) return resolve(false);
    const a = new Audio(url);
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (!ok) missing.add(url);
      resolve(ok);
    };
    a.addEventListener('error', () => finish(false), { once: true });
    setTimeout(() => finish(false), 1500);
    a.play().then(
      () => {
        current = a;
        finish(true);
      },
      () => finish(false),
    );
  });

export class VoiceLines {
  constructor(private readonly speech: SpeechLike, private readonly play: ClipPlayer = playClip) {}

  async say(id: LineId): Promise<void> {
    this.stop();
    const ok = await this.play(`voice/${id}.m4a`);
    if (!ok) this.speech.say(LINES[id]);
  }

  stop(): void {
    current?.pause();
    current = null;
    this.speech.stop();
  }
}
