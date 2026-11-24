import { speakerFor, parseEnv, elevenLabsRequest, voiceIdFor } from '../../scripts/elevenlabs';

it('každá věta má svou postavu', () => {
  expect(speakerFor('story')).toBe('narrator');
  expect(speakerFor('intro')).toBe('hedgehog');
  expect(speakerFor('remaining4')).toBe('hedgehog');
  expect(speakerFor('thanks')).toBe('hedgehog');
  expect(speakerFor('bee2')).toBe('bee');
  expect(speakerFor('butterfly3')).toBe('butterfly');
});

it('přečte klíč a hlasy z .env.local (komentáře, uvozovky, mezery)', () => {
  const env = parseEnv('# komentář\nELEVENLABS_API_KEY = "abc123"\nELEVENLABS_VOICE_BEE=bee-id\n\nX=1');
  expect(env).toEqual({ ELEVENLABS_API_KEY: 'abc123', ELEVENLABS_VOICE_BEE: 'bee-id', X: '1' });
});

it('hlas postavy, jinak výchozí hlas', () => {
  const env = { ELEVENLABS_VOICE: 'default-id', ELEVENLABS_VOICE_BEE: 'bee-id' };
  expect(voiceIdFor('bee', env)).toBe('bee-id');
  expect(voiceIdFor('hedgehog', env)).toBe('default-id');
  expect(voiceIdFor('narrator', {})).toBeNull();
});

it('sestaví požadavek na vícejazyčný model s klíčem v hlavičce (ne v URL)', () => {
  const r = elevenLabsRequest('voice-1', 'Bzzz!', 'secret');
  expect(r.url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice-1?output_format=mp3_44100_128');
  expect(r.url).not.toContain('secret');
  expect(r.init.method).toBe('POST');
  expect((r.init.headers as Record<string, string>)['xi-api-key']).toBe('secret');
  const body = JSON.parse(r.init.body as string);
  expect(body.text).toBe('Bzzz!');
  expect(body.model_id).toBe('eleven_multilingual_v2');
});

it('věty 2. kola: příběh vypráví vypravěč, ostatní veverka', () => {
  expect(speakerFor('l2story')).toBe('narrator');
  expect(speakerFor('l2intro')).toBe('squirrel');
  expect(speakerFor('l2finish')).toBe('squirrel');
});

it('kolo 3: příběh čte vypravěč, ostatní žabka s vlastním hlasem', () => {
  expect(speakerFor('l3story')).toBe('narrator');
  expect(speakerFor('l3intro')).toBe('frog');
  expect(speakerFor('l3laugh2')).toBe('frog');
  expect(voiceIdFor('frog', { ELEVENLABS_VOICE_FROG: 'f1', ELEVENLABS_VOICE: 'x' })).toBe('f1');
});
