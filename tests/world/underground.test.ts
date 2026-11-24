import * as THREE from 'three';
import { Underground } from '../../src/world/underground';
import { LEVEL4_MAZES } from '../../src/levels/level4Mazes';
import type { MazeDef } from '../../src/levels/maze';

const run = (u: Underground, s: number, move = { x: 0, y: 0 }, tap = false) => {
  const ev: string[] = [];
  for (let t = 0; t < s - 1e-9; t += 1 / 60) for (const e of u.update(1 / 60, move, tap && t === 0)) ev.push(e.type);
  return ev;
};
const tapOnce = (u: Underground) => run(u, 1 / 60, { x: 0, y: 0 }, true);
const small = (): MazeDef => ({
  rows: ['RRRER', 'o.#..', '.....'],
  entry: { x: 0, y: 1 },
  bigs: [{ kind: 'dino', x: 4, y: 2, w: 1, h: 1 }],
  items: [{ kind: 'carrot', x: 1, y: 1 }],
  friends: [],
});

const ndc = (u: Underground, p: THREE.Vector3) => p.clone().project(u.camera);

it('křeček je vždy v záběru a kamera nevyjede za okraj bludiště (4:3 i 16:9)', () => {
  for (const aspect of [4 / 3, 16 / 9]) {
    const u = new Underground(LEVEL4_MAZES[1]);
    u.resize(aspect);
    u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
    run(u, 3);
    for (let gx = 0; gx < u.grid.cols; gx++) {
      u.debugPlace(gx, 3);
      run(u, 2);
      const p = ndc(u, u.hamsterWorld());
      expect(Math.abs(p.x)).toBeLessThan(0.95);
      expect(Math.abs(p.y)).toBeLessThan(0.95);
    }
    u.dispose();
  }
});

it('při vstupu je východ v záběru a exitIndicator je pak null nebo míří k východu', () => {
  const u = new Underground(LEVEL4_MAZES[1]);
  u.resize(4 / 3);
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  run(u, 0.8);
  const e = ndc(u, u.cellCenter(u.exitCell.x, u.exitCell.y));
  expect(Math.abs(e.x)).toBeLessThan(1);
  run(u, 3);
  const ind = u.exitIndicator();
  const e2 = ndc(u, u.cellCenter(u.exitCell.x, u.exitCell.y));
  if (Math.abs(e2.x) < 0.95 && Math.abs(e2.y) < 0.95) expect(ind).toBeNull();
  else expect(ind).not.toBeNull();
  u.dispose();
});

it('hrabání vrátí crack a pak dig; do kamínku blocked', () => {
  const u = new Underground(small());
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  run(u, 0.1, { x: 1, y: 0 });
  expect(tapOnce(u)).toContain('crack');
  const ev = tapOnce(u);
  expect(ev).toContain('dig');
  expect(ev).toContain('item');
  run(u, 0.3, { x: 1, y: 0 });
  expect(u.grid.pos).toEqual({ x: 1, y: 1 });
  run(u, 0.1, { x: 1, y: 0 });
  expect(tapOnce(u)).toContain('blocked');
  u.dispose();
});

it('pohyb trvá ~0,2 s a během něj se další krok nebere', () => {
  const u = new Underground(small());
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  u.grid.dig(); // facing right: crack
  u.grid.dig();
  run(u, 0.1, { x: 1, y: 0 });
  expect(u.grid.pos.x).toBe(1);
  expect(u.moving).toBe(true);
  run(u, 0.15);
  expect(u.moving).toBe(false);
  u.dispose();
});

it('vyhrabání východu vrátí exit; joystick nahoru na vstupu vrátí leave', () => {
  const u = new Underground(small());
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  expect(run(u, 0.05, { x: 0, y: 1 })).toContain('leave');
  u.debugPlace(3, 1);
  run(u, 0.05, { x: 0, y: 1 });
  tapOnce(u);
  expect(tapOnce(u)).toContain('exit');
  u.dispose();
});

it('kamarád: první přiblížení vrátí friend jednou a brouček se probudí', () => {
  const d = LEVEL4_MAZES[1];
  const u = new Underground(d);
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  const f = d.friends[0];
  u.debugPlace(f.x - 1, f.y);
  const ev = run(u, 0.5);
  expect(ev.filter((e) => e === 'friend')).toHaveLength(1);
  expect(run(u, 0.5).filter((e) => e === 'friend')).toHaveLength(0);
  expect(u.beetle?.awake).toBe(true);
  u.dispose();
});

it('velká věc: hrabání do ní vrátí big nejvýš jednou za 6 s', () => {
  const u = new Underground(small());
  u.enter();
  run(u, 1 / 60); // let go of the stick once after entering
  u.debugPlace(3, 2);
  run(u, 0.05, { x: 1, y: 0 });
  expect(tapOnce(u)).toContain('big');
  run(u, 0.2);
  expect(tapOnce(u)).not.toContain('big');
  u.dispose();
});

it('dispose uvolní geometrie', () => {
  const u = new Underground(LEVEL4_MAZES[0]);
  const geoms = new Set<THREE.BufferGeometry>();
  u.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  u.dispose();
  const done = new Set(spy.mock.contexts);
  for (const g of geoms) expect(done.has(g)).toBe(true);
  spy.mockRestore();
});

it('políčka hlíny jsou od sebe vidět (mezera a střídavý odstín)', () => {
  const u = new Underground(small());
  const soil: THREE.Mesh[] = [];
  u.scene.traverse((o) => { if ((o as THREE.Mesh).userData?.soil) soil.push(o as THREE.Mesh); });
  expect(soil.length).toBeGreaterThan(4);
  const box = new THREE.Box3().setFromObject(soil[0]);
  expect(box.max.x - box.min.x).toBeLessThan(0.6);
  const colors = new Set(soil.map((m) => (m.material as THREE.MeshStandardMaterial).color.getHex()));
  expect(colors.size).toBeGreaterThan(1);
  u.dispose();
});

it('budík a kostra dinosaura jsou podrobné modely, které se vejdou do svých políček', async () => {
  const { makeClock, makeDino } = await import('../../src/world/buried');
  const meshes = (o: THREE.Object3D) => { let n = 0; o.traverse((c) => { if ((c as THREE.Mesh).isMesh) n++; }); return n; };
  const clock = makeClock(1.1, 1.08);
  const cb = new THREE.Box3().setFromObject(clock);
  expect(meshes(clock)).toBeGreaterThan(15);
  expect(clock.userData.hammer).toBeTruthy();
  expect(clock.userData.ring).toBeTypeOf('function');
  expect(cb.max.x - cb.min.x).toBeLessThan(1.25);
  expect(cb.max.y - cb.min.y).toBeLessThan(1.2);
  const dino = makeDino(2.85, 1.2);
  const db = new THREE.Box3().setFromObject(dino);
  expect(meshes(dino)).toBeGreaterThan(40);
  expect(db.max.x - db.min.x).toBeLessThan(3.1);
  expect(db.max.y - db.min.y).toBeLessThan(1.3);
  expect(dino.userData.jaw).toBeTruthy();
});

it('budík se po narazení rozdrnčí: kladívko buší a budík se třese', async () => {
  const d: MazeDef = { rows: ['RRRER', 'o....', '.....'], entry: { x: 0, y: 1 }, bigs: [{ kind: 'clock', x: 2, y: 1, w: 1, h: 1 }], items: [], friends: [] };
  const u = new Underground(d);
  u.enter();
  run(u, 1 / 60);
  u.debugPlace(1, 1);
  run(u, 0.05, { x: 1, y: 0 });
  const ev = tapOnce(u);
  expect(ev).toContain('big');
  expect(u.clockRinging).toBe(true);
  run(u, 2.5);
  expect(u.clockRinging).toBe(false);
  u.dispose();
});
