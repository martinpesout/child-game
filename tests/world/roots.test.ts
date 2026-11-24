import * as THREE from 'three';
import { rootStrand, makeRootArch, makeTreeRoots, makeRootBand } from '../../src/world/roots';
import { makeRootFence } from '../../src/world/burrow';
import { LEVEL4 } from '../../src/levels/level4Data';

const radiusAt = (g: THREE.BufferGeometry, nearY: number) => {
  // spread of vertices within a thin slice around y
  const p = g.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - nearY) < 0.02) { min = Math.min(min, p.getX(i)); max = Math.max(max, p.getX(i)); }
  return (max - min) / 2;
};

it('kořen se zužuje od kořene ke špičce', () => {
  const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, 1, 0)];
  const mesh = rootStrand(pts, (t) => 0.2 * (1 - t) + 0.02, new THREE.MeshStandardMaterial(), 1, 0);
  const g = (mesh.children[0] as THREE.Mesh).geometry;
  expect(radiusAt(g, 0.05)).toBeGreaterThan(radiusAt(g, 0.95) * 2);
});

it('oblouk kořene vychází ze země a zase se do ní noří, je vyšší než skok', () => {
  const arch = makeRootArch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.5, 0, 0), 1.1, 3, new THREE.MeshStandardMaterial());
  const box = new THREE.Box3().setFromObject(arch);
  expect(box.min.y).toBeLessThan(0.05);
  expect(box.max.y).toBeGreaterThan(1.0);
});

it('plot ohrady je z propletených oblouků, ne z kůlů', () => {
  const fence = makeRootFence(LEVEL4.pens[0]);
  const geoms = new Set<string>();
  fence.traverse((o) => { if ((o as THREE.Mesh).isMesh) geoms.add((o as THREE.Mesh).geometry.type); });
  expect(geoms.has('BufferGeometry') || geoms.has('TubeGeometry')).toBe(true);
  expect(geoms.has('CylinderGeometry')).toBe(false);
});

it('kořeny stromu se noří do země kolem kmene', () => {
  const r = makeTreeRoots(1.1, 6);
  const box = new THREE.Box3().setFromObject(r);
  expect(box.max.x).toBeGreaterThan(2.2);
  expect(box.min.y).toBeLessThan(0.02);
});

it('kořenová vrstva pod zemí vynechá vstup a východ', () => {
  const band = makeRootBand(0, 9, 0.6, 0.35, [1.2, 7.8], 4);
  const box = new THREE.Box3().setFromObject(band);
  expect(box.max.y).toBeLessThan(0.6 + 0.15); // only the roots from the tree side reach up into the grass
  // no strand crosses the free columns
  band.updateMatrixWorld(true);
  for (const freeX of [1.2, 7.8]) {
    let crossing = 0;
    band.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      if (b.min.x < freeX - 0.05 && b.max.x > freeX + 0.05 && b.max.y > -0.3) crossing++;
    });
    expect(crossing).toBe(0);
  }
  expect(band.userData.hanging.length).toBeGreaterThan(3);
});
