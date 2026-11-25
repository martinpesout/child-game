import { LINES, type LineId } from './lines';

export { LINES, type LineId };

export interface ClipHandle {
  stop(): void;
  /** Resolves when the clip finished playing. */
  ended?: Promise<void>;
}
export type ClipPlayer = (url: string) => Promise<ClipHandle | null>;

interface SpeechLike {
  say(text: string, onEnd?: () => void): void;
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
  private speaking = false;

  /** `onSpeaking(true/false)` tells when a line starts and ends (used to duck the music). */
  constructor(
    private readonly speech: SpeechLike,
    private readonly clips: Partial<Record<LineId, string>>,
    private readonly play: ClipPlayer,
    private readonly onSpeaking: (on: boolean) => void = () => {},
  ) {}

  private setSpeaking(on: boolean): void {
    if (this.speaking === on) return;
    this.speaking = on;
    this.onSpeaking(on);
  }

  /** Call from inside the first tap so the device voice is allowed to speak later. */
  prime(): void {
    this.speech.prime();
  }

  /** Speaks a line; `onEnd` is called when it finishes (not when another line interrupts it). */
  async say(id: LineId, onEnd?: () => void): Promise<void> {
    this.stop();
    const mine = this.token;
    const done = () => {
      if (mine !== this.token) return;
      this.setSpeaking(false);
      onEnd?.();
    };
    this.setSpeaking(true);
    const url = this.clips[id];
    if (!url) {
      this.speech.say(LINES[id], done);
      return;
    }
    const h = await this.play(url);
    if (mine !== this.token) {
      h?.stop();
      return;
    }
    if (h) {
      this.current = h;
      if (h.ended) void h.ended.then(done);
      else done();
    } else this.speech.say(LINES[id], done);
  }

  stop(): void {
    this.token++;
    this.current?.stop();
    this.current = null;
    this.speech.stop();
    this.setSpeaking(false);
  }
}
