import * as THREE from 'three';
import type { Pen } from '../levels/level4Data';
import { penColliders } from '../levels/level4Data';

/** Surface visuals of level 4: the big tree, dirt mounds, holes, molehills, root fences, falling leaves. */

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts });

function shadowy<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

/** Big old tree with roots; `userData.tick(t)` sways the crown. */
export function makeBigTree(r: number): THREE.Group {
  const root = new THREE.Group();
  const bark = mat(0x7a4e2d);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 4.2, 14), bark);
  trunk.position.y = 2.1;
  root.add(trunk);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 1.6, 6), bark);
    rt.position.set(Math.cos(a) * (r + 0.4), 0.12, Math.sin(a) * (r + 0.4));
    rt.rotation.set(Math.sin(a) * 1.35, 0, -Math.cos(a) * 1.35);
    root.add(rt);
  }
  const crown = new THREE.Group();
  crown.position.y = 4.6;
  const leaf = mat(0x4f9e3d);
  const leaf2 = mat(0x63b04a);
  const blobs: [number, number, number, number][] = [
    [0, 0.8, 0, 2.6],
    [-1.9, 0.2, 0.4, 1.8],
    [1.9, 0.3, -0.3, 1.9],
    [0.3, 0.4, 1.8, 1.7],
    [-0.4, 0.5, -1.8, 1.8],
    [0.2, 2.2, 0.1, 1.7],
  ];
  blobs.forEach(([x, y, z, s], i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), i % 2 ? leaf2 : leaf);
    b.position.set(x, y, z);
    crown.add(b);
  });
  root.add(crown);
  root.userData.tick = (t: number) => {
    crown.rotation.z = Math.sin(t * 0.7) * 0.025;
    crown.rotation.x = Math.sin(t * 0.5 + 1) * 0.02;
  };
  return shadowy(root);
}

/** Dirt mound (not an obstacle); `setLeft(k)` = digs left (3 full .. 0 flat), `shake(t)` invites digging. */
export function makeMound(seed = 1): { root: THREE.Group; setLeft(k: number): void; shake(t: number): void } {
  const root = new THREE.Group();
  const hill = new THREE.Group();
  root.add(hill);
  const dirt = mat(0x8b5a35);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), dirt);
  body.scale.y = 0.65;
  hill.add(body);
  const clods = mat(0x6e4526);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), clods);
    c.position.set(Math.cos(a) * 0.3, 0.2 + (i % 2) * 0.06, Math.sin(a) * 0.3);
    hill.add(c);
  }
  const flat = new THREE.Mesh(new THREE.CircleGeometry(0.6, 18), mat(0x6e4526));
  flat.rotation.x = -Math.PI / 2;
  flat.position.y = 0.01;
  root.add(flat);
  let left = 3;
  return {
    root: shadowy(root),
    setLeft(k: number) {
      left = k;
      const s = k / 3;
      hill.scale.set(0.7 + 0.3 * s, Math.max(0.02, s), 0.7 + 0.3 * s);
      hill.visible = k > 0;
    },
    shake(t: number) {
      if (left <= 0) return;
      hill.rotation.y = Math.sin(t * 9 + seed) * 0.04;
      hill.position.y = Math.max(0, Math.sin(t * 2 + seed)) * 0.015;
    },
  };
}

/** Dark hole with dug-out earth around it (way into the maze). `userData.tick(t)` makes earth tremble. */
export function makeHole(): THREE.Group {
  const root = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.02;
  root.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 20), mat(0x8b5a35));
  rim.rotation.x = -Math.PI / 2;
  rim.scale.z = 0.6;
  root.add(rim);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0xffd84d, transparent: true, opacity: 0.4, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  root.add(glow);
  root.userData.tick = (t: number) => {
    (glow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.2 * Math.sin(t * 4);
    rim.position.y = Math.abs(Math.sin(t * 13)) * 0.01;
  };
  return shadowy(root);
}

/** Small molehill (exit / way back). */
export function makeMolehill(): THREE.Group {
  const root = new THREE.Group();
  const hill = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a5032));
  hill.scale.y = 0.5;
  root.add(hill);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.215;
  root.add(hole);
  return shadowy(root);
}

/** Gnarly root fence around a pen, one post per physics collider. */
export function makeRootFence(p: Pen): THREE.Group {
  const root = new THREE.Group();
  const bark = mat(0x6b4429);
  const fern = mat(0x4e9a3a);
  penColliders(p).forEach((c, i) => {
    if (c.kind !== 'cylinder') return;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(c.radius * 0.7, c.radius, c.height + 0.1 + (i % 3) * 0.12, 7), bark);
    post.position.set(c.x, (c.height + 0.1) / 2, c.z);
    post.rotation.z = Math.sin(i * 1.7) * 0.12;
    root.add(post);
    if (i % 3 === 0) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 5), fern);
      f.position.set(c.x, 0.25, c.z);
      root.add(f);
    }
  });
  return shadowy(root);
}

/** A leaf that drifts down from the crown and starts again (ambient). */
export function makeFallingLeaf(seed: number, from: THREE.Vector3): { root: THREE.Mesh; update(dt: number): void } {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), mat(seed % 2 ? 0xe0a83a : 0x7fbf4a, { side: THREE.DoubleSide }));
  m.scale.y = 0.6;
  let t = seed * 1.3;
  const reset = () => {
    m.position.set(from.x + Math.sin(seed * 7 + t) * 2.2, from.y, from.z + Math.cos(seed * 5 + t) * 2.2);
  };
  reset();
  return {
    root: m,
    update(dt: number) {
      t += dt;
      m.position.y -= dt * 0.45;
      m.position.x += Math.sin(t * 2 + seed) * dt * 0.4;
      m.rotation.set(Math.sin(t * 3) * 0.8, t, Math.cos(t * 2) * 0.6);
      if (m.position.y < 0.02) reset();
    },
  };
}
