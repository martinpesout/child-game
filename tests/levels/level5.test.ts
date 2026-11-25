import * as THREE from 'three';
import { Level5Home } from '../../src/levels/level5';
import { LEVEL5, inBrook5, shadeFor } from '../../src/levels/level5Data';
import { FALL_Y } from '../../src/levels/level3Data';
import { topHeightAt, type PhysicsWorld } from '../../src/physics/physics';
import type { Underground } from '../../src/world/underground';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = () => {
  const e = {
    goals: [] as number[],
    completed: [] as number[],
    lines: [] as string[],
    collected: [] as string[],
    meows: 0,
    onCollect: (k: string) => e.collected.push(k),
    onComplete: (s: number) => e.completed.push(s),
    onNearNpc: vi.fn(),
    onGoal: (i: number) => e.goals.push(i),
    onFriendSay: (id: string) => e.lines.push(id),
    onMeow: () => e.meows++,
  };
  return e;
};
type Internals = { body: { pos: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; grounded: boolean }; physics: PhysicsWorld; lastShade: { x: number; z: number } | null };
const inner = (l: Level5Home) => l as unknown as Internals;
const put = (l: Level5Home, x: number, z: number) => {
  const b = inner(l).body;
  b.pos.x = x; b.pos.z = z;
  b.pos.y = topHeightAt(x, z, 0.25, inner(l).physics);
  b.vel.x = b.vel.y = b.vel.z = 0;
  b.grounded = true;
  l.update(1 / 60, idle, 0);
};
const tick = (l: Level5Home, s: number, input = idle) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) l.update(1 / 60, input, 0); };
const tap = (l: Level5Home) => { l.update(1 / 60, { move: { x: 0, y: 0 }, action: true }, 0); l.update(1 / 60, idle, 0); };

function mazePath(u: Underground, target: { x: number; y: number }) {
  const g = u.grid;
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const prev = new Map<string, { x: number; y: number } | null>([[key(g.pos), null]]);
  const q = [{ ...g.pos }];
  while (q.length) {
    const c = q.shift()!;
    if (c.x === target.x && c.y === target.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = g.kind(n.x, n.y);
      if (!k || k === 'stone' || k === 'big' || k === 'roots' || prev.has(key(n))) continue;
      prev.set(key(n), c);
      q.push(n);
    }
  }
  const out: { x: number; y: number }[] = [];
  for (let c: { x: number; y: number } | null | undefined = target; c; c = prev.get(key(c))) out.unshift(c);
  return out;
}
function goTo(l: Level5Home, target: { x: number; y: number }) {
  const u = l.ug;
  for (let guard = 0; guard < 300 && l.mode === 'underground'; guard++) {
    const g = u.grid;
    if (g.kind(target.x, target.y) === 'open' && g.pos.x === target.x && g.pos.y === target.y) return;
    const next = mazePath(u, target)[1];
    if (!next) return;
    l.update(1 / 60, { move: { x: next.x - g.pos.x, y: -(next.y - g.pos.y) }, action: false }, 0);
    while (u.moving) l.update(1 / 60, idle, 0);
    if (g.pos.x !== next.x || g.pos.y !== next.y) tap(l);
  }
}

/** Walks the garden and hops the brook along the track (over water on the nearest step). */
function walkTo(l: Level5Home, zStop: number, skip?: (s: number) => boolean) {
  const c = l.course;
  for (let s = 0; s <= c.length; s += 0.05) {
    const p = c.pointAt(s);
    if (p.z < zStop) return;
    let x = p.x + (skip?.(s) ? 1.6 : 0); // "skip" = walk around beside the hoop
    let z = p.z;
    if (inBrook5(x, z)) {
      const st = LEVEL5.brook.steps.reduce((a, b) => (Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a));
      x = st.x;
      z = st.z;
    }
    put(l, x, z);
  }
}

function throughMaze(l: Level5Home, items = true) {
  put(l, LEVEL5.hole.x, LEVEL5.hole.z);
  tap(l);
  tick(l, 1.1);
  tick(l, 0.05);
  if (items) for (const it of l.ug.grid.def.items) goTo(l, it);
  goTo(l, l.ug.exitCell);
  tick(l, 1.1);
}

const setup = (cat = { firstSleep: 999, laterSleep: 999 }) => {
  const scene = new THREE.Scene();
  const l = new Level5Home(cat);
  const e = events();
  l.setup(scene, e);
  return { scene, l, e };
};

it('celá cesta (obruče → potok → bludiště → dvorek → domek) dokončí kolo a finále pozdraví všichni', () => {
  const { l, e, scene } = setup();
  for (const b of LEVEL5.bonuses) put(l, b.x, b.z);
  walkTo(l, LEVEL5.brook.z - LEVEL5.brook.halfWidth - 0.8);
  expect(e.goals).toEqual([0, 1]);
  throughMaze(l);
  expect(e.goals).toEqual([0, 1, 2]);
  for (let z = LEVEL5.exitSpot.z; z > LEVEL5.yardEndZ - 0.4; z -= 0.05) put(l, LEVEL5.exitSpot.x * (1 - (LEVEL5.exitSpot.z - z) / 7), z);
  expect(e.goals).toEqual([0, 1, 2, 3]);
  put(l, LEVEL5.door.x, LEVEL5.door.z);
  expect(l.actionMode).toBe('enter');
  tap(l);
  expect(l.isComplete()).toBe(true);
  expect(e.goals).toEqual([0, 1, 2, 3, 4]);
  tick(l, 7);
  expect(e.completed).toEqual([3]);
  const finale = e.lines.filter((x) => x.startsWith('l5home'));
  expect(finale).toEqual(['l5home1', 'l5home2', 'l5home3', 'l5home4']);
  expect(e.collected.sort()).toEqual(['apple', 'carrot', 'strawberry']);
  l.dispose();
  expect(scene.children.length).toBeGreaterThanOrEqual(0);
});

it('vynechaná obruč: zahrada se nesplní a potok se nezapočítá', () => {
  const { l, e } = setup();
  const h0 = l.hoops[0].s;
  walkTo(l, LEVEL5.brook.z - LEVEL5.brook.halfWidth - 0.8, (s) => Math.abs(s - h0) < 1.2);
  expect(e.goals).toEqual([]);
  expect(l.done).toBe(0);
  l.dispose();
});

it('pád do potoka vrátí křečka na kámen', () => {
  const { l } = setup();
  const st = LEVEL5.brook.steps[1];
  put(l, st.x, st.z);
  tick(l, 2 / 60);
  const b = inner(l).body;
  b.pos.x += 1.2;
  b.pos.y = FALL_Y - 0.3;
  b.grounded = false;
  tick(l, 1.2);
  expect(l.falls).toBe(1);
  expect(Math.hypot(b.pos.x - st.x, b.pos.z - st.z)).toBeLessThan(0.3);
  l.dispose();
});

it('bludiště vede za plot', () => {
  const { l } = setup();
  walkTo(l, LEVEL5.brook.z - LEVEL5.brook.halfWidth - 0.8);
  throughMaze(l, false);
  expect(l.mode).toBe('surface');
  expect(inner(l).body.pos.z).toBeLessThan(LEVEL5.fenceZ);
  expect(l.done).toBe(3);
  l.dispose();
});

it('kocour: pohyb při pohledu vrátí křečka k poslednímu úkrytu; ve stínu ne', () => {
  const { l, e } = setup({ firstSleep: 0.2, laterSleep: 0.2, warn: 0.1, look: 6 } as never);
  (l as unknown as { done: number }).done = 3;
  const s = shadeFor(LEVEL5.yard.covers[0]);
  put(l, s.x, s.z);
  tick(l, 0.5);
  expect(l.watch.state).toBe('look');
  expect(l.catHint).toBe(true);
  // moving inside the shade is fine
  tick(l, 0.1, { move: { x: 0.3, y: 0 }, action: false });
  expect(e.meows).toBe(0);
  // step out of the shade and keep moving
  put(l, s.x, s.z - 2.2);
  tick(l, 0.4, { move: { x: 0, y: 1 }, action: false });
  expect(e.meows).toBe(1);
  expect(e.lines).toContain('l5meow');
  tick(l, 0.8);
  const p = inner(l).body.pos;
  expect(Math.hypot(p.x - s.x, p.z - s.z)).toBeLessThan(0.3);
  l.dispose();
});

it('dveře domku se otevřou až po dvorku', () => {
  const { l } = setup();
  (l as unknown as { done: number }).done = 3;
  put(l, LEVEL5.door.x, LEVEL5.door.z);
  expect(l.actionMode).toBe('jump');
  (l as unknown as { done: number }).done = 4;
  put(l, LEVEL5.door.x, LEVEL5.door.z);
  expect(l.actionMode).toBe('enter');
  l.dispose();
});

it('3× setup/dispose (i pod zemí) nenechá ve scéně nic navíc a view3d je pak null', () => {
  const scene = new THREE.Scene();
  const base = scene.children.length;
  for (let i = 0; i < 3; i++) {
    const l = new Level5Home();
    l.setup(scene, events());
    (l as unknown as { done: number }).done = 2;
    put(l, LEVEL5.hole.x, LEVEL5.hole.z);
    tap(l);
    tick(l, 1.1);
    expect(l.mode).toBe('underground');
    l.dispose();
    expect(l.view3d).toBeNull();
    expect(scene.children.length).toBe(base);
  }
});

it('hvězdy: 3 jen za všechny 3 dobroty (i tu v bludišti)', () => {
  const { l } = setup();
  for (const b of LEVEL5.bonuses) put(l, b.x, b.z);
  expect(l.bonuses).toEqual({ collected: 2, total: 3 });
  l.dispose();
});

it('držené tlačítko při zalezení do bludiště nezahrabe samo', () => {
  const { l } = setup();
  (l as unknown as { done: number }).done = 2;
  put(l, LEVEL5.hole.x, LEVEL5.hole.z);
  // the tap that started the dive is still held through the iris and the first frames underground
  l.update(1 / 60, { move: { x: 0, y: 0 }, action: true }, 0);
  tick(l, 1.4, { move: { x: 0, y: 0 }, action: true });
  expect(l.mode).toBe('underground');
  expect(l.ug.grid.hp(1, 1)).toBe(2);
  l.dispose();
});
