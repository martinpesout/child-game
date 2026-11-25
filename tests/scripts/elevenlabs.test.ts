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

it('kolo 4: krtek, žížala a brouček; bez vlastního hlasu krtek mluví jako ježek, žížala jako motýl, brouček jako včelka', () => {
  expect(speakerFor('l4story')).toBe('narrator');
  expect(speakerFor('l4intro')).toBe('mole');
  expect(speakerFor('l4worm')).toBe('worm');
  expect(speakerFor('l4stone')).toBe('worm');
  expect(speakerFor('l4clock')).toBe('worm');
  expect(speakerFor('l4beetle')).toBe('beetle');
  expect(speakerFor('l4dino')).toBe('beetle');
  const env = { ELEVENLABS_VOICE_HEDGEHOG: 'h', ELEVENLABS_VOICE_BUTTERFLY: 'b', ELEVENLABS_VOICE_BEE: 'e' };
  expect(voiceIdFor('mole', env)).toBe('h');
  expect(voiceIdFor('worm', env)).toBe('b');
  expect(voiceIdFor('beetle', env)).toBe('e');
  expect(voiceIdFor('mole', { ...env, ELEVENLABS_VOICE_MOLE: 'm' })).toBe('m');
});

it('nastavení hlasu jde upravit (stabilita, styl) – pro klidnější a čistší věty', () => {
  const def = JSON.parse(elevenLabsRequest('v', 'Ahoj', 'k').init.body as string);
  expect(def.voice_settings).toMatchObject({ stability: 0.4, style: 0.45 });
  const calm = JSON.parse(elevenLabsRequest('v', 'Ahoj', 'k', { stability: 0.6, style: 0.2 }).init.body as string);
  expect(calm.voice_settings).toMatchObject({ stability: 0.6, style: 0.2, similarity_boost: 0.75 });
});

it('kolo 5: kocour bez vlastního hlasu mluví hlasem vypravěče; kamarádi svými hlasy', () => {
  expect(speakerFor('l5story')).toBe('narrator');
  expect(speakerFor('l5end')).toBe('narrator');
  expect(speakerFor('l5meow')).toBe('cat');
  expect(speakerFor('l5intro')).toBe('squirrel');
  expect(speakerFor('l5home2')).toBe('squirrel');
  expect(speakerFor('l5frog')).toBe('frog');
  expect(speakerFor('l5home3')).toBe('frog');
  expect(speakerFor('l5mole')).toBe('mole');
  expect(speakerFor('l5duck')).toBe('mole');
  expect(speakerFor('l5yard')).toBe('hedgehog');
  expect(speakerFor('l5home1')).toBe('hedgehog');
  expect(voiceIdFor('cat', { ELEVENLABS_VOICE_NARRATOR: 'n' })).toBe('n');
});
