import { stepBody, topHeightAt, groundAt, type Body, type PhysicsWorld } from '../../src/physics/physics';

const body = (x = 0, z = 0, y = 0): Body => ({ pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true });
const run = (b: Body, w: PhysicsWorld, seconds: number, wish = { x: 0, z: 0 }, jump = false, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) stepBody(b, wish, jump, dt, w);
};

it('stojí na svahu bez klouzání', () => {
  const w: PhysicsWorld = { colliders: [], bounds: { halfSize: 20 }, ground: (x) => 0.3 * Math.sin(x * 0.3) };
  const b = body(2, 1, groundAt(2, 1, w));
  run(b, w, 2);
  expect(Math.abs(b.pos.x - 2)).toBeLessThan(0.02);
  expect(Math.abs(b.pos.z - 1)).toBeLessThan(0.02);
  expect(b.pos.y).toBeCloseTo(groundAt(b.pos.x, b.pos.z, w), 2);
  expect(b.grounded).toBe(true);
});

it('vyběhne kopec do svahu', () => {
  const w: PhysicsWorld = { colliders: [], bounds: { halfSize: 20 }, ground: (x) => 0.05 * x };
  const b = body(0, 0, 0);
  run(b, w, 3, { x: 1, z: 0 });
  expect(b.pos.x).toBeGreaterThan(5);
  expect(b.pos.y).toBeCloseTo(0.05 * b.pos.x, 1);
});

it('nepropadne terénem ani s dt 0.1', () => {
  const w: PhysicsWorld = { colliders: [], bounds: { halfSize: 20 }, ground: () => 0.4 };
  const b = body(0, 0, 2);
  run(b, w, 2, { x: 0, z: 0 }, false, 0.1);
  expect(b.pos.y).toBeCloseTo(0.4);
});

it('kvádr na kopci: vršek = ground(střed) + height', () => {
  const w: PhysicsWorld = {
    colliders: [{ kind: 'box', x: 0, z: 0, halfX: 1, halfZ: 1, height: 0.5 }],
    bounds: { halfSize: 20 },
    ground: () => 0.3,
  };
  expect(topHeightAt(0, 0, 0.25, w)).toBeCloseTo(0.8);
  const b = body(0, 0, 0.8);
  run(b, w, 1);
  expect(b.pos.y).toBeCloseTo(0.8);
});

it('otočený kvádr (yaw π/4) blokuje průchod po úhlopříčce', () => {
  // thin wall along the diagonal y=x line… placed across the path from (−2,−2) to (2,2)? No: wall is 0.1 thick, 4 long, rotated 45°, centred at origin.
  const w: PhysicsWorld = {
    colliders: [{ kind: 'box', x: 0, z: 0, halfX: 2, halfZ: 0.05, height: 1, yaw: Math.PI / 4 }],
    bounds: { halfSize: 20 },
  };
  // run perpendicular to the wall: wall direction (cos45, -sin45) in XZ for yaw π/4 → normal (sin45, cos45)
  const b = body(-1.5, -1.5);
  run(b, w, 3, { x: Math.SQRT1_2, z: Math.SQRT1_2 }, false, 0.1);
  // still on the starting side of the wall: dot with normal < 0
  expect(b.pos.x * Math.SQRT1_2 + b.pos.z * Math.SQRT1_2).toBeLessThan(-0.25 + 1e-3);
});

it('bez ground je země ve výšce 0', () => {
  expect(groundAt(3, 4, { colliders: [], bounds: { halfSize: 20 } })).toBe(0);
});
