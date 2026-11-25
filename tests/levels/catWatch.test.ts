import { CatWatch } from '../../src/levels/catWatch';

const still = { speed: 0, hidden: false };
const moving = { speed: 1.5, hidden: false };
const hiddenMoving = { speed: 1.5, hidden: true };
const run = (c: CatWatch, s: number, h = still) => {
  const out: string[] = [];
  for (let t = 0; t < s - 1e-9; t += 1 / 60) { const r = c.update(1 / 60, h); if (r) out.push(r); }
  return out;
};
const opts = { firstSleep: 4, laterSleep: 2, warn: 1.5, look: 2, easyAfter: 2 };

it('cyklus spí → varuje → dívá se → spí s danými časy', () => {
  const c = new CatWatch(opts);
  expect(c.state).toBe('sleep');
  run(c, 3.9);
  expect(c.state).toBe('sleep');
  run(c, 0.2);
  expect(c.state).toBe('warn');
  run(c, 1.5);
  expect(c.state).toBe('look');
  run(c, 2);
  expect(c.state).toBe('sleep');
});

it('první dva spánky delší, pak kratší', () => {
  const c = new CatWatch(opts);
  run(c, 4 + 1.5 + 2 + 0.05); // 1st cycle done
  expect(c.sleepLeft).toBeGreaterThan(3.5);
  run(c, 4 + 1.5 + 2); // 2nd cycle done
  expect(c.sleepLeft).toBeLessThan(2.1);
});

it('pohyb při pohledu = caught (jednou za pohled); stání nebo stín je v pořádku', () => {
  const c = new CatWatch(opts);
  run(c, 4 + 1.5 + 0.05);
  expect(c.state).toBe('look');
  expect(run(c, 0.5, hiddenMoving)).toEqual([]);
  expect(run(c, 0.3, still)).toEqual([]);
  expect(run(c, 1, moving)).toEqual(['caught']);
});

it('pohyb při spánku a varování nevadí', () => {
  const c = new CatWatch(opts);
  expect(run(c, 4 + 1.4, moving)).toEqual([]);
});

it('po chycení má křeček 1 s klid', () => {
  const c = new CatWatch({ ...opts, look: 5 });
  run(c, 4 + 1.5 + 0.05);
  expect(run(c, 0.1, moving)).toEqual(['caught']);
  expect(c.grace).toBeGreaterThan(0.8);
});

it('2 prohřešky bez přečkaného pohledu → další spánek 2× delší, pak normální', () => {
  const c = new CatWatch(opts);
  // wait (still) until the cat looks, then spend the whole look with `h`, ending asleep again
  const cycle = (h: typeof still) => {
    while (c.state !== 'look') c.update(1 / 60, still);
    const out: string[] = [];
    while (c.state === 'look') { const r = c.update(1 / 60, h); if (r) out.push(r); }
    return out;
  };
  expect(cycle(moving)).toEqual(['caught']);
  expect(cycle(moving)).toEqual(['caught']);
  expect(c.state).toBe('sleep');
  expect(c.sleepLeft).toBeGreaterThan(3.5); // 2 × laterSleep (third sleep is already a "later" one)
  cycle(still);
  expect(c.sleepLeft).toBeLessThan(2.1);
});

it('přečkaný pohled vynuluje počítadlo prohřešků', () => {
  const c = new CatWatch(opts);
  // wait (still) until the cat looks, then spend the whole look with `h`, ending asleep again
  const cycle = (h: typeof still) => {
    while (c.state !== 'look') c.update(1 / 60, still);
    const out: string[] = [];
    while (c.state === 'look') { const r = c.update(1 / 60, h); if (r) out.push(r); }
    return out;
  };
  cycle(moving);
  cycle(still);
  cycle(moving);
  expect(c.sleepLeft).toBeLessThan(2.1);
});
