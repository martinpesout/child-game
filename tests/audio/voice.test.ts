import { VoiceLines, LINES, type ClipHandle } from '../../src/audio/voice';

const speech = () => ({ say: vi.fn(), stop: vi.fn(), prime: vi.fn(), available: true });
const handle = (): ClipHandle & { stopped: boolean } => {
  const h = { stopped: false, stop: () => { h.stopped = true; } };
  return h;
};

it('má id pro všechny věty kola 1 včetně počtu zbývajících oříšků', () => {
  expect(LINES.intro).toBe('Ahoj! Pomůžeš mi najít 10 oříšků?');
  expect(LINES.thanks).toBe('Hurá, děkuju!');
  expect(LINES.story).toBe('Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu!');
  for (let n = 1; n <= 9; n++) expect(LINES[`remaining${n}` as keyof typeof LINES]).toBeTruthy();
});

it('bez nahrávky čte hlas zařízení hned (synchronně, ještě v rámci dotyku)', () => {
  const sp = speech();
  const play = vi.fn();
  const v = new VoiceLines(sp, {}, play);
  void v.say('thanks');
  expect(sp.say).toHaveBeenCalledWith('Hurá, děkuju!');
  expect(play).not.toHaveBeenCalled();
});

it('s nahrávkou ji přehraje a hlas zařízení nepoužije', async () => {
  const sp = speech();
  const h = handle();
  const play = vi.fn(async () => h);
  const v = new VoiceLines(sp, { intro: 'x/intro.m4a' }, play);
  await v.say('intro');
  expect(play).toHaveBeenCalledWith('x/intro.m4a');
  expect(sp.say).not.toHaveBeenCalled();
});

it('když se nahrávka nepřehraje, použije hlas zařízení', async () => {
  const sp = speech();
  const v = new VoiceLines(sp, { intro: 'x/intro.m4a' }, async () => null);
  await v.say('intro');
  expect(sp.say).toHaveBeenCalledWith(LINES.intro);
});

it('stop během načítání nahrávky ji zastaví, jakmile začne – nic nehraje přes sebe', async () => {
  const sp = speech();
  const h = handle();
  let resolve!: (x: ClipHandle) => void;
  const v = new VoiceLines(sp, { intro: 'x/intro.m4a' }, () => new Promise((r) => (resolve = r)));
  const p = v.say('intro');
  v.stop();
  resolve(h);
  await p;
  expect(h.stopped).toBe(true);
  expect(sp.say).not.toHaveBeenCalled();
});

it('prime připraví hlas zařízení (volá se z tlačítka Hrát)', () => {
  const sp = speech();
  new VoiceLines(sp, {}, vi.fn()).prime();
  expect(sp.prime).toHaveBeenCalled();
});

it('včelky i motýli mají aspoň 3 různé hlášky', () => {
  const bee = Object.keys(LINES).filter((k) => k.startsWith('bee'));
  const fly = Object.keys(LINES).filter((k) => k.startsWith('butterfly'));
  expect(bee.length).toBeGreaterThanOrEqual(3);
  expect(fly.length).toBeGreaterThanOrEqual(3);
});
