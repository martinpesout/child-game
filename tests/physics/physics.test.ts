import { stepBody, topHeightAt, type Body, type PhysicsWorld } from '../../src/physics/physics';

const body = (x = 0, z = 0, y = 0): Body => ({ pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true });
const run = (b: Body, w: PhysicsWorld, seconds: number, wish = { x: 0, z: 0 }, jump = false, dt = 1 / 60) => {
  let maxY = b.pos.y;
  for (let t = 0; t < seconds; t += dt) {
    stepBody(b, wish, jump, dt, w);
    maxY = Math.max(maxY, b.pos.y);
  }
  return maxY;
};
const empty: PhysicsWorld = { colliders: [], bounds: { halfSize: 20 } };

it('bez vstupu stojí, gravitace ho drží na zemi', () => {
  const b = body();
  run(b, empty, 1);
  expect(b.pos).toEqual({ x: 0, y: 0, z: 0 });
  expect(b.grounded).toBe(true);
});

it('výška skoku je kolem 0.75 m', () => {
  const b = body();
  const maxY = run(b, empty, 1, { x: 0, z: 0 }, true);
  expect(maxY).toBeGreaterThan(0.7);
  expect(maxY).toBeLessThan(0.8);
});

it('neprojde keřem (válec výšky 1.2) ani s dt = 0.1', () => {
  const w: PhysicsWorld = { colliders: [{ kind: 'cylinder', x: 0, z: -2, radius: 0.6, height: 1.2 }], bounds: { halfSize: 20 } };
  const b = body();
  run(b, w, 3, { x: 0, z: -1 }, false, 0.1);
  expect(Math.hypot(b.pos.x - 0, b.pos.z + 2)).toBeGreaterThanOrEqual(0.6 + 0.25 - 1e-3);
  expect(b.pos.z).toBeGreaterThan(-2);
});

it('neprojde zdí (box) a nezůstane uvnitř', () => {
  const w: PhysicsWorld = { colliders: [{ kind: 'box', x: 0, z: -2, halfX: 2, halfZ: 0.2, height: 1.5 }], bounds: { halfSize: 20 } };
  const b = body();
  run(b, w, 3, { x: 0, z: -1 }, false, 0.1);
  expect(b.pos.z).toBeGreaterThanOrEqual(-2 + 0.2 + 0.25 - 1e-3);
});

it('vyskočí na nízký kámen (box výšky 0.5) a zůstane na něm stát', () => {
  const w: PhysicsWorld = { colliders: [{ kind: 'box', x: 0, z: -1.5, halfX: 0.7, halfZ: 0.7, height: 0.5 }], bounds: { halfSize: 20 } };
  const b = body();
  run(b, w, 1 / 60, { x: 0, z: -1 }, true);
  run(b, w, 0.42, { x: 0, z: -1 });
  run(b, w, 1);
  expect(b.pos.y).toBeCloseTo(0.5);
  expect(b.grounded).toBe(true);
  expect(topHeightAt(b.pos.x, b.pos.z, b.radius, w)).toBeCloseTo(0.5);
});

it('na keř vysoký 1.2 nevyskočí', () => {
  const w: PhysicsWorld = { colliders: [{ kind: 'cylinder', x: 0, z: -1.2, radius: 0.6, height: 1.2 }], bounds: { halfSize: 20 } };
  const b = body();
  const maxY = run(b, w, 3, { x: 0, z: -1 }, true);
  expect(maxY).toBeLessThan(1.2);
  expect(b.pos.y).toBeLessThan(0.8);
});

it('neopustí louku přes okraj', () => {
  const b = body(19, 19);
  run(b, empty, 3, { x: 0.7071, z: 0.7071 }, false, 0.1);
  expect(Math.abs(b.pos.x)).toBeLessThanOrEqual(20 - 0.25 + 1e-6);
  expect(Math.abs(b.pos.z)).toBeLessThanOrEqual(20 - 0.25 + 1e-6);
});

it('z hrany kamene sklouzne dolů, nezasekne se', () => {
  const w: PhysicsWorld = { colliders: [{ kind: 'box', x: 0, z: 0, halfX: 0.7, halfZ: 0.7, height: 0.5 }], bounds: { halfSize: 20 } };
  const b = body(0, 0, 0.5);
  run(b, w, 2, { x: 1, z: 0 });
  expect(b.pos.y).toBe(0);
  expect(b.pos.x).toBeGreaterThan(2);
});
