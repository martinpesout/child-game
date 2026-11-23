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
