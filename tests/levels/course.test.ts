import { Course, placeGates, GateTracker, navArrowVisible } from '../../src/levels/course';

const straight = () => new Course([{ x: 0, z: 0 }, { x: 0, z: -10 }, { x: 0, z: -20 }]);

it('Course: délka, začátek, konec a nejbližší bod', () => {
  const c = straight();
  expect(c.length).toBeCloseTo(20, 0);
  expect(c.pointAt(0).z).toBeCloseTo(0);
  expect(c.pointAt(c.length).z).toBeCloseTo(-20, 1);
  expect(c.nearestS(1, -7)).toBeCloseTo(7, 0);
  expect(c.distanceTo(1, -7)).toBeCloseTo(1, 1);
  const t = c.tangentAt(5);
  expect(t.z).toBeCloseTo(-1, 2);
});

const gates = () => placeGates(straight(), [{ s: 5, kind: 'hoop' }, { s: 10, kind: 'tube' }, { s: 15, kind: 'hoop' }]);

it('brány leží na křivce ve správném pořadí', () => {
  const g = gates();
  expect(g.map((x) => Math.round(-x.z))).toEqual([5, 10, 15]);
  expect(g[1].kind).toBe('tube');
});

it('brána platí jen v pořadí', () => {
  const t = new GateTracker(gates());
  expect(t.update({ x: 0, z: -9.5 }, { x: 0, z: -10.5 })).toBeNull(); // gate 2 first
  expect(t.next).toBe(0);
  expect(t.update({ x: 0, z: -4.5 }, { x: 0, z: -5.5 })).toBe(0);
  expect(t.next).toBe(1);
});

it('obejití brány zvenku nic nezapočte', () => {
  const t = new GateTracker(gates());
  expect(t.update({ x: 2, z: -4.5 }, { x: 2, z: -5.5 })).toBeNull();
  expect(t.passed).toBe(0);
});

it('průchod pozpátku se počítá, ale jen jednou', () => {
  const t = new GateTracker(gates());
  expect(t.update({ x: 0, z: -5.5 }, { x: 0, z: -4.5 })).toBe(0);
  expect(t.update({ x: 0, z: -4.5 }, { x: 0, z: -5.5 })).toBeNull();
  expect(t.passed).toBe(1);
});

it('rychlý průchod (velký krok) se nezmešká', () => {
  const t = new GateTracker(gates());
  expect(t.update({ x: 0, z: -4 }, { x: 0, z: -6 })).toBe(0);
});

it('isDone po všech branách', () => {
  const t = new GateTracker(gates());
  for (const z of [5, 10, 15]) t.update({ x: 0, z: -z + 0.5 }, { x: 0, z: -z - 0.5 });
  expect(t.isDone()).toBe(true);
  expect(t.passed).toBe(3);
});

it('šipka: daleko od cesty nebo brána mimo záběr', () => {
  expect(navArrowVisible(5, true)).toBe(true);
  expect(navArrowVisible(2, true)).toBe(false);
  expect(navArrowVisible(2, false)).toBe(true);
});

it('obruč: průchod těsně vedle (0.75 m od středu) se nepočítá', () => {
  const t = new GateTracker(gates());
  expect(t.update({ x: 0.75, z: -4.5 }, { x: 0.75, z: -5.5 })).toBeNull();
  expect(t.update({ x: 0.4, z: -4.5 }, { x: 0.4, z: -5.5 })).toBe(0);
});
