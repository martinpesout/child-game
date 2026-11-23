import { CombinedController, cameraRelative } from '../../src/input/combine';
import type { Controller, InputState } from '../../src/input/types';

const fake = (s: InputState): Controller => ({ read: () => s, reset() {}, dispose() {} });

it('sloučí pohyb (ořez na 1) a akci (OR)', () => {
  const c = new CombinedController([
    fake({ move: { x: 0, y: 1 }, action: false }),
    fake({ move: { x: 1, y: 0 }, action: true }),
  ]);
  const s = c.read();
  expect(Math.hypot(s.move.x, s.move.y)).toBeCloseTo(1);
  expect(s.action).toBe(true);
});

it('dopředu s kamerou yaw 0 = světové -Z', () => {
  const v = cameraRelative({ x: 0, y: 1 }, 0);
  expect(v.x).toBeCloseTo(0);
  expect(v.z).toBeCloseTo(-1);
});

it('doprava s kamerou yaw 0 = světové +X', () => {
  const v = cameraRelative({ x: 1, y: 0 }, 0);
  expect(v.x).toBeCloseTo(1);
  expect(v.z).toBeCloseTo(0);
});

it('dopředu s kamerou otočenou o 90° doleva (yaw π/2) = světové -X', () => {
  const v = cameraRelative({ x: 0, y: 1 }, Math.PI / 2);
  expect(v.x).toBeCloseTo(-1);
  expect(v.z).toBeCloseTo(0);
});
