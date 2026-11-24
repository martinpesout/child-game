import * as THREE from 'three';
import { Level4Tree } from '../../src/levels/level4';
import { LEVEL4 } from '../../src/levels/level4Data';
import type { Underground } from '../../src/world/underground';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = () => {
  const e = {
    goals: [] as number[],
    completed: [] as number[],
    collected: [] as string[],
    lines: [] as string[],
    digs: [] as string[],
    onCollect: (k: string) => e.collected.push(k),
    onComplete: (s: number) => e.completed.push(s),
    onNearNpc: vi.fn(),
    onGoal: (i: number) => e.goals.push(i),
    onFriendSay: (id: string) => e.lines.push(id),
    onDig: (k: string) => e.digs.push(k),
  };
  return e;
};
type Internals = { body: { pos: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; grounded: boolean }; ugs: Underground[] };
const inner = (l: Level4Tree) => l as unknown as Internals;
const put = (l: Level4Tree, x: number, z: number) => {
  const b = inner(l).body;
  b.pos.x = x; b.pos.z = z; b.pos.y = 0;
  b.vel.x = b.vel.y = b.vel.z = 0;
  b.grounded = true;
  l.update(1 / 60, idle, 0);
};
const tick = (l: Level4Tree, s: number, input = idle) => { for (let t = 0; t < s - 1e-9; t += 1 / 60) l.update(1 / 60, input, 0); };
const tap = (l: Level4Tree) => { l.update(1 / 60, { move: { x: 0, y: 0 }, action: true }, 0); l.update(1 / 60, idle, 0); };

/** Shortest path over diggable/open cells from the hamster to `target` (cells list incl. start). */
function path(u: Underground, target: { x: number; y: number }) {
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

/** Digs/walks underground to `target` (stops when it is dug open, or when leaving the maze). */
function goTo(l: Level4Tree, pen: number, target: { x: number; y: number }) {
  const u = inner(l).ugs[pen];
  for (let guard = 0; guard < 400; guard++) {
    if (l.mode !== 'underground') return;
    const g = u.grid;
    if (g.kind(target.x, target.y) === 'open' && g.pos.x === target.x && g.pos.y === target.y) return;
    const p = path(u, target);
    const next = p[1];
    if (!next) return;
    const move = { x: next.x - g.pos.x, y: -(next.y - g.pos.y) };
    l.update(1 / 60, { move, action: false }, 0);
    while (u.moving) l.update(1 / 60, idle, 0);
    if (g.pos.x !== next.x || g.pos.y !== next.y) tap(l);
  }
}

function solveMaze(l: Level4Tree, pen: number, items = true) {
  const u = inner(l).ugs[pen];
  if (items) for (const it of u.grid.def.items) goTo(l, pen, it);
  goTo(l, pen, u.exitCell);
}

function digMound(l: Level4Tree, m: { x: number; z: number }) {
  put(l, m.x + 0.3, m.z);
  for (let i = 0; i < 3; i++) tap(l);
}

function enterPen(l: Level4Tree, pen: number) {
  const h = LEVEL4.pens[pen].hole;
  put(l, h.x, h.z);
  tap(l);
  tick(l, 1.1);
}

const setup = () => {
  const scene = new THREE.Scene();
  const l = new Level4Tree();
  const e = events();
  l.setup(scene, e);
  return { scene, l, e };
};

it('vyhrabání všech 8 hromádek dokončí kolo (v ohradách přes podzemí) a s bonusy dá 3 hvězdy', () => {
  const { l, e } = setup();
  put(l, LEVEL4.bonus.x, LEVEL4.bonus.z);
  for (const m of LEVEL4.mounds.filter((x) => x.pen === 0)) digMound(l, m);
  for (const pen of [0, 1]) {
    enterPen(l, pen);
    expect(l.mode).toBe('underground');
    solveMaze(l, pen);
    tick(l, 1.1);
    expect(l.mode).toBe('surface');
    for (const m of LEVEL4.mounds.filter((x) => x.pen === pen + 1)) digMound(l, m);
    if (pen === 0) {
      const b = LEVEL4.pens[pen].back;
      put(l, b.x, b.z);
      tap(l);
      tick(l, 1.1);
    }
  }
  expect(e.goals).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(l.isComplete()).toBe(true);
  expect(e.collected.sort()).toEqual(['apple', 'carrot', 'strawberry']);
  tick(l, 5);
  expect(e.completed).toEqual([3]);
  expect(e.lines).toContain('l4finish');
  l.dispose();
});

it('hromádka potřebuje 3 ťuknutí; držení tlačítka hrabe jen jednou', () => {
  const { l, e } = setup();
  const m = LEVEL4.mounds[0];
  put(l, m.x + 0.3, m.z);
  tick(l, 1, { move: { x: 0, y: 0 }, action: true });
  expect(e.digs).toEqual(['mound']);
  l.update(1 / 60, idle, 0);
  tap(l);
  expect(e.goals).toEqual([]);
  tap(l);
  expect(e.goals).toEqual([0]);
  l.dispose();
});

it('u díry je actionMode enter, u hromádky dig, jinde jump', () => {
  const { l } = setup();
  put(l, LEVEL4.spawn.x, LEVEL4.spawn.z);
  expect(l.actionMode).toBe('jump');
  put(l, LEVEL4.mounds[0].x, LEVEL4.mounds[0].z);
  expect(l.actionMode).toBe('dig');
  put(l, LEVEL4.pens[0].hole.x, LEVEL4.pens[0].hole.z);
  expect(l.actionMode).toBe('enter');
  l.dispose();
});

it('během kolečka se nedá ovládat a podzemí se ukáže až v půlce', () => {
  const { l } = setup();
  const h = LEVEL4.pens[0].hole;
  put(l, h.x, h.z);
  tap(l);
  expect(l.mode).toBe('irisIn');
  expect(l.view3d).toBeNull();
  const x0 = inner(l).body.pos.x;
  tick(l, 0.3, { move: { x: 1, y: 0 }, action: false });
  expect(inner(l).body.pos.x).toBeCloseTo(x0, 5);
  tick(l, 0.3);
  expect(l.mode).toBe('irisOut');
  expect(l.view3d).not.toBeNull();
  expect(l.iris!.k).toBeGreaterThan(0);
  tick(l, 0.5);
  expect(l.mode).toBe('underground');
  expect(l.iris).toBeNull();
  l.dispose();
});

it('návrat vstupem zachová vyhrabané políčka a dobrota se nezapočítá dvakrát', () => {
  const { l, e } = setup();
  enterPen(l, 0);
  const u = inner(l).ugs[0];
  const item = u.grid.def.items[0];
  goTo(l, 0, item);
  expect(e.collected).toEqual(['carrot']);
  const dug = u.grid.kind(item.x, item.y);
  // walk back to the entry and climb out
  goTo(l, 0, u.grid.def.entry);
  tick(l, 0.1, { move: { x: 0, y: 1 }, action: false });
  tick(l, 1.1);
  expect(l.mode).toBe('surface');
  enterPen(l, 0);
  expect(u.grid.kind(item.x, item.y)).toBe(dug);
  goTo(l, 0, item);
  expect(e.collected).toEqual(['carrot']);
  l.dispose();
});

it('z ohrady se vždy dostane zpět krtincem, i bez vyhrabaných hromádek', () => {
  const { l } = setup();
  enterPen(l, 0);
  solveMaze(l, 0, false);
  tick(l, 1.1);
  const pen = LEVEL4.pens[0];
  const b = LEVEL4.pens[0].back;
  put(l, b.x, b.z);
  expect(l.actionMode).toBe('enter');
  tap(l);
  tick(l, 1.1);
  const p = inner(l).body.pos;
  expect(Math.hypot(p.x - pen.x, p.z - pen.z)).toBeGreaterThan(Math.max(pen.rx, pen.rz));
  expect(l.mode).toBe('surface');
  l.dispose();
});

it('3× setup/dispose nenechá ve scéně nic navíc a view3d je po dispose null', () => {
  const scene = new THREE.Scene();
  const base = scene.children.length;
  for (let i = 0; i < 3; i++) {
    const l = new Level4Tree();
    l.setup(scene, events());
    enterPen(l, 0);
    l.dispose();
    expect(l.view3d).toBeNull();
    expect(scene.children.length).toBe(base);
  }
});
