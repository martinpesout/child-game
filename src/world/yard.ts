import * as THREE from 'three';

/** Yard props of level 5: hiding spots against the cat (with a shade on the ground) and the home fence. */

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });

function shadowy<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

/** A thing big enough for the hamster to hide behind. */
export function makeCover(kind: 'pot' | 'can' | 'bush' | 'crate', seed: number): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'pot') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 0.6, 18), mat(0xc96a3d));
    pot.position.y = 0.3;
    g.add(pot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 20), mat(0xb35a30));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.6;
    g.add(rim);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(0x5aa845));
      leaf.position.set(Math.cos(i + seed) * 0.18, 0.75 + (i % 2) * 0.1, Math.sin(i + seed) * 0.18);
      g.add(leaf);
    }
  } else if (kind === 'can') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.62, 18), mat(0x5b8fd6, { metalness: 0.3 }));
    can.position.y = 0.31;
    g.add(can);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), mat(0x5b8fd6, { metalness: 0.3 }));
    spout.position.set(0.42, 0.45, 0);
    spout.rotation.z = -0.9;
    g.add(spout);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI), mat(0x4a78b8));
    handle.position.set(0, 0.62, 0);
    g.add(handle);
  } else if (kind === 'bush') {
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.32 + (i % 2) * 0.08, 12, 10), mat(i % 2 ? 0x4f9e3d : 0x63b04a));
      b.position.set(Math.cos(i * 1.3 + seed) * 0.25, 0.35 + (i % 3) * 0.12, Math.sin(i * 1.3 + seed) * 0.25);
      g.add(b);
    }
  } else {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.6), mat(0xc0894e));
    crate.position.y = 0.3;
    g.add(crate);
    for (const y of [0.12, 0.48]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.62), mat(0x9c6a38));
      slat.position.y = y;
      g.add(slat);
    }
  }
  return shadowy(g);
}

/** Darker circle on the ground: "here you are hidden". `userData.setActive(on)` makes it glow while the cat looks. */
export function makeHideShade(r: number): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({ color: 0x2b3a6b, transparent: true, opacity: 0.22, depthWrite: false });
  const shade = new THREE.Mesh(new THREE.CircleGeometry(r, 28), m);
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.02;
  shade.userData.setActive = (on: boolean) => {
    m.opacity = on ? 0.4 : 0.22;
    m.color.setHex(on ? 0x3a5bd6 : 0x2b3a6b);
  };
  return shade;
}

/** Wooden plank fence across the world at z (with roots at its foot), from -half to +half. */
export function makeHomeFence(z: number, half: number): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(0xb07a45);
  const dark = mat(0x8a5a35);
  for (let x = -half; x <= half; x += 0.32) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.5 + Math.sin(x * 3) * 0.08, 0.06), wood);
    plank.position.set(x, 0.75, z);
    g.add(plank);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 4), wood);
    tip.position.set(x, 1.6, z);
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
  }
  for (const y of [0.4, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.1, 0.08), dark);
    rail.position.set(0, y, z - 0.07);
    g.add(rail);
  }
  return shadowy(g);
}
