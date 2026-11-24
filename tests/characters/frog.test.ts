import * as THREE from 'three';
import { Frog } from '../../src/characters/frog';

it('žabka má oči, kvákací vak a dispose uvolní geometrie', () => {
  const f = new Frog();
  expect(f.root.getObjectByName('sac')).toBeTruthy();
  expect(f.root.getObjectByName('eyes')).toBeTruthy();
  const geoms = new Set<THREE.BufferGeometry>();
  f.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  expect(geoms.size).toBeGreaterThan(4);
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  f.dispose();
  const disposed = new Set(spy.mock.contexts);
  for (const g of geoms) expect(disposed.has(g)).toBe(true);
  spy.mockRestore();
});

it('smích žabkou zatřese', () => {
  const f = new Frog();
  f.laugh();
  const ys: number[] = [];
  for (let i = 0; i < 20; i++) {
    f.update(1 / 60, null, 0);
    ys.push(f.body.position.y + f.body.rotation.z);
  }
  expect(new Set(ys.map((y) => y.toFixed(4))).size).toBeGreaterThan(3);
  f.dispose();
});

it('ve skoku má natažené nohy', () => {
  const f = new Frog();
  f.update(1 / 60, null, 0);
  const rest = f.legs.rotation.x;
  f.update(1 / 60, null, 0.5);
  expect(f.legs.rotation.x).not.toBeCloseTo(rest, 2);
  f.dispose();
});
