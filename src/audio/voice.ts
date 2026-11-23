import { LINES, type LineId } from './lines';

export { LINES, type LineId };

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
