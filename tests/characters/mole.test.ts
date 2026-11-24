import * as THREE from 'three';
import { Mole } from '../../src/characters/mole';
import { Worm, Beetle } from '../../src/characters/critters4';

const disposesAll = (root: THREE.Object3D, dispose: () => void) => {
  const geoms = new Set<THREE.BufferGeometry>();
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  expect(geoms.size).toBeGreaterThan(3);
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  dispose();
  const done = new Set(spy.mock.contexts);
  for (const g of geoms) expect(done.has(g)).toBe(true);
  spy.mockRestore();
};
const run = (f: (dt: number) => void, s: number) => { for (let t = 0; t < s; t += 1 / 60) f(1 / 60); };

it('krtek se schová pod zem a zase vykoukne; dispose uvolní geometrie', () => {
  const m = new Mole();
  m.peek(false);
  run((dt) => m.update(dt, null), 1);
  expect(m.body.position.y).toBeLessThan(-0.2);
  m.peek(true);
  run((dt) => m.update(dt, null), 1);
  expect(m.body.position.y).toBeGreaterThanOrEqual(-0.01);
  disposesAll(m.root, () => m.dispose());
});

it('krtek tancuje', () => {
  const m = new Mole();
  m.dance();
  const ys: number[] = [];
  run((dt) => { m.update(dt, null); ys.push(m.body.rotation.y); }, 1);
  expect(new Set(ys.map((y) => y.toFixed(2))).size).toBeGreaterThan(5);
  m.dispose();
});

it('žížala se vlní a občas schová', () => {
  const w = new Worm();
  const shape = () => w.root.children.map((c) => c.position.y.toFixed(3)).join();
  const a = shape();
  run((dt) => w.update(dt), 0.4);
  expect(shape()).not.toBe(a);
  disposesAll(w.root, () => w.dispose());
});

it('brouček spí se Zzz, po probuzení je vzhůru a Zzz zmizí', () => {
  const b = new Beetle();
  expect(b.awake).toBe(false);
  expect(b.root.getObjectByName('zzz')!.visible).toBe(true);
  b.wake();
  run((dt) => b.update(dt), 0.5);
  expect(b.awake).toBe(true);
  expect(b.root.getObjectByName('zzz')!.visible).toBe(false);
  b.startle();
  run((dt) => b.update(dt), 0.2);
  disposesAll(b.root, () => b.dispose());
});
