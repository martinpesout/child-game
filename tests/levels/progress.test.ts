import { computeStars, Progress, HintTimer } from '../../src/levels/progress';

it('hvězdy: dokončení vždy aspoň 1, všechny bonusy 3', () => {
  expect(computeStars(true, 0, 3)).toBe(1);
  expect(computeStars(true, 1, 3)).toBe(1);
  expect(computeStars(true, 2, 3)).toBe(2);
  expect(computeStars(true, 3, 3)).toBe(3);
  expect(computeStars(false, 3, 3)).toBe(0);
});

it('Progress je hotový po 10 oříšcích, bonusy nejsou potřeba', () => {
  const p = new Progress(10, 3);
  for (let i = 0; i < 9; i++) p.collect('nut');
  expect(p.isComplete()).toBe(false);
  p.collect('carrot');
  expect(p.isComplete()).toBe(false);
  p.collect('nut');
  expect(p.isComplete()).toBe(true);
  expect(p.nuts).toBe(10);
  expect(p.bonuses).toBe(1);
  expect(p.stars()).toBe(1);
});

it('HintTimer: po 20 s bez sběru true, sběr ho vynuluje', () => {
  const h = new HintTimer(20);
  expect(h.update(19.9, false)).toBe(false);
  expect(h.update(0.2, false)).toBe(true);
  expect(h.update(0.1, true)).toBe(false);
  expect(h.update(19, false)).toBe(false);
});
