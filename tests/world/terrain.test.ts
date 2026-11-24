import * as THREE from 'three';
import { Terrain } from '../../src/world/terrain';
import { buildWorld } from '../../src/world/world';

const hilly = () => new Terrain({ seed: 7, amplitude: 0.5, flat: (x, z) => Math.min(1, Math.max(0, (Math.hypot(x, z) - 2) / 3)) });

it('Terrain s amplitudou 0.5 nikde nepřesáhne ±0.5 m', () => {
  const t = hilly();
  for (let x = -20; x <= 20; x += 0.7) for (let z = -20; z <= 20; z += 0.7) expect(Math.abs(t.height(x, z))).toBeLessThanOrEqual(0.5);
});

it('maximální sklon je mírný (kopec jde vyběhnout)', () => {
  expect(hilly().maxSlope(20)).toBeLessThanOrEqual(0.35);
});

it('zploštělá oblast je rovná', () => {
  const t = hilly();
  for (let a = 0; a < 6.28; a += 0.5) expect(Math.abs(t.height(Math.cos(a) * 1.8, Math.sin(a) * 1.8))).toBeLessThan(0.02);
});

it('Terrain.flat je všude 0', () => {
  expect(Terrain.flat().height(3, -7)).toBe(0);
});

it('buildWorld položí trávu na terén (žádný trs pod zemí ani ve vzduchu)', () => {
  const scene = new THREE.Scene();
  const terrain = hilly();
  const w = buildWorld(scene, { halfSize: 20, terrain, colliders: [], props: [], avoid: [] });
  const grass = scene.getObjectByName('grass') as THREE.InstancedMesh;
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  for (let i = 0; i < grass.count; i += 97) {
    grass.getMatrixAt(i, m);
    p.setFromMatrixPosition(m);
    expect(p.y).toBeCloseTo(terrain.height(p.x, p.z), 3);
  }
  w.dispose();
});
