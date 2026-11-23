import { Speech } from '../../src/audio/speech';

class FakeUtterance { lang = ''; voice: unknown = null; rate = 1; pitch = 1; constructor(public text: string) {} }

function fakeSynth(voices: { lang: string; name: string }[]) {
  const listeners: Record<string, () => void> = {};
  return {
    voices,
    spoken: [] as FakeUtterance[],
    getVoices() { return this.voices; },
    speak(u: FakeUtterance) { this.spoken.push(u); },
    cancel: vi.fn(),
    addEventListener(n: string, cb: () => void) { listeners[n] = cb; },
    fire(n: string) { listeners[n]?.(); },
  };
}

beforeEach(() => vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance));
afterEach(() => vi.unstubAllGlobals());

it('vybere český hlas i když přijde až po voiceschanged', () => {
  const synth = fakeSynth([]);
  const s = new Speech(synth as unknown as SpeechSynthesis);
  synth.voices = [{ lang: 'en-US', name: 'Samantha' }, { lang: 'cs-CZ', name: 'Zuzana' }];
  synth.fire('voiceschanged');
  s.say('Ahoj!');
  expect(synth.spoken).toHaveLength(1);
  expect((synth.spoken[0].voice as { name: string }).name).toBe('Zuzana');
  expect(synth.spoken[0].lang).toBe('cs-CZ');
});

it('nové předčítání přeruší předchozí', () => {
  const synth = fakeSynth([{ lang: 'cs_CZ', name: 'Zuzana' }]);
  const s = new Speech(synth as unknown as SpeechSynthesis);
  s.say('Jedna');
  s.say('Dva');
  expect(synth.cancel).toHaveBeenCalled();
});

it('bez českého hlasu say nevyhodí a nic nepřečte', () => {
  const synth = fakeSynth([{ lang: 'en-US', name: 'Samantha' }]);
  const s = new Speech(synth as unknown as SpeechSynthesis);
  expect(() => s.say('Ahoj')).not.toThrow();
  expect(synth.spoken).toHaveLength(0);
});

it('bez speechSynthesis je available false', () => {
  const s = new Speech(undefined);
  expect(s.available).toBe(false);
  expect(() => s.say('Ahoj')).not.toThrow();
});

it('dává přednost vylepšenému/prémiovému českému hlasu', () => {
  const synth = fakeSynth([
    { lang: 'cs-CZ', name: 'Zuzana' },
    { lang: 'cs-CZ', name: 'Zuzana (Prémiový)' },
    { lang: 'cs-CZ', name: 'Zuzana (Vylepšený)' },
  ]);
  const s = new Speech(synth as unknown as SpeechSynthesis);
  s.say('Ahoj');
  expect((synth.spoken[0].voice as { name: string }).name).toBe('Zuzana (Prémiový)');
});

it('rozpozná i anglické označení Enhanced', () => {
  const synth = fakeSynth([{ lang: 'cs-CZ', name: 'Zuzana' }, { lang: 'cs-CZ', name: 'Zuzana (Enhanced)' }]);
  const s = new Speech(synth as unknown as SpeechSynthesis);
  s.say('Ahoj');
  expect((synth.spoken[0].voice as { name: string }).name).toBe('Zuzana (Enhanced)');
});
