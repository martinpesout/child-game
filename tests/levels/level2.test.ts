import * as THREE from 'three';
import { Level2Garden } from '../../src/levels/level2';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = () => {
  const e = {
    goals: [] as number[],
    completed: [] as number[],
    lines: [] as string[],
    splashes: 0,
    onCollect: vi.fn(),
    onComplete: (s: number) => e.completed.push(s),
    onNearNpc: vi.fn(),
    onGoal: (i: number) => e.goals.push(i),
    onSquirrel: (id: string) => e.lines.push(id),
    onSplash: () => e.splashes++,
  };
  return e;
};
type Internals = { body: { pos: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; grounded: boolean }; course: { length: number; pointAt(s: number): { x: number; z: number } } };
const inner = (l: Level2Garden) => l as unknown as Internals;

/** Moves the hamster along the course centre line, like a perfect driver. */
function driveTo(l: Level2Garden, sEnd: number, check?: () => void) {
  const c = inner(l).course;
  for (let s = 0; s <= sEnd; s += 0.05) {
    const p = c.pointAt(s);
    inner(l).body.pos.x = p.x;
    inner(l).body.pos.z = p.z;
    l.update(1 / 60, idle, 0);
    check?.();
  }
}

it('projetí všech bran po dráze dokončí kolo a onComplete přijde po oslavě', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  const e = events();
  l.setup(scene, e);
  driveTo(l, inner(l).course.length);
  expect(e.goals).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(l.isComplete()).toBe(true);
  for (let i = 0; i < 6 * 60; i++) l.update(1 / 60, idle, 0);
  expect(e.completed).toEqual([1]);
  expect(e.lines).toContain('l2finish');
  l.dispose();
});

it('veverka nikdy nedoběhne do cíle dřív než křeček', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  l.setup(scene, events());
  const len = inner(l).course.length;
  driveTo(l, len * 0.9, () => {
    if (!l.isComplete()) expect(l.squirrelS).toBeLessThan(len - 1);
  });
  for (let i = 0; i < 20 * 60; i++) l.update(1 / 60, idle, 0);
  expect(l.squirrelS).toBeLessThan(len - 1);
  l.dispose();
});

it('v rouře nejde skočit', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  l.setup(scene, events());
  const tube = l.gates.find((g) => g.kind === 'tube')!;
  inner(l).body.pos.x = tube.x;
  inner(l).body.pos.z = tube.z;
  for (let i = 0; i < 30; i++) l.update(1 / 60, { move: { x: 0, y: 0 }, action: true }, 0);
  expect(inner(l).body.pos.y).toBeLessThan(0.05);
  l.dispose();
});

it('naražení do kaluže vyšle onSplash', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  const e = events();
  l.setup(scene, e);
  const pd = l.puddles[0];
  inner(l).body.pos.x = pd.x + pd.r + 0.6;
  inner(l).body.pos.z = pd.z;
  for (let i = 0; i < 90; i++) l.update(1 / 60, { move: { x: -1, y: 0 }, action: false }, 0);
  expect(e.splashes).toBeGreaterThanOrEqual(1);
  l.dispose();
});

it('dvojí setup/dispose (Znovu) nechá stejný počet objektů a brány začnou od nuly', () => {
  const scene = new THREE.Scene();
  const a = new Level2Garden();
  a.setup(scene, events());
  const count = scene.children.length;
  a.dispose();
  expect(scene.children).toHaveLength(0);
  const b = new Level2Garden();
  b.setup(scene, events());
  expect(scene.children.length).toBe(count);
  expect(b.goal.done).toBe(0);
  expect(b.goal.total).toBe(8);
  b.dispose();
});

it('v cíli křeček běží v kole po směru otáčení a kolo nabízí záběr z boku', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  l.setup(scene, events());
  driveTo(l, inner(l).course.length);
  for (let i = 0; i < 3 * 60; i++) l.update(1 / 60, idle, 0);
  const shot = l.finishShot!;
  expect(shot).toBeTruthy();
  // camera looks at the wheel across its axis: the hamster's heading is perpendicular to the view
  const vx = shot.at.x - shot.from.x;
  const vz = shot.at.z - shot.from.z;
  const h = l.player.rotation.y;
  expect(Math.abs((Math.sin(h) * vx + Math.cos(h) * vz) / Math.hypot(vx, vz))).toBeLessThan(0.2);
  l.dispose();
});

it('v cíli křeček sedí uprostřed kola (nevytlačí ho kolize kola)', () => {
  const scene = new THREE.Scene();
  const l = new Level2Garden();
  l.setup(scene, events());
  driveTo(l, inner(l).course.length);
  for (let i = 0; i < 3 * 60; i++) l.update(1 / 60, idle, 0);
  const end = inner(l).course.pointAt(inner(l).course.length);
  expect(Math.hypot(l.player.position.x - end.x, l.player.position.z - end.z)).toBeLessThan(0.15);
  l.dispose();
});
