import * as THREE from 'three';
import { FollowCamera } from '../../src/world/camera';

it('po 2 s stojí za cílem (od kamery na +Z) ve vzdálenosti ~4.5 m a výšce ~3 m', () => {
  const cam = new THREE.PerspectiveCamera();
  const f = new FollowCamera(cam);
  const target = new THREE.Vector3(5, 0, -3);
  for (let i = 0; i < 120; i++) f.update(target, 1 / 60);
  expect(Math.hypot(cam.position.x - 5, cam.position.z + 3)).toBeCloseTo(4.5, 1);
  expect(cam.position.y).toBeCloseTo(3, 1);
  expect(cam.position.z).toBeGreaterThan(-3);
  expect(f.yaw).toBe(0);
});

it('snap okamžitě skočí na cíl', () => {
  const cam = new THREE.PerspectiveCamera();
  const f = new FollowCamera(cam);
  f.snap(new THREE.Vector3(10, 0, 10));
  expect(cam.position.x).toBeCloseTo(10);
  expect(cam.position.z).toBeCloseTo(14.5);
});

