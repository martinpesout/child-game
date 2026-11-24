import * as THREE from 'three';

/** Visuals of the brook level: water, stones, stumps, lily pads, the log, bank flowers and the strawberry bud. */

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

/** How deep under the water the stones/stumps reach (only the bed is below). */
const DEPTH = 0.6;

/** Water ribbon following the brook (centre x(z), half-width by z) from -extent to +extent along z. */
export function makeWater(center: (z: number) => number, half: (z: number) => number, y: number, extent: number): THREE.Mesh {
  const pos: number[] = [];
  const idx: number[] = [];
  const step = 0.5;
  let i = 0;
  for (let z = -extent; z <= extent + 1e-6; z += step, i++) {
    const cx = center(z);
    const hw = half(z);
    pos.push(cx - hw, y, z, cx + hw, y, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = mat(0x5fb3e6, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const water = new THREE.Mesh(g, m);
  water.name = 'water';
  water.receiveShadow = true;
  // gentle shimmer: the colour breathes a little
  const base = new THREE.Color(0x5fb3e6);
  const light = new THREE.Color(0x8fd0f4);
  water.userData.tick = (t: number) => m.color.copy(base).lerp(light, 0.25 + 0.25 * Math.sin(t * 1.3));
  return water;
}

/** Flat-topped river stone; `userData.cap` is the top used for the "next stone" glow. */
export function makeStone(r: number, top: number, seed = 1): THREE.Group {
  const root = new THREE.Group();
  const grey = [0xa9a49b, 0xb8b2a8, 0x9d9890][seed % 3];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 1.1, top + DEPTH, 9), mat(grey, { flatShading: true }));
  body.position.y = (top - DEPTH) / 2 - 0.02;
  body.rotation.y = seed;
  root.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.95, 0.04, 9), mat(0xc9c3b8, { flatShading: true }));
  cap.position.y = top - 0.02;
  cap.rotation.y = seed;
  root.add(cap);
  // a bit of moss
  const moss = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 6, 4), mat(0x6f9e4a));
  moss.scale.set(1, 0.25, 0.8);
  moss.position.set(r * 0.45, top - 0.03, -r * 0.3);
  root.add(moss);
  root.userData.cap = cap;
  return shadowy(root);
}

/** Tree stump with year rings on its top. */
export function makeStump(r: number, top: number): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 1.08, top + DEPTH, 12), mat(0x8a5a35));
  body.position.y = (top - DEPTH) / 2 - 0.02;
  root.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.04, 16), mat(0xe2b77f));
  cap.position.y = top - 0.02;
  root.add(cap);
  for (const k of [0.35, 0.65]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.012, 4, 20), mat(0xb98a55));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = top - 0.005;
    root.add(ring);
  }
  root.userData.cap = cap;
  return shadowy(root);
}

/** Lily pad with a small flower; `userData.pad` tilts/shakes, the whole root sinks. */
export function makeLily(r: number, top: number): THREE.Group {
  const root = new THREE.Group();
  const pad = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 24, 1, false, 0.35, Math.PI * 2 - 0.35), mat(0x4f9e3d));
  leaf.position.y = top - 0.02;
  pad.add(leaf);
  const vein = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.005, 20), mat(0x67b553));
  vein.position.y = top + 0.001;
  pad.add(vein);
  const flower = new THREE.Group();
  const petalMat = mat(0xffc1d6);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), petalMat);
    const a = (i / 6) * Math.PI * 2;
    p.scale.set(1, 0.5, 0.5);
    p.position.set(Math.cos(a) * 0.07, 0.04, Math.sin(a) * 0.07);
    p.rotation.y = -a;
    flower.add(p);
  }
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0xffd84d));
  middle.position.y = 0.05;
  flower.add(middle);
  flower.position.set(-r * 0.45, top, r * 0.3);
  root.add(pad, flower);
  root.userData.pad = pad;
  root.userData.cap = leaf;
  return shadowy(root);
}

/** Floating log lying along the current (z); its top is at `top`. */
export function makeLog(len: number, r: number, top: number): THREE.Group {
  const root = new THREE.Group();
  const radius = r * 1.1;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 14), mat(0x8b5a33));
  body.rotation.x = Math.PI / 2;
  body.position.y = top - radius;
  root.add(body);
  const endMat = mat(0xd9a96d);
  for (const s of [-1, 1]) {
    const end = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.95, 14), endMat);
    end.position.set(0, top - radius, (s * len) / 2 + s * 0.002);
    end.rotation.y = s > 0 ? 0 : Math.PI;
    root.add(end);
  }
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.2, 5), mat(0x6e4526));
  twig.position.set(radius * 0.9, top - radius * 0.4, len * 0.2);
  twig.rotation.z = -1.3;
  root.add(twig);
  root.userData.cap = body;
  return shadowy(root);
}

/** Flower on the far bank of a crossing: a closed bud that blooms once the crossing is done. */
export function makeFlowerMarker(): { root: THREE.Group; petals: THREE.Group; open: boolean; bloom(t: number): void } {
  const root = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), mat(0x4e9a3a));
  stem.position.y = 0.275;
  root.add(stem);
  const petals = new THREE.Group();
  const petalMat = mat(0xff8fb1);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), petalMat);
    const a = (i / 6) * Math.PI * 2;
    p.scale.set(1, 0.45, 0.6);
    p.position.set(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1);
    p.rotation.y = -a;
    petals.add(p);
  }
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffd84d));
  petals.add(middle);
  petals.position.y = 0.58;
  petals.scale.setScalar(0.35);
  root.add(petals);
  const marker = {
    root,
    petals,
    open: false,
    /** k = 0..1 bloom progress (call repeatedly). */
    bloom(k: number) {
      const s = 0.35 + 0.65 * Math.min(1, Math.max(0, k));
      petals.scale.setScalar(s);
      if (k >= 1) marker.open = true;
    },
  };
  return marker;
}

/** Big flower on the finish stump holding the strawberry; it opens when all crossings are done. */
export function makeBud(): { root: THREE.Group; berry: THREE.Group; isOpen: boolean; open(): void; update(dt: number): void } {
  const root = new THREE.Group();
  const petals: THREE.Mesh[] = [];
  const petalMat = mat(0xffb3c8);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), petalMat);
    p.scale.set(0.55, 1, 0.3);
    const holder = new THREE.Group();
    holder.rotation.y = (i / 6) * Math.PI * 2;
    p.position.set(0, 0.2, 0.12);
    holder.add(p);
    root.add(holder);
    petals.push(p);
  }
  const berry = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(0xe8384f, { roughness: 0.5 }));
  fruit.scale.set(1, 1.15, 1);
  fruit.position.y = 0.2;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.06, 6), mat(0x4e9a3a));
  leaves.position.y = 0.38;
  leaves.rotation.x = Math.PI;
  berry.add(fruit, leaves);
  berry.visible = false;
  root.add(berry);
  let k = 0;
  let opening = false;
  const setPetals = () => petals.forEach((p) => (p.parent!.rotation.x = -k * 1.1));
  setPetals();
  const bud = {
    root,
    berry,
    isOpen: false,
    open() {
      opening = true;
      berry.visible = true;
    },
    update(dt: number) {
      if (!opening || bud.isOpen) return;
      k = Math.min(1, k + dt * 1.5);
      setPetals();
      if (k >= 1) bud.isOpen = true;
    },
  };
  return shadowy(bud.root) && bud;
}

/** Expanding rings on the water after a splash. */
export function makeRipples(): { root: THREE.Group; spawn(x: number, z: number, y: number): void; update(dt: number): void } {
  const root = new THREE.Group();
  const rings: { mesh: THREE.Mesh; t: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    root.add(m);
    rings.push({ mesh: m, t: -1 });
  }
  return {
    root,
    spawn(x, z, y) {
      rings.forEach((r, i) => {
        r.t = -i * 0.18;
        r.mesh.position.set(x, y + 0.01, z);
        r.mesh.visible = r.t >= 0;
        r.mesh.scale.setScalar(0.2);
      });
    },
    update(dt) {
      for (const r of rings) {
        if (r.t === -1 && !r.mesh.visible) continue;
        r.t += dt;
        if (r.t < 0) continue;
        const life = 1.1;
        if (r.t > life) {
          r.mesh.visible = false;
          r.t = -1;
          continue;
        }
        r.mesh.visible = true;
        r.mesh.scale.setScalar(0.2 + r.t * 0.9);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - r.t / life);
      }
    },
  };
}

/** Soft pulsing glow on the next stone to jump to. */
export function setStepGlow(obj: THREE.Object3D, on: boolean, t: number): void {
  const cap = obj.userData.cap as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  if (!cap) return;
  cap.material.emissive.setHex(on ? 0xffc54a : 0x000000);
  cap.material.emissiveIntensity = on ? 0.3 + Math.sin(t * 4) * 0.15 : 0;
}

/** Clump of reeds with cattails for the banks. */
export function makeReeds(seed = 1): THREE.Group {
  const root = new THREE.Group();
  const leaf = mat(0x5c9a3e);
  const head = mat(0x7a4a26);
  const n = 5 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const h = 0.7 + ((i * 37 + seed * 11) % 10) * 0.05;
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, h, 4), leaf);
    const a = (i / n) * Math.PI * 2 + seed;
    blade.position.set(Math.cos(a) * 0.12, h / 2, Math.sin(a) * 0.12);
    blade.rotation.z = Math.cos(a) * 0.15;
    blade.rotation.x = Math.sin(a) * 0.15;
    root.add(blade);
    if (i % 2 === 0) {
      const cat = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 3, 6), head);
      cat.position.set(blade.position.x, h + 0.05, blade.position.z);
      root.add(cat);
    }
  }
  return shadowy(root);
}
