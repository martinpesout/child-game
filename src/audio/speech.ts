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
      // slightly slower and only a touch higher: friendly without the "chipmunk robot" effect
      u.rate = 0.9;
      u.pitch = 1.05;
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
    const voices = (this.synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('cs'));
    // Downloaded high-quality voices sound far less robotic: Premium > Enhanced > default.
    const score = (v: SpeechSynthesisVoice) => (/prémi|premium/i.test(v.name) ? 2 : /vylepš|enhanced/i.test(v.name) ? 1 : 0);
    this.voice = voices.sort((a, b) => score(b) - score(a))[0] ?? null;
  }
}
