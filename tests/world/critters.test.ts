import * as THREE from 'three';
import { Critters } from '../../src/world/critters';

it('motýli a včelky létají uvnitř louky ve výšce do 2 m a dispose je uklidí', () => {
  const scene = new THREE.Scene();
  const c = new Critters(scene, 20, 6, 4);
  for (let i = 0; i < 600; i++) c.update(1 / 30);
  for (const o of c.all) {
    expect(Math.abs(o.position.x)).toBeLessThan(20);
    expect(Math.abs(o.position.z)).toBeLessThan(20);
    expect(o.position.y).toBeGreaterThan(0.2);
    expect(o.position.y).toBeLessThan(2);
  }
  expect(c.all).toHaveLength(10);
  c.dispose();
  expect(scene.children).toHaveLength(0);
});

it('najde nejbližšího motýla nebo včelku v dosahu křečka', () => {
  const scene = new THREE.Scene();
  const c = new Critters(scene, 20, 1, 1);
  c.update(1 / 60);
  const bee = c.all[1];
  const near = c.nearest(new THREE.Vector3(bee.position.x + 0.5, 0, bee.position.z), 1.5);
  expect(near?.kind).toBe('bee');
  expect(c.nearest(new THREE.Vector3(500, 0, 500), 1.5)).toBeNull();
  c.dispose();
});
