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


it('detailní záběr: kamera je blízko před obličejem křečka', () => {
  const cam = new THREE.PerspectiveCamera();
  const f = new FollowCamera(cam);
  const target = new THREE.Vector3(0, 0, 0);
  f.snap(target);
  f.closeup(Math.PI); // hamster faces -Z
  for (let i = 0; i < 240; i++) f.update(target, 1 / 60);
  expect(cam.position.distanceTo(target)).toBeLessThan(2);
  expect(cam.position.z).toBeLessThan(-0.5);
  f.follow();
  for (let i = 0; i < 240; i++) f.update(target, 1 / 60);
  expect(cam.position.z).toBeCloseTo(4.5, 1);
});

it('kamera za křečkem: stojí za ním ve směru jeho pohledu a otáčí se s ním', () => {
  const cam = new THREE.PerspectiveCamera();
  const f = new FollowCamera(cam);
  const target = new THREE.Vector3(0, 0, 0);
  f.setChase(true);
  f.setHeading(Math.PI / 2); // hamster faces +X
  f.snap(target);
  for (let i = 0; i < 240; i++) f.update(target, 1 / 60);
  expect(cam.position.x).toBeCloseTo(-4.5, 1);
  expect(cam.position.z).toBeCloseTo(0, 1);
  // stick "up" must mean the hamster's forward
  expect(f.yaw).toBeCloseTo(-Math.PI / 2, 1);
});

it('záběr z daného místa: kamera dojede na pozici a dívá se na cíl', () => {
  const cam = new THREE.PerspectiveCamera();
  const f = new FollowCamera(cam);
  f.snap(new THREE.Vector3(0, 0, 0));
  f.shot(new THREE.Vector3(5, 2, 0), new THREE.Vector3(0, 0.5, 0));
  for (let i = 0; i < 300; i++) f.update(new THREE.Vector3(0, 0, 0), 1 / 60);
  expect(cam.position.x).toBeCloseTo(5, 1);
  expect(cam.position.y).toBeCloseTo(2, 1);
  const fwd = new THREE.Vector3();
  cam.getWorldDirection(fwd);
  expect(fwd.x).toBeLessThan(-0.9);
});
