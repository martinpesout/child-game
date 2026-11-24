import { LEVEL3, level3Course, level3Crossings, level3LandSteps, level3Bonuses, level3SideStones, inBrook, level3Ground, jumpReach, brookCenterX, brookHalfWidth, type StepSpot } from '../../src/levels/level3Data';

const course = level3Course();
const crossings = level3Crossings(course);

/** Edge-to-edge gap between two steps (logs at their worst sway position along the current). */
function gap(a: StepSpot, b: StepSpot): number {
  const half = (s: StepSpot, dx: number, dz: number) => {
    if (s.kind !== 'log') return s.r;
    // log: box, halfX = s.r (along the jump), halfZ = half length (along the current)
    const l = Math.hypot(dx, dz) || 1;
    return Math.abs(dx / l) * s.r + Math.abs(dz / l) * 0;
  };
  let worst = 0;
  for (const sway of a.kind === 'log' || b.kind === 'log' ? [-0.5, 0, 0.5] : [0]) {
    const az = a.z + (a.kind === 'log' ? sway : 0);
    const bz = b.z + (b.kind === 'log' ? sway : 0);
    const dx = b.x - a.x;
    const dz = a.kind === 'log' || b.kind === 'log' ? 0 : bz - az; // logs are long along z: the line stays on them
    worst = Math.max(worst, Math.hypot(dx, dz) - half(a, dx, dz) - half(b, dx, dz));
  }
  return worst;
}

/** Bank points (on the track) right at the brook edges before and after a crossing. */
function banks(steps: StepSpot[]): [StepSpot, StepSpot] {
  const z = (steps[0].z + steps[steps.length - 1].z) / 2;
  const cx = brookCenterX(z);
  const hw = brookHalfWidth(z);
  const dir = Math.sign(steps[steps.length - 1].x - steps[0].x);
  return [
    { kind: 'stone', x: cx - dir * hw, z: steps[0].z, r: 0, top: 0 },
    { kind: 'stone', x: cx + dir * hw, z: steps[steps.length - 1].z, r: 0, top: 0 },
  ];
}

function chain(steps: StepSpot[]): StepSpot[] {
  const [a, b] = banks(steps);
  return [a, ...steps, b];
}

it('potůček kříží trasu právě 6×', () => {
  let n = 0;
  let was = false;
  for (let s = 0; s <= course.length; s += 0.1) {
    const p = course.pointAt(s);
    const w = inBrook(p.x, p.z);
    if (w && !was) n++;
    was = w;
  }
  expect(n).toBe(6);
  expect(crossings).toHaveLength(6);
});

it('kameny všech přechodů leží ve vodě a mají vršek aspoň 0,9 m', () => {
  for (const c of crossings) {
    for (const st of c.steps) {
      expect(inBrook(st.x, st.z)).toBe(true);
      if (st.kind === 'log') {
        expect(st.r * 2).toBeGreaterThanOrEqual(0.6);
        expect((st.len ?? 0)).toBeGreaterThanOrEqual(1.8);
      } else expect(st.r).toBeGreaterThanOrEqual(0.45);
    }
  }
});

it('kytička přechodu je za ním na břehu', () => {
  for (const c of crossings) {
    const p = course.pointAt(c.endS);
    expect(inBrook(p.x, p.z)).toBe(false);
    const last = c.steps[c.steps.length - 1];
    expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(4);
  }
});

it('mezery rostou podle návrhu', () => {
  const limits = [0.8, 1.0, 1.2, 1.3, 1.4, 1.4];
  crossings.forEach((c, i) => {
    const ch = chain(c.steps);
    for (let k = 1; k < ch.length; k++) {
      const g = gap(ch[k - 1], ch[k]);
      expect(g, `přechod ${i + 1}, skok ${k}`).toBeLessThanOrEqual(limits[i] + 1e-6);
      expect(g).toBeGreaterThan(0.3);
      if (ch[k].kind === 'lily' || ch[k].kind === 'log' || ch[k - 1].kind === 'lily' || ch[k - 1].kind === 'log') expect(g).toBeLessThanOrEqual(1.1 + 1e-6);
    }
  });
});

it('každá mezera je doskočitelná s rezervou a z plovoucích plošin se neskáče do kopce', () => {
  const all = crossings.map((c) => chain(c.steps));
  for (const ch of all) {
    for (let k = 1; k < ch.length; k++) {
      expect(gap(ch[k - 1], ch[k])).toBeLessThanOrEqual(jumpReach(ch[k - 1].top, ch[k].top) - 0.35);
      if (ch[k - 1].kind === 'lily' || ch[k - 1].kind === 'log') expect(ch[k].top - ch[k - 1].top).toBeLessThanOrEqual(0.05);
    }
  }
});

it('lekníny jsou na 5. přechodu (2) a na 6. leknín i kláda; jinde nic pohyblivého', () => {
  const kinds = crossings.map((c) => c.steps.map((s) => s.kind));
  for (let i = 0; i < 4; i++) expect(kinds[i].some((k) => k === 'lily' || k === 'log')).toBe(false);
  expect(kinds[4].filter((k) => k === 'lily')).toHaveLength(2);
  expect(kinds[5]).toContain('lily');
  expect(kinds[5]).toContain('log');
});

it('skoků je celkem 28–34', () => {
  const crossingJumps = crossings.reduce((n, c) => n + c.steps.length + 1, 0);
  const total = crossingJumps + level3LandSteps(course).length;
  expect(total).toBeGreaterThanOrEqual(28);
  expect(total).toBeLessThanOrEqual(34);
});

it('skákací schody na souši jsou mimo vodu, nízké a blízko sebe', () => {
  const land = level3LandSteps(course);
  expect(land.length).toBeGreaterThanOrEqual(4);
  for (const s of land) {
    expect(inBrook(s.x, s.z)).toBe(false);
    expect(s.top).toBeLessThanOrEqual(0.5);
    expect(s.r).toBeGreaterThanOrEqual(0.45);
  }
  for (let k = 1; k < land.length; k++) {
    const d = Math.hypot(land[k].x - land[k - 1].x, land[k].z - land[k - 1].z) - land[k].r - land[k - 1].r;
    if (d < 2) expect(d).toBeLessThanOrEqual(Math.min(1.0, jumpReach(land[k - 1].top, land[k].top) - 0.35));
  }
});

it('bonusy: 3, aspoň jeden na kameni stranou trasy, žádný ve vodě mimo kámen', () => {
  const b = level3Bonuses(course);
  expect(b).toHaveLength(3);
  const allSteps = crossings.flatMap((c) => c.steps);
  let onSideStone = 0;
  for (const x of b) {
    const stone = [...allSteps, ...level3LandSteps(course), ...level3SideStones()].find((s) => Math.hypot(s.x - x.x, s.z - x.z) < s.r);
    if (inBrook(x.x, x.z)) expect(stone).toBeTruthy();
    if (stone && course.distanceTo(x.x, x.z) > 0.9) onSideStone++;
  }
  expect(onSideStone).toBeGreaterThanOrEqual(1);
});

it('vedlejší kámen s dobrotou je doskočitelný z kamene na trase', () => {
  for (const side of level3SideStones()) {
    const near = crossings.flatMap((c) => c.steps).reduce((a, s) => (gap(s, side) < gap(a, side) ? s : a));
    expect(gap(near, side)).toBeLessThanOrEqual(jumpReach(near.top, side.top) - 0.35);
  }
});

it('koryto je hluboké a mimo něj je rovina', () => {
  const g = level3Ground();
  const c = crossings[0].steps[0];
  expect(g(c.x, c.z)).toBe(LEVEL3.bedY);
  expect(g(15, 0)).toBe(0);
});

it('jumpReach po rovině ≈ 1,85 a na +0,4 ≈ 1,55', () => {
  expect(jumpReach(0, 0)).toBeCloseTo(1.85, 1);
  expect(jumpReach(0, 0.4)).toBeCloseTo(1.55, 1);
});
