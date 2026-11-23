export interface SystemVoice {
  name: string;
  locale: string;
}

/** Parses the output of `say -v '?'` (name may contain spaces and parentheses). */
export function parseVoices(output: string): SystemVoice[] {
  const out: SystemVoice[] = [];
  for (const line of output.split('\n')) {
    const m = line.match(/^(.+?)\s+([a-z]{2,3}_[A-Z]{2})\s+#/);
    if (m) out.push({ name: m[1].trim(), locale: m[2] });
  }
  return out;
}

/** 2 = premium, 1 = enhanced, 0 = basic. */
export function voiceQuality(name: string): number {
  if (/prémi|premium/i.test(name)) return 2;
  if (/vylepš|enhanced/i.test(name)) return 1;
  return 0;
}

/** Best installed Czech voice, or null when there is none. */
export function pickCzechVoice(voices: SystemVoice[]): { name: string; quality: number } | null {
  const cs = voices.filter((v) => v.locale.startsWith('cs_'));
  if (!cs.length) return null;
  const best = cs.map((v) => ({ name: v.name, quality: voiceQuality(v.name) })).sort((a, b) => b.quality - a.quality)[0];
  return best;
}
