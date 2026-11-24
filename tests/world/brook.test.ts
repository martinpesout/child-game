import * as THREE from 'three';
import { makeWater, makeStone, makeStump, makeLily, makeLog, makeFlowerMarker, makeBud, makeRipples, setStepGlow, makeReeds } from '../../src/world/brook';

const topOf = (o: THREE.Object3D) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o).max.y;
};

it('voda je pás podél potoka ve výšce hladiny a jmenuje se water', () => {
  const w = makeWater(() => 0, () => 2, 0.08, 20);
  expect(w.name).toBe('water');
  const box = new THREE.Box3().setFromObject(w);
  expect(box.max.y).toBeCloseTo(0.08, 2);
  expect(box.max.x).toBeCloseTo(2, 1);
  expect(box.min.z).toBeLessThan(-19);
  expect(typeof w.userData.tick).toBe('function');
});

it('kámen a pařez mají vršek ve správné výšce', () => {
  expect(topOf(makeStone(0.5, 0.18, 1))).toBeCloseTo(0.18, 1);
  expect(topOf(makeStump(0.5, 0.45))).toBeCloseTo(0.45, 1);
});

it('leknín má plochu (pad) ve výšce vršku', () => {
  const l = makeLily(0.55, 0.13);
  const pad = l.userData.pad as THREE.Object3D;
  expect(topOf(pad)).toBeCloseTo(0.13, 1);
});

it('kláda je dlouhá podél proudu (z) a vršek má ve výšce', () => {
  const log = makeLog(1.8, 0.3, 0.2);
  const box = new THREE.Box3().setFromObject(log);
  expect(box.max.z - box.min.z).toBeGreaterThan(1.7);
  expect(box.max.x - box.min.x).toBeLessThan(0.8);
  expect(box.max.y).toBeCloseTo(0.2, 1);
});

it('kytička na břehu se rozvine', () => {
  const f = makeFlowerMarker();
  const before = f.petals.scale.x;
  expect(f.open).toBe(false);
  f.bloom(1);
  expect(f.open).toBe(true);
  expect(f.petals.scale.x).toBeGreaterThan(before);
});

it('květ s jahodou se po otevření rozvine', () => {
  const b = makeBud();
  expect(b.isOpen).toBe(false);
  b.open();
  for (let i = 0; i < 120; i++) b.update(1 / 60);
  expect(b.isOpen).toBe(true);
  expect(b.berry.visible).toBe(true);
});

it('kruhy na vodě po chvíli zmizí', () => {
  const r = makeRipples();
  r.spawn(1, 2, 0.08);
  expect(r.root.children.some((c) => c.visible)).toBe(true);
  r.update(2);
  expect(r.root.children.some((c) => c.visible)).toBe(false);
});

it('svícení dalšího kamene mění emissive', () => {
  const s = makeStone(0.5, 0.18, 2);
  setStepGlow(s, true, 0.3);
  const cap = s.userData.cap as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  expect(cap.material.emissiveIntensity).toBeGreaterThan(0);
  setStepGlow(s, false, 0.3);
  expect(cap.material.emissiveIntensity).toBe(0);
});

it('rákosí je dekorace s několika stébly', () => {
  expect(makeReeds(3).children.length).toBeGreaterThan(3);
});
