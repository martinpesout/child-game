import { LEVELS } from '../../src/levels/registry';

it('5 kol; hotová jsou 1 a 2 a mají tvorbu, příběh a úvodní větu', () => {
  expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5]);
  expect(LEVELS.filter((l) => l.ready).map((l) => l.id)).toEqual([1, 2]);
  for (const l of LEVELS.filter((x) => x.ready)) {
    expect(typeof l.create).toBe('function');
    expect(l.story).toBeTruthy();
    expect(l.intro).toBeTruthy();
  }
  expect(LEVELS[0].name).toBe('Louka');
  expect(LEVELS[1].name).toBe('Zahrada');
});
