import { VoiceLines, LINES } from '../../src/audio/voice';

const speech = () => ({ say: vi.fn(), stop: vi.fn(), available: true });

it('má id pro všechny věty kola 1 včetně počtu zbývajících oříšků', () => {
  expect(LINES.intro).toBe('Ahoj! Pomůžeš mi najít 10 oříšků?');
  expect(LINES.thanks).toBe('Hurá, děkuju!');
  expect(LINES.story).toBe('Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu!');
  for (let n = 1; n <= 9; n++) expect(LINES[`remaining${n}` as keyof typeof LINES]).toBeTruthy();
});

it('když nahrávka existuje, přehraje ji a nepoužije syntézu', async () => {
  const sp = speech();
  const play = vi.fn(async () => true);
  const v = new VoiceLines(sp, play);
  await v.say('intro');
  expect(play).toHaveBeenCalledWith('voice/intro.m4a');
  expect(sp.say).not.toHaveBeenCalled();
});

it('když nahrávka chybí, přečte větu hlasem zařízení', async () => {
  const sp = speech();
  const v = new VoiceLines(sp, async () => false);
  await v.say('thanks');
  expect(sp.say).toHaveBeenCalledWith('Hurá, děkuju!');
});
