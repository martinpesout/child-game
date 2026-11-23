import * as THREE from 'three';
import { OcclusionFader } from '../../src/world/occlusion';

const box = (x: number, z: number) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial());
  g.add(m);
  g.position.set(x, 1, z);
  g.updateMatrixWorld(true);
  return { g, mat: m.material as THREE.MeshStandardMaterial };
};

it('překážka mezi kamerou a křečkem zprůhlední, ostatní ne', () => {
  const between = box(0, 3);
  const aside = box(6, 3);
  const f = new OcclusionFader([between.g, aside.g]);
  const cam = new THREE.Vector3(0, 1, 8);
  const target = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < 60; i++) f.update(cam, target, 1 / 60);
  expect(between.mat.opacity).toBeLessThan(0.5);
  expect(between.mat.transparent).toBe(true);
  expect(aside.mat.opacity).toBe(1);
});

it('když křeček vyjde zpoza překážky, vrátí se plná viditelnost', () => {
  const b = box(0, 3);
  const f = new OcclusionFader([b.g]);
  const cam = new THREE.Vector3(0, 1, 8);
  for (let i = 0; i < 60; i++) f.update(cam, new THREE.Vector3(0, 0, 0), 1 / 60);
  for (let i = 0; i < 120; i++) f.update(new THREE.Vector3(10, 1, 8), new THREE.Vector3(10, 0, 0), 1 / 60);
  expect(b.mat.opacity).toBe(1);
  expect(b.mat.transparent).toBe(false);
});
