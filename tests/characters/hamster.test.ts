import * as THREE from 'three';
import { Hamster } from '../../src/characters/hamster';

it('Hamster.dispose uvolní všechny geometrie', () => {
  const h = new Hamster();
  const geoms = new Set<THREE.BufferGeometry>();
  h.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  expect(geoms.size).toBeGreaterThan(5);
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  h.dispose();
  const disposed = new Set(spy.mock.contexts);
  for (const g of geoms) expect(disposed.has(g)).toBe(true);
  spy.mockRestore();
});

it('sync natočí křečka do směru pohybu', () => {
  const h = new Hamster();
  const body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 1, y: 0, z: 0 }, radius: 0.25, grounded: true };
  for (let i = 0; i < 120; i++) h.sync(body, 1 / 60);
  // model faces +Z at rotation 0, so moving +X means yaw = +π/2
  expect(h.root.rotation.y).toBeCloseTo(Math.PI / 2, 1);
  h.dispose();
});
