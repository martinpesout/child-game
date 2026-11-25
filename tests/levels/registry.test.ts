import { LEVELS } from '../../src/levels/registry';

it('5 kol; hotová jsou 1–5 a mají tvorbu, příběh a úvodní větu', () => {
  expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  expect(LEVELS.filter((l) => l.ready).map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
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

it('kolo 4 vytvoří Level4Tree s krtkem', async () => {
  const { Level4Tree } = await import('../../src/levels/level4');
  const l = LEVELS[3].create!();
  expect(l).toBeInstanceOf(Level4Tree);
  expect(LEVELS[3].story).toBe('l4story');
  expect(LEVELS[3].intro).toBe('l4intro');
});

it('kolo 5 vytvoří cestu domů', async () => {
  const { Level5Home } = await import('../../src/levels/level5');
  expect(LEVELS[4].create!()).toBeInstanceOf(Level5Home);
  expect(LEVELS[4].story).toBe('l5story');
});
