import { LEVEL2, level2Course, level2Gates, level2Placements, level2Terrain } from '../../src/levels/level2Data';

const course = level2Course();

it('8 bran v rostoucím pořadí, 2–3 roury, první brána aspoň 4 m od startu', () => {
  const g = level2Gates(course);
  expect(g).toHaveLength(8);
  for (let i = 1; i < g.length; i++) expect(g[i].s).toBeGreaterThan(g[i - 1].s);
  const tubes = g.filter((x) => x.kind === 'tube').length;
  expect(tubes).toBeGreaterThanOrEqual(2);
  expect(tubes).toBeLessThanOrEqual(3);
  expect(g[0].s).toBeGreaterThanOrEqual(4);
});

it('celá dráha je uvnitř zahrady s rezervou', () => {
  for (let s = 0; s <= course.length; s += 0.5) {
    const p = course.pointAt(s);
    expect(Math.abs(p.x)).toBeLessThan(LEVEL2.halfSize - 2);
    expect(Math.abs(p.z)).toBeLessThan(LEVEL2.halfSize - 2);
  }
});

it('kaluže, dekorace a dobroty jsou mimo cestičku', () => {
  const p = level2Placements(course);
  for (const x of p.puddles) expect(course.distanceTo(x.x, x.z) - x.r).toBeGreaterThanOrEqual(1.2);
  for (const d of p.decor) expect(course.distanceTo(d.x, d.z) - d.size).toBeGreaterThanOrEqual(1.0);
  for (const b of p.bonuses) expect(course.distanceTo(b.x, b.z)).toBeGreaterThanOrEqual(1.2);
  expect(p.bonuses.map((b) => b.kind).sort()).toEqual(['apple', 'carrot', 'strawberry']);
});

it('terén zahrady je mírný a u cestičky rovný', () => {
  const t = level2Terrain(course);
  expect(t.maxSlope(LEVEL2.halfSize, 0.5)).toBeLessThanOrEqual(0.35);
  for (let s = 0; s <= course.length; s += 2) {
    const p = course.pointAt(s);
    expect(Math.abs(t.height(p.x, p.z))).toBeLessThan(0.02);
  }
});

it('poslední brána je blízko křeččího kola (krátký skok do kola)', () => {
  const g = level2Gates(course);
  expect(course.length - g[g.length - 1].s).toBeLessThanOrEqual(3.5);
});
