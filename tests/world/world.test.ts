import * as THREE from 'three';
import { buildWorld } from '../../src/world/world';
import { Terrain } from '../../src/world/terrain';
import { LEVEL1 } from '../../src/levels/level1Data';
import { OcclusionFader } from '../../src/world/occlusion';

it('u spodního okraje zprůhlední plot i živý plot mezi kamerou a křečkem', () => {
  const scene = new THREE.Scene();
  const m = buildWorld(scene, { halfSize: LEVEL1.halfSize, terrain: Terrain.flat(), colliders: LEVEL1.colliders, props: LEVEL1.props, avoid: [], house: { ...LEVEL1.house, facing: LEVEL1.spawn } });
  const fader = new OcclusionFader(m.occluders);
  const hamster = new THREE.Vector3(0, 0, 19.6);
  const camera = new THREE.Vector3(0, 3, 19.6 + 4.5);
  for (let i = 0; i < 60; i++) fader.update(camera, hamster, 1 / 60);
  const faded = new Set<THREE.Material>();
  scene.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (mat && mat.opacity < 0.5) faded.add(mat);
  });
  expect(faded.size).toBeGreaterThan(0);
  m.dispose();
});
