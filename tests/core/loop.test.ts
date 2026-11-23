import { GameLoop } from '../../src/core/loop';

it('volá update v pevných krocích a zbytek předá jako alpha', () => {
  const steps: number[] = [];
  let alpha = -1;
  const loop = new GameLoop(1 / 60, 0.1, (dt) => steps.push(dt), (a) => (alpha = a));
  loop.tick(0);
  loop.tick((1000 * 2.5) / 60);
  expect(steps).toEqual([1 / 60, 1 / 60]);
  expect(alpha).toBeCloseTo(0.5);
});

it('po dlouhé pauze (návrat z pozadí) udělá max 0.1 s simulace', () => {
  const steps: number[] = [];
  const loop = new GameLoop(1 / 60, 0.1, (dt) => steps.push(dt), () => {});
  loop.tick(0);
  loop.tick(30_000);
  expect(steps.length).toBe(6);
});
