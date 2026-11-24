import { LilyPad, logOffset } from '../../src/levels/platforms';

const run = (l: LilyPad, s: number, occupied: boolean) => {
  for (let t = 0; t < s - 1e-9; t += 1 / 60) l.update(1 / 60, occupied);
};

it('leknín bez křečka neklesá', () => {
  const l = new LilyPad();
  run(l, 5, false);
  expect(l.drop).toBe(0);
  expect(l.sinking).toBe(false);
});

it('po chvíli stání se zachvěje a po 1,5 s začne klesat', () => {
  const l = new LilyPad();
  run(l, 1.2, true);
  expect(l.shaking).toBe(true);
  expect(l.drop).toBe(0);
  run(l, 0.5, true);
  expect(l.sinking).toBe(true);
  expect(l.drop).toBeGreaterThan(0);
});

it('za další 1,5 s je vršek aspoň 0,4 m pod původní výškou', () => {
  const l = new LilyPad();
  run(l, 3.05, true);
  expect(l.drop).toBeGreaterThanOrEqual(0.4);
});

it('po seskočení se do 2 s vynoří', () => {
  const l = new LilyPad();
  run(l, 3.2, true);
  run(l, 2.05, false);
  expect(l.drop).toBe(0);
  expect(l.sinking).toBe(false);
  expect(l.shaking).toBe(false);
});

it('kláda se houpe o 0,5 m s periodou 3 s a lehce pohupuje', () => {
  expect(logOffset(0.75).along).toBeCloseTo(0.5, 3);
  expect(logOffset(2.25).along).toBeCloseTo(-0.5, 3);
  expect(logOffset(3).along).toBeCloseTo(0, 3);
  let maxBob = 0;
  for (let t = 0; t < 5; t += 0.01) maxBob = Math.max(maxBob, Math.abs(logOffset(t).bob));
  expect(maxBob).toBeCloseTo(0.05, 2);
});
