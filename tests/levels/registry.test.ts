import { LEVELS } from '../../src/levels/registry';

it('5 kol; hotová jsou 1–3 a mají tvorbu, příběh a úvodní větu', () => {
  expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  expect(LEVELS.filter((l) => l.ready).map((l) => l.id)).toEqual([1, 2, 3]);
  for (const l of LEVELS.filter((x) => x.ready)) {
    expect(typeof l.create).toBe('function');
    expect(l.story).toBeTruthy();
    expect(l.intro).toBeTruthy();
  }
  expect(LEVELS[0].name).toBe('Louka');
  expect(LEVELS[1].name).toBe('Zahrada');
});

it('kolo 3 vytvoří potůček se žabkou', async () => {
  const { Level3Brook } = await import('../../src/levels/level3');
  const l = LEVELS[2].create!();
  expect(l).toBeInstanceOf(Level3Brook);
  expect(LEVELS[2].story).toBe('l3story');
  expect(LEVELS[2].intro).toBe('l3intro');
});
