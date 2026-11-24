import * as THREE from 'three';
import { DirtFx } from '../../src/world/digfx';

const visible = (fx: DirtFx) => fx.root.children.filter((c) => c.visible).length;

it('hrábnutí vyhodí hrudky hlíny dozadu a obláček prachu', () => {
  const scene = new THREE.Scene();
  const fx = new DirtFx(scene);
  fx.burst(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), 0);
  expect(fx.clodsAlive).toBeGreaterThanOrEqual(8);
  expect(fx.dustAlive).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < 20; i++) fx.update(1 / 60);
  // clods fly backwards (−z) and upwards first
  expect(fx.meanClod().z).toBeLessThan(-0.05);
  expect(fx.meanClod().y).toBeGreaterThan(0.02);
  fx.dispose();
});

it('hrudky dopadnou na zem, chvíli leží a pak zmizí; prach se rozplyne', () => {
  const scene = new THREE.Scene();
  const fx = new DirtFx(scene);
  fx.burst(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), 0);
  for (let i = 0; i < 60; i++) fx.update(1 / 60);
  expect(fx.minClodY()).toBeGreaterThanOrEqual(-0.001);
  for (let i = 0; i < 4 * 60; i++) fx.update(1 / 60);
  expect(fx.clodsAlive).toBe(0);
  expect(fx.dustAlive).toBe(0);
  expect(visible(fx)).toBe(0);
  fx.dispose();
});

it('opakované hrabání znovu použije stejné objekty (pevný počet)', () => {
  const scene = new THREE.Scene();
  const fx = new DirtFx(scene);
  const n = fx.root.children.length;
  for (let i = 0; i < 30; i++) { fx.burst(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0); fx.update(0.05); }
  expect(fx.root.children.length).toBe(n);
  fx.dispose();
  expect(scene.children).not.toContain(fx.root);
});
