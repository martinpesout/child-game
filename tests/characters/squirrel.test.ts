import * as THREE from 'three';
import { Squirrel } from '../../src/characters/squirrel';

it('Squirrel.dispose uvolní geometrie', () => {
  const s = new Squirrel();
  const geoms = new Set<THREE.BufferGeometry>();
  s.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  expect(geoms.size).toBeGreaterThan(5);
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  s.dispose();
  const disposed = new Set(spy.mock.contexts);
  for (const g of geoms) expect(disposed.has(g)).toBe(true);
  spy.mockRestore();
});

it('při běhu se ocas vlní', () => {
  const s = new Squirrel();
  const tail = s.root.getObjectByName('tail')!;
  const r0 = tail.rotation.x;
  s.update(0.3, 3, null);
  expect(tail.rotation.x).not.toBe(r0);
  s.dispose();
});
