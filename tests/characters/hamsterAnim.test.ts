import { HamsterAnim } from '../../src/characters/hamsterAnim';

it('rychlost 1 na zemi → run; ve vzduchu → air; stojí → idle', () => {
  const a = new HamsterAnim();
  a.update(0.016, 1, true);
  expect(a.mood).toBe('run');
  a.update(0.016, 1, false);
  expect(a.mood).toBe('air');
  a.update(0.016, 0, true);
  expect(a.mood).toBe('idle');
});

it('puffCheeks: hned 1, po 0.6 s 0', () => {
  const a = new HamsterAnim();
  a.puffCheeks();
  expect(a.cheekPuff).toBe(1);
  for (let i = 0; i < 40; i++) a.update(0.016, 0, true);
  expect(a.cheekPuff).toBe(0);
});

it('celebrate trvá 1.2 s a pak přejde do idle', () => {
  const a = new HamsterAnim();
  a.celebrate();
  a.update(1.0, 0, true);
  expect(a.mood).toBe('celebrate');
  a.update(0.25, 0, true);
  expect(a.mood).toBe('idle');
});

it('gaitPhase běží jen při běhu', () => {
  const a = new HamsterAnim();
  a.update(0.5, 0, true);
  expect(a.gaitPhase).toBe(0);
  a.update(0.1, 3, true);
  expect(a.gaitPhase).toBeGreaterThan(0);
});

it('po sebrání dobroty žvýká asi 1.2 s a pak přestane', () => {
  const a = new HamsterAnim();
  a.puffCheeks();
  let moved = 0;
  for (let i = 0; i < 30; i++) {
    a.update(0.016, 0, true);
    moved = Math.max(moved, Math.abs(a.chew));
  }
  expect(a.chewing).toBe(true);
  expect(moved).toBeGreaterThan(0.5);
  for (let i = 0; i < 60; i++) a.update(0.016, 0, true);
  expect(a.chewing).toBe(false);
  expect(a.chew).toBe(0);
});
