import { FrogGuide } from '../../src/levels/frogGuide';

const legs = () => [
  [{ x: 0, y: 0, z: 0 }, { x: -1.2, y: 0.18, z: 0 }, { x: -2.4, y: 0.18, z: 0 }, { x: -3.6, y: 0, z: 0 }],
  [{ x: -3.6, y: 0, z: -4 }, { x: -2.4, y: 0.18, z: -4 }, { x: -1.2, y: 0, z: -4 }],
];
const far = { x: 20, z: 20 };
const run = (g: FrogGuide, s: number, hamster: { x: number; z: number }, done = 0, onStep?: () => void) => {
  for (let t = 0; t < s; t += 1 / 60) {
    g.update(1 / 60, hamster, done);
    onStep?.();
  }
};

it('čeká na začátku, dokud křeček nepřijde', () => {
  const g = new FrogGuide(legs());
  run(g, 5, far);
  expect(g.pos).toMatchObject({ x: 0, z: 0 });
  expect(g.waiting).toBe(true);
});

it('přeskáče úsek po bodech a čeká na konci', () => {
  const g = new FrogGuide(legs());
  const xs = new Set<number>();
  run(g, 5, { x: 0.5, z: 0 }, 0, () => {
    if (g.waiting) xs.add(Math.round(g.pos.x * 10) / 10);
  });
  expect(g.pos.x).toBeCloseTo(-3.6);
  expect(g.waiting).toBe(true);
  expect(g.leg).toBe(0);
});

it('na další úsek jde až po splnění přechodu', () => {
  const g = new FrogGuide(legs());
  run(g, 5, { x: 0.5, z: 0 }, 0);
  run(g, 3, far, 0);
  expect(g.pos.x).toBeCloseTo(-3.6);
  expect(g.pos.z).toBeCloseTo(0);
  run(g, 5, far, 1);
  expect(g.leg).toBe(1);
  expect(g.pos).toMatchObject({ x: -3.6, z: -4 });
});

it('ve skoku je výš než body (oblouk) a heading míří k dalšímu bodu', () => {
  const g = new FrogGuide(legs());
  let peak = 0;
  let heading = 0;
  run(g, 0.3, { x: 0.5, z: 0 }, 0, () => {
    peak = Math.max(peak, g.pos.y);
    if (!g.waiting) heading = g.heading;
  });
  expect(peak).toBeGreaterThan(0.4);
  // moving towards -x: rotation.y = atan2(dx, dz) = -π/2
  expect(heading).toBeCloseTo(-Math.PI / 2, 1);
  expect(g.hopK).toBeGreaterThanOrEqual(0);
});

it('body čte živě (kláda se hýbe a žabka na ni doskočí)', () => {
  const l = legs();
  const g = new FrogGuide(l);
  l[0][1].z = 0.4;
  run(g, 0.47, { x: 0.5, z: 0 });
  expect(g.pos.z).toBeCloseTo(0.4, 1);
});
