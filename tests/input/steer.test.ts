import { steer, STEER } from '../../src/input/steer';

it('joystick nahoru = běh dopředu ve směru, kam se křeček dívá', () => {
  const r = steer({ x: 0, y: 1 }, Math.PI / 2, 1 / 60); // facing +X
  expect(r.heading).toBeCloseTo(Math.PI / 2);
  expect(r.wish.x).toBeCloseTo(1);
  expect(r.wish.z).toBeCloseTo(0);
  expect(r.reverse).toBe(false);
});

it('joystick doprava zatáčí doprava (z pohledu kamery za křečkem)', () => {
  // facing +Z (heading 0): camera behind looks along +Z, screen-right is world -X
  let h = 0;
  for (let i = 0; i < 30; i++) h = steer({ x: 1, y: 1 }, h, 1 / 60).heading;
  const r = steer({ x: 0, y: 1 }, h, 1 / 60);
  expect(r.wish.x).toBeLessThan(-0.3);
  expect(h).toBeCloseTo(-STEER.turnRate * 0.5, 1);
});

it('joystick dolů = pomalé couvání, křeček se neotočí', () => {
  const r = steer({ x: 0, y: -1 }, 0, 1 / 60);
  expect(r.heading).toBe(0);
  expect(r.wish.z).toBeCloseTo(-STEER.reverseSpeed);
  expect(r.reverse).toBe(true);
});

it('jen do strany = otáčení na místě', () => {
  const r = steer({ x: -1, y: 0 }, 0, 0.5);
  expect(r.heading).toBeGreaterThan(0);
  expect(Math.hypot(r.wish.x, r.wish.z)).toBe(0);
});
