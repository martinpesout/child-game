import { joystickVector } from '../../src/input/joystick';

it('tah nahoru o celý poloměr = dopředu 1', () => {
  expect(joystickVector({ x: 100, y: 100 }, { x: 100, y: 40 }, 60, 0.15)).toEqual({ x: 0, y: 1 });
});
it('tah za poloměr se ořízne na délku 1', () => {
  expect(joystickVector({ x: 100, y: 100 }, { x: 100, y: -200 }, 60, 0.15)).toEqual({ x: 0, y: 1 });
});
it('malý tah v mrtvé zóně = nula', () => {
  expect(joystickVector({ x: 100, y: 100 }, { x: 105, y: 100 }, 60, 0.15)).toEqual({ x: 0, y: 0 });
});
it('poloviční tah doprava dává mezi 0 a 1', () => {
  const v = joystickVector({ x: 100, y: 100 }, { x: 130, y: 100 }, 60, 0.15);
  expect(v.y).toBe(0);
  expect(v.x).toBeGreaterThan(0.3);
  expect(v.x).toBeLessThan(0.6);
});
