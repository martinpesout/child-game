import * as THREE from 'three';
import { Cat } from '../../src/characters/cat';
import { makeCover, makeHideShade } from '../../src/world/yard';

it('kocour ve spánku má Zzz, při pohledu ne; víčko se otevírá', () => {
  const c = new Cat();
  c.setState('sleep', 0.5);
  c.update(1 / 60);
  expect(c.root.getObjectByName('zzz')!.visible).toBe(true);
  expect(c.eyeOpen).toBe(0);
  c.setState('warn', 0.6);
  c.update(1 / 60);
  expect(c.root.getObjectByName('zzz')!.visible).toBe(false);
  expect(c.eyeOpen).toBeGreaterThan(0.3);
  c.setState('look', 0.5);
  c.update(1 / 60);
  expect(c.eyeOpen).toBe(1);
  const geoms = new Set<THREE.BufferGeometry>();
  c.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry); });
  const spy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
  c.dispose();
  const done = new Set(spy.mock.contexts);
  for (const g of geoms) expect(done.has(g)).toBe(true);
  spy.mockRestore();
});

it('úkryty jsou dost vysoké na schování křečka a stín leží na zemi', () => {
  for (const k of ['pot', 'can', 'bush', 'crate'] as const) {
    const box = new THREE.Box3().setFromObject(makeCover(k, 1));
    expect(box.max.y).toBeGreaterThan(0.5);
  }
  const shade = makeHideShade(1);
  expect(shade.position.y).toBeLessThan(0.05);
  expect(typeof shade.userData.setActive).toBe('function');
});

it('plot u domu je z úseků, aby se zprůhlednila jen část před křečkem', async () => {
  const { makeHomeFence } = await import('../../src/world/yard');
  const f = makeHomeFence(-7, 20);
  expect(f.children.length).toBe(10);
});

it('plot má málo dílů (výkon) a každý úsek má vlastní materiál (zprůhlední se jen on)', async () => {
  const { makeHomeFence } = await import('../../src/world/yard');
  const f = makeHomeFence(-7, 20);
  let meshes = 0;
  f.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
  expect(meshes).toBeLessThanOrEqual(30);
  const m0 = (f.children[0].children[0] as THREE.Mesh).material;
  const m1 = (f.children[1].children[0] as THREE.Mesh).material;
  expect(m0).not.toBe(m1);
});

it('kocour má zelené oči, růžové polštářky a při mňouknutí se mu naježí srst a ocas', () => {
  const c = new Cat();
  expect(c.root.getObjectByName('iris')).toBeTruthy();
  expect(c.root.getObjectByName('pads')).toBeTruthy();
  const bristle = c.root.getObjectByName('bristle')!;
  const tail = c.root.getObjectByName('tail')!;
  c.update(1 / 60);
  expect(bristle.scale.y).toBeLessThan(0.2);
  const tailBefore = tail.scale.x;
  c.scare();
  for (let i = 0; i < 12; i++) c.update(1 / 60);
  expect(bristle.scale.y).toBeGreaterThan(0.6);
  expect(tail.scale.x).toBeGreaterThan(tailBefore * 1.2);
  for (let i = 0; i < 120; i++) c.update(1 / 60);
  expect(bristle.scale.y).toBeLessThan(0.2);
  c.dispose();
});
