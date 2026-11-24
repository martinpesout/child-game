import type { LineId } from '../src/audio/lines';

export type Speaker = 'narrator' | 'hedgehog' | 'bee' | 'butterfly' | 'squirrel' | 'frog';

/** Who says each line – each character can get its own ElevenLabs voice. */
export function speakerFor(id: LineId): Speaker {
  if (id === 'story' || id === 'l2story' || id === 'l3story') return 'narrator';
  if (id.startsWith('l2')) return 'squirrel';
  if (id.startsWith('l3')) return 'frog';
  if (id.startsWith('bee')) return 'bee';
  if (id.startsWith('butterfly')) return 'butterfly';
  return 'hedgehog';
}

/** Minimal .env parser: KEY=value, # comments, optional quotes. */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

/** ELEVENLABS_VOICE_<SPEAKER>, else ELEVENLABS_VOICE, else null. */
export function voiceIdFor(speaker: Speaker, env: Record<string, string | undefined>): string | null {
  return env[`ELEVENLABS_VOICE_${speaker.toUpperCase()}`] || env.ELEVENLABS_VOICE || null;
}

export const ELEVEN_MODEL = 'eleven_multilingual_v2';

/** Text-to-speech request; the API key travels in a header, never in the URL. */
export function elevenLabsRequest(voiceId: string, text: string, apiKey: string): { url: string; init: RequestInit } {
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    init: {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.45, use_speaker_boost: true },
      }),
    },
  };
}
