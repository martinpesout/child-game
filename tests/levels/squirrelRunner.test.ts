import { SquirrelRunner } from '../../src/levels/squirrelRunner';

const run = (r: SquirrelRunner, seconds: number, playerS: number, done = false) => {
  for (let t = 0; t < seconds; t += 1 / 60) r.update(1 / 60, playerS, done);
};

it('drží se kousek před křečkem', () => {
  const r = new SquirrelRunner(60);
  run(r, 5, 10);
  expect(r.s).toBeGreaterThan(10);
  expect(r.s).toBeLessThanOrEqual(10 + 3 + 0.01);
});

it('když je křeček pozadu, počká na něj', () => {
  const r = new SquirrelRunner(60);
  r.s = 20;
  run(r, 1, 5);
  expect(r.waiting).toBe(true);
  expect(r.s).toBe(20);
  run(r, 1, 18);
  expect(r.waiting).toBe(false);
});

it('před cílem zastaví, dokud křeček nedokončí', () => {
  const r = new SquirrelRunner(60);
  run(r, 30, 60);
  expect(r.s).toBeLessThanOrEqual(60 - 1.5 + 1e-6);
});


it('nikdy necouvá', () => {
  const r = new SquirrelRunner(60);
  run(r, 5, 30);
  const s = r.s;
  run(r, 2, 0);
  expect(r.s).toBe(s);
});

it('po dokončení zastaví před cílem (nevběhne do křeččího kola)', () => {
  const r = new SquirrelRunner(60);
  run(r, 30, 60);
  run(r, 5, 60, true);
  expect(r.s).toBeLessThanOrEqual(60 - 2 + 1e-6);
  expect(r.s).toBeGreaterThan(60 - 2.5);
});
