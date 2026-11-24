import * as THREE from 'three';
import { Level3Brook } from '../../src/levels/level3';
import { inBrook, FALL_Y } from '../../src/levels/level3Data';
import { topHeightAt, type Collider, type PhysicsWorld } from '../../src/physics/physics';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = () => {
  const e = {
    goals: [] as number[],
    completed: [] as number[],
    lines: [] as string[],
    splashes: 0,
    respawns: 0,
    sinks: 0,
    onCollect: vi.fn(),
    onComplete: (s: number) => e.completed.push(s),
    onNearNpc: vi.fn(),
    onGoal: (i: number) => e.goals.push(i),
    onFriendSay: (id: string) => e.lines.push(id),
    onSplash: () => e.splashes++,
    onRespawn: () => e.respawns++,
    onSink: () => e.sinks++,
  };
  return e;
};
type StepRef = { kind: string; c: Collider };
type Internals = {
  body: { pos: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; grounded: boolean };
  physics: PhysicsWorld;
  course: { length: number; pointAt(s: number): { x: number; z: number } };
  stepRefs: StepRef[][];
};
const inner = (l: Level3Brook) => l as unknown as Internals;

function put(l: Level3Brook, x: number, z: number) {
  const b = inner(l).body;
  b.pos.x = x;
  b.pos.z = z;
  b.pos.y = topHeightAt(x, z, 0.25, inner(l).physics);
  b.vel.x = b.vel.y = b.vel.z = 0;
  b.grounded = true;
}
const tick = (l: Level3Brook, s: number, input = idle) => {
  for (let t = 0; t < s - 1e-9; t += 1 / 60) l.update(1 / 60, input, 0);
};

/** Walks the track like a perfect jumper: over water it stands on the nearest stone/pad/log. */
function hopAlong(l: Level3Brook, sEnd: number, check?: () => void) {
  const c = inner(l).course;
  const steps = inner(l).stepRefs.flat();
  for (let s = 0; s <= sEnd; s += 0.05) {
    const p = c.pointAt(s);
    let x = p.x;
    let z = p.z;
    if (inBrook(x, z)) {
      const near = steps.reduce((a, b) => (Math.hypot(b.c.x - x, b.c.z - z) < Math.hypot(a.c.x - x, a.c.z - z) ? b : a));
      x = near.c.x;
      z = near.c.z;
    }
    put(l, x, z);
    l.update(1 / 60, idle, 0);
    check?.();
  }
}

/** Index of the first step of `kind` in crossing `i`, standing on the step before it first. */
function standOn(l: Level3Brook, crossing: number, idx: number) {
  const st = inner(l).stepRefs[crossing][idx];
  put(l, st.c.x, st.c.z);
  tick(l, 2 / 60);
}

const setup = () => {
  const scene = new THREE.Scene();
  const l = new Level3Brook();
  const e = events();
  l.setup(scene, e);
  return { scene, l, e };
};

it('přeskákání všech přechodů a snědení jahody dokončí kolo; onComplete po oslavě', () => {
  const { l, e } = setup();
  hopAlong(l, inner(l).course.length);
  expect(e.goals).toEqual([0, 1, 2, 3, 4, 5]);
  expect(l.isComplete()).toBe(true);
  expect(e.splashes).toBe(0);
  tick(l, 6);
  expect(e.completed).toHaveLength(1);
  expect(e.lines).toContain('l3finish');
  l.dispose();
});

it('jahodu nejde sníst před dokončením všech přechodů', () => {
  const { l } = setup();
  const c = inner(l).course;
  const end = c.pointAt(c.length);
  put(l, end.x, end.z);
  tick(l, 0.5);
  expect(l.isComplete()).toBe(false);
  l.dispose();
});

it('pád do vody vrátí křečka na poslední kámen, ne na leknín', () => {
  const { l, e } = setup();
  const lilyIdx = inner(l).stepRefs[4].findIndex((s) => s.kind === 'lily');
  standOn(l, 4, lilyIdx - 1);
  const stone = inner(l).stepRefs[4][lilyIdx - 1].c;
  standOn(l, 4, lilyIdx);
  const b = inner(l).body;
  b.pos.x += 0.9; // step off into the water
  b.pos.y = FALL_Y - 0.2;
  b.grounded = false;
  tick(l, 1.2);
  expect(e.splashes).toBe(1);
  expect(e.respawns).toBe(1);
  expect(l.falls).toBe(1);
  expect(Math.hypot(b.pos.x - stone.x, b.pos.z - stone.z)).toBeLessThan(0.3);
  l.dispose();
});

it('křeček stojící na leknínu spadne, leknín žbluňkne a křeček se vrátí na kámen', () => {
  const { l, e } = setup();
  const lilyIdx = inner(l).stepRefs[4].findIndex((s) => s.kind === 'lily');
  standOn(l, 4, lilyIdx - 1);
  const stone = inner(l).stepRefs[4][lilyIdx - 1].c;
  standOn(l, 4, lilyIdx);
  tick(l, 4.5);
  expect(e.sinks).toBe(1);
  expect(l.falls).toBe(1);
  const b = inner(l).body;
  expect(Math.hypot(b.pos.x - stone.x, b.pos.z - stone.z)).toBeLessThan(0.3);
  expect(inBrook(b.pos.x, b.pos.z) && b.pos.y < 0).toBe(false);
  l.dispose();
});

it('křeček na kládě se veze a z klády jde vyskočit', () => {
  const { l } = setup();
  const logIdx = inner(l).stepRefs[5].findIndex((s) => s.kind === 'log');
  standOn(l, 5, logIdx);
  const b = inner(l).body;
  const z0 = b.pos.z;
  tick(l, 0.7);
  expect(Math.abs(b.pos.z - z0)).toBeGreaterThan(0.1);
  expect(b.grounded).toBe(true);
  const top = b.pos.y;
  let peak = top;
  for (let i = 0; i < 30; i++) {
    l.update(1 / 60, { move: { x: 0, y: 0 }, action: i === 0 }, 0);
    peak = Math.max(peak, b.pos.y);
  }
  expect(peak - top).toBeGreaterThan(0.6);
  l.dispose();
});

function fallAt(l: Level3Brook, crossing: number) {
  standOn(l, crossing, 0);
  const b = inner(l).body;
  b.pos.x += 0.8;
  b.pos.y = FALL_Y - 0.3;
  b.grounded = false;
  tick(l, 1.2);
}

it('po třech pádech na stejném přechodu žabka poradí jednou', () => {
  const { l, e } = setup();
  for (let i = 0; i < 4; i++) {
    fallAt(l, 0);
    tick(l, 4.2);
  }
  expect(l.falls).toBe(4);
  expect(e.lines.filter((x) => x === 'l3hint')).toHaveLength(1);
  l.dispose();
});

it('smích nejvýš jednou za 4 s', () => {
  const { l, e } = setup();
  fallAt(l, 0);
  fallAt(l, 0);
  expect(l.falls).toBe(2);
  expect(e.lines.filter((x) => x.startsWith('l3laugh'))).toHaveLength(1);
  l.dispose();
});

it('obejití přechodu nespustí kytičku dalšího přechodu mimo pořadí', () => {
  const { l, e } = setup();
  const c = inner(l).course;
  // stand right behind the flower of crossing 2 without having done crossing 1
  const later = c.length * 0.3;
  for (let s = later; s < later + 3; s += 0.05) {
    const p = c.pointAt(s);
    if (!inBrook(p.x, p.z)) put(l, p.x, p.z);
    l.update(1 / 60, idle, 0);
  }
  expect(e.goals).toEqual([]);
  l.dispose();
});

it('po dokončení se pády nevyhodnocují', () => {
  const { l } = setup();
  hopAlong(l, inner(l).course.length);
  expect(l.isComplete()).toBe(true);
  const b = inner(l).body;
  const st = inner(l).stepRefs[5][0].c;
  b.pos.x = st.x + 0.8;
  b.pos.z = st.z;
  b.pos.y = FALL_Y - 0.3;
  tick(l, 1.5);
  expect(l.falls).toBe(0);
  l.dispose();
});

it('návrat nikdy na místo ve vodě', () => {
  const { l } = setup();
  const b = inner(l).body;
  for (let k = 0; k < 6; k++) {
    for (let i = 0; i < inner(l).stepRefs[k].length; i += 2) {
      standOn(l, k, i);
      b.pos.x += 0.9;
      b.pos.y = FALL_Y - 0.3;
      b.grounded = false;
      tick(l, 1.2);
      const top = topHeightAt(b.pos.x, b.pos.z, 0.25, inner(l).physics);
      expect(top).toBeGreaterThan(-0.05);
      expect(Math.abs(b.pos.y - top)).toBeLessThan(0.05);
    }
  }
  l.dispose();
});

it('3× setup/dispose nenechá ve scéně nic navíc', () => {
  const scene = new THREE.Scene();
  const counts: number[] = [];
  for (let i = 0; i < 3; i++) {
    const l = new Level3Brook();
    l.setup(scene, events());
    tick(l, 0.2);
    l.dispose();
    counts.push(scene.children.length);
  }
  expect(counts[2]).toBe(counts[0]);
});

it('kamera se na přechodu natočí z boku, mimo přechod ne', () => {
  const { l } = setup();
  const c = inner(l).course;
  put(l, c.pointAt(0).x, c.pointAt(0).z);
  tick(l, 2 / 60);
  expect(l.cameraBias).toBe(0);
  standOn(l, 0, 0);
  expect(Math.abs(l.cameraBias)).toBeGreaterThan(0.3);
  l.dispose();
});

it('po pádu z břehu se křeček nevrátí na samý okraj (držený joystick nespadne hned znovu)', async () => {
  const { brookCenterX, brookHalfWidth, LEVEL3 } = await import('../../src/levels/level3Data');
  const { l } = setup();
  const z = LEVEL3.legs[0];
  const edge = brookCenterX(z) + brookHalfWidth(z); // east bank edge, leg 1 goes west
  put(l, edge + 2, z);
  tick(l, 0.1);
  const west = { move: { x: 0, y: 1 }, action: false };
  // hold "forward" (west with camera yaw π/2) the whole time
  const b = inner(l).body;
  let backAt: number | null = null;
  // walk 2 m, sink 0.8 s, then the hamster must stand far enough from the edge
  for (let t = 0; t < 2.3; t += 1 / 60) {
    const was = l.falls;
    l.update(1 / 60, west, Math.PI / 2);
    if (was === 1 && backAt === null && b.grounded && b.pos.y > -0.01) backAt = b.pos.x;
  }
  expect(l.falls).toBe(1);
  expect(backAt).not.toBeNull();
  expect(backAt! - edge).toBeGreaterThan(0.5);
  l.dispose();
});

it('zatmění začne dřív, než se křeček přesune', () => {
  const { l, e } = setup();
  standOn(l, 0, 0);
  const b = inner(l).body;
  b.pos.x += 0.8;
  b.pos.y = FALL_Y - 0.3;
  b.grounded = false;
  let respawnedInWater = false;
  for (let t = 0; t < 1.2; t += 1 / 60) {
    const before = e.respawns;
    l.update(1 / 60, idle, 0);
    if (e.respawns > before && b.pos.y < FALL_Y) respawnedInWater = true;
  }
  expect(e.respawns).toBe(1);
  expect(respawnedInWater).toBe(true);
  l.dispose();
});

it('setrvačností se z vody na břeh vylézt nedá', async () => {
  const { brookCenterX, brookHalfWidth, LEVEL3 } = await import('../../src/levels/level3Data');
  const { l } = setup();
  const z = LEVEL3.legs[0];
  const edge = brookCenterX(z) + brookHalfWidth(z);
  const b = inner(l).body;
  b.pos.x = edge - 0.15;
  b.pos.z = z;
  b.pos.y = FALL_Y - 0.05;
  b.vel.x = 3;
  b.vel.y = 0;
  b.vel.z = 0;
  b.grounded = false;
  let maxY = -Infinity;
  for (let t = 0; t < 0.7; t += 1 / 60) {
    l.update(1 / 60, idle, 0);
    maxY = Math.max(maxY, b.pos.y);
  }
  expect(l.falls).toBe(1);
  expect(maxY).toBeLessThan(FALL_Y);
  l.dispose();
});
