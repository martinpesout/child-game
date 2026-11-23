import { remainingText } from '../levels/level1';

/** Every spoken line in the game, by id. A recording at src/assets/voice/<id>.m4a replaces the device voice. */
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

export interface ClipHandle {
  stop(): void;
}
export type ClipPlayer = (url: string) => Promise<ClipHandle | null>;

interface SpeechLike {
  say(text: string): void;
  stop(): void;
  prime(): void;
}

/** Recordings that exist, known at build time (so the device-voice fallback can start synchronously). */
export function bundledClips(): Partial<Record<LineId, string>> {
  const files = import.meta.glob('../assets/voice/*.m4a', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  const out: Partial<Record<LineId, string>> = {};
  for (const [path, url] of Object.entries(files)) {
    const id = path.split('/').pop()!.replace('.m4a', '') as LineId;
    if (id in LINES) out[id] = url;
  }
  return out;
}

export class VoiceLines {
  private token = 0;
  private current: ClipHandle | null = null;

  constructor(
    private readonly speech: SpeechLike,
    private readonly clips: Partial<Record<LineId, string>>,
    private readonly play: ClipPlayer,
  ) {}

  /** Call from inside the first tap so the device voice is allowed to speak later. */
  prime(): void {
    this.speech.prime();
  }

  async say(id: LineId): Promise<void> {
    this.stop();
    const url = this.clips[id];
    if (!url) {
      this.speech.say(LINES[id]);
      return;
    }
    const mine = this.token;
    const h = await this.play(url);
    if (mine !== this.token) {
      h?.stop();
      return;
    }
    if (h) this.current = h;
    else this.speech.say(LINES[id]);
  }

  stop(): void {
    this.token++;
    this.current?.stop();
    this.current = null;
    this.speech.stop();
  }
}
