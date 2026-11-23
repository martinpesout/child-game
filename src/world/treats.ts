import * as THREE from 'three';
import type { ItemKind } from '../levels/level1Data';
import { PartKit } from '../characters/parts';

/** Builds a cute treat model; origin at its bottom. */
export function makeTreat(kind: ItemKind, kit: PartKit): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'nut') {
    g.add(kit.ball(0.11, 0xb5743d, [0, 0.11, 0], [1, 1.1, 1], 0.6));
    g.add(kit.ball(0.095, 0xe9c48f, [0, 0.19, 0], [1.05, 0.5, 1.05], 0.9));
    g.add(kit.ball(0.02, 0x7a4a26, [0, 0.24, 0]));
  } else if (kind === 'strawberry') {
    const body = new THREE.Mesh(kit.geom(new THREE.SphereGeometry(0.13, 16, 12)), kit.mat(0xe8344a, 0.45));
    body.scale.set(1, 1.15, 1);
    body.position.y = 0.13;
    // squeeze the bottom into a soft point
    const pos = body.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) {
        const k = 1 + (y / 0.13) * 0.45;
        pos.setX(i, pos.getX(i) * k);
        pos.setZ(i, pos.getZ(i) * k);
      }
    }
    body.geometry.computeVertexNormals();
    body.castShadow = true;
    g.add(body);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = kit.ball(0.045, 0x4caf50, [Math.cos(a) * 0.05, 0.27, Math.sin(a) * 0.05], [1, 0.35, 0.6]);
      leaf.rotation.y = -a;
      g.add(leaf);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      const y = 0.08 + (i % 4) * 0.035;
      g.add(kit.ball(0.01, 0xfff3a0, [Math.cos(a) * 0.115 * (0.7 + y), y, Math.sin(a) * 0.115 * (0.7 + y)]));
    }
  } else if (kind === 'carrot') {
    const c = new THREE.Mesh(kit.geom(new THREE.ConeGeometry(0.07, 0.32, 14)), kit.mat(0xff8c2b, 0.7));
    c.rotation.x = Math.PI;
    c.position.y = 0.16;
    c.castShadow = true;
    g.add(c);
    for (const a of [-0.4, 0, 0.4]) {
      const leaf = kit.ball(0.03, 0x4caf50, [Math.sin(a) * 0.04, 0.38, 0], [0.6, 2.2, 0.6]);
      leaf.rotation.z = a;
      g.add(leaf);
    }
    // lie it down a little so it reads as a carrot
    g.rotation.z = 0.5;
  } else {
    g.add(kit.ball(0.14, 0xe53935, [0, 0.14, 0], [1.05, 0.95, 1.05], 0.4));
    const stem = new THREE.Mesh(kit.geom(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6)), kit.mat(0x6d4c41));
    stem.position.y = 0.29;
    g.add(stem);
    const leaf = kit.ball(0.04, 0x66bb6a, [0.04, 0.31, 0], [1.2, 0.3, 0.6]);
    leaf.rotation.z = -0.5;
    g.add(leaf);
  }
  return g;
}
