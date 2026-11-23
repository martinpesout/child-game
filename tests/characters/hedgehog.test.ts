import * as THREE from 'three';
import { Hedgehog } from '../../src/characters/hedgehog';

it('Hedgehog.dispose uvolní geometrie', () => {
  const h = new Hedgehog();
  const geoms = new Set<THREE.BufferGeometry>();
  h.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  expect(geoms.size).toBeGreaterThan(5);
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  h.dispose();
  const disposed = new Set(spy.mock.contexts);
  for (const g of geoms) expect(disposed.has(g)).toBe(true);
  spy.mockRestore();
});

it('otočí se ke křečkovi', () => {
  const h = new Hedgehog();
  for (let i = 0; i < 120; i++) h.update(1 / 60, new THREE.Vector3(5, 0, 0));
  expect(h.root.rotation.y).toBeCloseTo(Math.PI / 2, 1);
  h.dispose();
});
