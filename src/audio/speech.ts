/** Reads short Czech sentences aloud via Web Speech. Silently does nothing without a Czech voice. */
export class Speech {
  private voice: SpeechSynthesisVoice | null = null;

  constructor(private readonly synth: SpeechSynthesis | undefined = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined) {
    if (!synth) return;
    this.pickVoice();
    try {
      synth.addEventListener('voiceschanged', () => this.pickVoice());
    } catch {
      /* older engines */
    }
  }

  get available(): boolean {
    return !!this.synth;
  }

  say(text: string): void {
    if (!this.synth) return;
    if (!this.voice) this.pickVoice();
    if (!this.voice) return;
    try {
      this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this.voice;
      u.lang = 'cs-CZ';
      u.rate = 0.95;
      u.pitch = 1.15;
      this.synth.speak(u);
    } catch {
      /* ignore */
    }
  }

  stop(): void {
    try {
      this.synth?.cancel();
    } catch {
      /* ignore */
    }
  }

  private pickVoice(): void {
    const voices = this.synth?.getVoices() ?? [];
    this.voice = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs')) ?? null;
  }
}
