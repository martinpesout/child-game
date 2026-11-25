import { LEVEL5, level5Course, level5Hoops, inBrook5, level5Ground, fenceColliders, shadeFor, inYard } from '../../src/levels/level5Data';
import { jumpReach, type StepSpot } from '../../src/levels/level3Data';
import { MazeGrid } from '../../src/levels/maze';
import { stepBody, type Body, type PhysicsWorld } from '../../src/physics/physics';

const course = level5Course();

it('obruče leží na trase v zahradě v pořadí', () => {
  const h = level5Hoops(course);
  expect(h).toHaveLength(3);
  expect(h[0].s).toBeLessThan(h[1].s);
  expect(h[1].s).toBeLessThan(h[2].s);
  for (const g of h) expect(g.z).toBeGreaterThan(LEVEL5.brook.z + LEVEL5.brook.halfWidth);
});

it('přechod potoka: 4 kameny + 1 leknín, mezery do 1,0 m a doskočitelné', () => {
  const st = LEVEL5.brook.steps;
  expect(st.filter((s) => s.kind === 'stone')).toHaveLength(4);
  expect(st.filter((s) => s.kind === 'lily')).toHaveLength(1);
  const near: StepSpot = { kind: 'stone', x: st[0].x, z: LEVEL5.brook.z + LEVEL5.brook.halfWidth, r: 0, top: 0 };
  const far: StepSpot = { kind: 'stone', x: st[st.length - 1].x, z: LEVEL5.brook.z - LEVEL5.brook.halfWidth, r: 0, top: 0 };
  const chain = [near, ...st, far];
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1];
    const b = chain[i];
    const gap = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
    expect(gap).toBeLessThanOrEqual(1.0 + 1e-6);
    expect(gap).toBeLessThanOrEqual(jumpReach(a.top, b.top) - 0.35);
  }
  for (const s of st) expect(inBrook5(s.x, s.z)).toBe(true);
  expect(level5Ground()(0, LEVEL5.brook.z)).toBeLessThan(-1);
});

it('plot vede přes celý svět, je vyšší než skok a nedá se přejít', () => {
  const cs = fenceColliders();
  for (const c of cs) expect(c.height).toBeGreaterThan(1.1);
  const w: PhysicsWorld = { colliders: cs, bounds: { halfSize: LEVEL5.halfSize } };
  for (let x = -19; x <= 19; x += 2) {
    const b: Body = { pos: { x, y: 0, z: LEVEL5.fenceZ + 1.5 }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
    for (let i = 0; i < 180; i++) stepBody(b, { x: 0, z: -1 }, i % 30 === 0, 1 / 60, w);
    expect(b.pos.z).toBeGreaterThan(LEVEL5.fenceZ);
  }
});

it('díra je před plotem (za potokem) a výstup za plotem', () => {
  expect(LEVEL5.hole.z).toBeGreaterThan(LEVEL5.fenceZ);
  expect(LEVEL5.hole.z).toBeLessThan(LEVEL5.brook.z - LEVEL5.brook.halfWidth);
  expect(LEVEL5.exitSpot.z).toBeLessThan(LEVEL5.fenceZ);
});

it('bludiště ~10×5, řešitelné, 1 bonus a 1 vtipná věc (ne budík ani dinosaurus)', () => {
  const m = LEVEL5.maze;
  expect(m.rows).toHaveLength(5);
  expect(m.rows[0].length).toBe(10);
  expect(new MazeGrid(m).solvable()).toBe(true);
  expect(m.items).toHaveLength(1);
  const funny = m.bigs.filter((b) => b.w * b.h >= 2);
  expect(funny).toHaveLength(1);
  expect(['clock', 'dino']).not.toContain(funny[0].kind);
});

it('dvorek: kocour je na dvorku, každý stín úkrytu leží na odvrácené straně od kocoura', () => {
  const { cat, covers } = LEVEL5.yard;
  expect(inYard(cat.x, cat.z)).toBe(true);
  expect(covers.length).toBeGreaterThanOrEqual(3);
  for (const c of covers) {
    const s = shadeFor(c);
    expect(Math.hypot(s.x - cat.x, s.z - cat.z)).toBeGreaterThan(Math.hypot(c.x - cat.x, c.z - cat.z));
    expect(inYard(s.x, s.z)).toBe(true);
  }
});

it('3 bonusy: zahrada, bludiště, dvorek', () => {
  const kinds = [...LEVEL5.bonuses.map((b) => b.kind), ...LEVEL5.maze.items.map((i) => i.kind)].sort();
  expect(kinds).toEqual(['apple', 'carrot', 'strawberry']);
  const surface = LEVEL5.bonuses;
  expect(surface.some((b) => b.z > LEVEL5.brook.z + LEVEL5.brook.halfWidth)).toBe(true);
  expect(surface.some((b) => inYard(b.x, b.z))).toBe(true);
});

it('domek je za dvorkem, dveře směřují do dvorku', () => {
  expect(LEVEL5.house.z).toBeLessThan(LEVEL5.yardEndZ);
  expect(LEVEL5.door.z).toBeGreaterThan(LEVEL5.house.z);
});
