import * as THREE from 'three';
import type { Collider } from '../physics/physics';
import type { Course, Gate } from '../levels/course';

/** Half of the free width inside a tube (hamster radius is 0.25). */
export const TUBE_INNER = 0.42;
const TUBE_WALL = 0.12;
const TUBE_RADIUS = 0.55;
const HOOP_RADIUS = 0.95;
const WALL_HEIGHT = 1.0;

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

/** Box yaw so that its local X axis points along (dirX, dirZ). */
const yawAlong = (dirX: number, dirZ: number) => Math.atan2(-dirZ, dirX);
/** Object rotation.y so that its local +Z points along (dirX, dirZ). */
const facing = (dirX: number, dirZ: number) => Math.atan2(dirX, dirZ);

// ---------------------------------------------------------------------------------------------- physics

export function tubeColliders(g: Gate, length: number): Collider[] {
  const sideX = -g.dirZ;
  const sideZ = g.dirX;
  const off = TUBE_INNER + TUBE_WALL / 2;
  return [-1, 1].map((s) => ({
    kind: 'box' as const,
    x: g.x + sideX * off * s,
    z: g.z + sideZ * off * s,
    halfX: length / 2,
    halfZ: TUBE_WALL / 2,
    height: WALL_HEIGHT,
    yaw: yawAlong(g.dirX, g.dirZ),
  }));
}

/** True when (x, z) is inside the tube (no jumping there – the tube has a roof). */
export function tubeZone(g: Gate, length: number): (x: number, z: number) => boolean {
  return (x, z) => {
    const dx = x - g.x;
    const dz = z - g.z;
    const along = dx * g.dirX + dz * g.dirZ;
    const side = -dx * g.dirZ + dz * g.dirX;
    return Math.abs(along) < length / 2 + 0.1 && Math.abs(side) < TUBE_INNER + TUBE_WALL;
  };
}

/** Invisible wall around a puddle. */
export function puddleCollider(x: number, z: number, r: number): Collider {
  return { kind: 'cylinder', x, z, radius: r, height: WALL_HEIGHT };
}

// ---------------------------------------------------------------------------------------------- visuals

export type GateState = 'next' | 'done' | 'waiting';
const GATE_COLORS: Record<GateState, number> = { next: 0xffc93c, done: 0x7bd389, waiting: 0xf2efe6 };

/** Upright hoop the hamster runs through; `userData.ring` holds the coloured ring. */
export function makeHoop(g: Gate): THREE.Group {
  const root = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(HOOP_RADIUS, 0.08, 12, 40), mat(GATE_COLORS.waiting, { roughness: 0.4 }));
  ring.position.y = HOOP_RADIUS + 0.02;
  root.add(ring);
  for (const s of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.25, 8), mat(0x8a5a3c));
    foot.position.set(s * HOOP_RADIUS * 0.75, 0.12, 0);
    root.add(foot);
  }
  root.position.set(g.x, 0, g.z);
  root.rotation.y = facing(g.dirX, g.dirZ);
  root.userData.ring = ring;
  return shadowy(root);
}

export function setGateState(gateObj: THREE.Object3D, state: GateState, t: number): void {
  const ring = gateObj.userData.ring as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  if (!ring) return;
  ring.material.color.setHex(GATE_COLORS[state]);
  const glow = state === 'next' ? 0.35 + Math.sin(t * 5) * 0.25 : 0;
  ring.material.emissive.setHex(state === 'next' ? 0xffb300 : 0x000000);
  ring.material.emissiveIntensity = glow;
  const k = state === 'next' ? 1 + Math.sin(t * 5) * 0.04 : 1;
  ring.scale.set(k, k, 1);
}

/** Cardboard tube ("ruličky"); `userData.ring` is the entrance ring used for the gate colour. */
export function makeTube(g: Gate, length: number): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, length, 28, 1, true), mat(0xd2a66c, { side: THREE.DoubleSide }));
  body.rotation.x = Math.PI / 2;
  body.position.y = TUBE_RADIUS - 0.06;
  root.add(body);
  const bands = mat(0xb5864d);
  for (const z of [-length / 4, length / 4]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(TUBE_RADIUS + 0.005, 0.03, 6, 28), bands);
    band.position.set(0, body.position.y, z);
    root.add(band);
  }
  // both rims share one material, so colouring the gate colours both ends
  const rimMat = mat(GATE_COLORS.waiting, { roughness: 0.4 });
  let first: THREE.Mesh | null = null;
  for (const z of [-length / 2, length / 2]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(TUBE_RADIUS, 0.06, 10, 32), rimMat);
    rim.position.set(0, body.position.y, z);
    root.add(rim);
    first ??= rim;
  }
  root.position.set(g.x, 0, g.z);
  root.rotation.y = facing(g.dirX, g.dirZ);
  root.userData.ring = first;
  return shadowy(root);
}

export function makePuddle(r: number, seed = 1): THREE.Group {
  const root = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat(0x6fb8e8, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.02;
  water.scale.set(1, 0.8 + (seed % 3) * 0.08, 1);
  root.add(water);
  const shine = new THREE.Mesh(new THREE.CircleGeometry(r * 0.25, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  shine.rotation.x = -Math.PI / 2;
  shine.position.set(-r * 0.3, 0.025, -r * 0.2);
  root.add(shine);
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.09), mat(0xb8b2a8, { flatShading: true }), 18);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const k = 1 + ((i * 7 + seed) % 5) * 0.03;
    m.compose(new THREE.Vector3(Math.cos(a) * r * k, 0.04, Math.sin(a) * r * k * (0.8 + (seed % 3) * 0.08)), new THREE.Quaternion(), new THREE.Vector3(1, 0.7, 1));
    stones.setMatrixAt(i, m);
  }
  root.add(stones);
  return root;
}

/** Raised bed with tall flowers (sunflowers / tulips); taller than a jump. */
export function makeFlowerbed(halfX: number, halfZ: number, yaw: number, seed = 1): THREE.Group {
  const root = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 0.3, halfZ * 2), mat(0xa0683c));
  frame.position.y = 0.15;
  root.add(frame);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2 - 0.1, 0.05, halfZ * 2 - 0.1), mat(0x6b4429));
  soil.position.y = 0.31;
  root.add(soil);
  const cols = [0xffd23f, 0xff6b8b, 0xffffff, 0xc7a6ff, 0xff9f43];
  const n = Math.max(3, Math.round(halfX * 3));
  for (let i = 0; i < n; i++) {
    const x = -halfX + 0.25 + (i / Math.max(1, n - 1)) * (halfX * 2 - 0.5);
    const z = ((i * 37 + seed * 11) % 7) / 7 * (halfZ * 1.2) - halfZ * 0.6;
    const h = 0.6 + ((i + seed) % 3) * 0.12;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, h, 5), mat(0x4f9a3a));
    stem.position.set(x, 0.3 + h / 2, z);
    root.add(stem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(cols[(i + seed) % cols.length], { roughness: 0.6 }));
    head.position.set(x, 0.3 + h, z);
    head.scale.set(1, 0.6, 1);
    root.add(head);
  }
  root.rotation.y = yaw;
  return shadowy(root);
}

/** Short picket fence segment along local X. */
export function makeFence(halfX: number, yaw: number): THREE.Group {
  const root = new THREE.Group();
  const wood = mat(0xf3e2c3);
  const n = Math.max(2, Math.round(halfX * 2 / 0.25));
  const picket = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.9, 0.05), wood, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) picket.setMatrixAt(i, m.makeTranslation(-halfX + (i + 0.5) * (halfX * 2) / n, 0.45, 0));
  root.add(picket);
  for (const y of [0.3, 0.7]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 0.06, 0.04), wood);
    rail.position.set(0, y, -0.04);
    root.add(rail);
  }
  root.rotation.y = yaw;
  return shadowy(root);
}

export function makeCan(): THREE.Group {
  const root = new THREE.Group();
  const tin = mat(0x5fa8d3, { roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.55, 20), tin);
  body.position.y = 0.28;
  root.add(body);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 8), tin);
  spout.position.set(0.35, 0.45, 0);
  spout.rotation.z = -0.9;
  root.add(spout);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.06, 10), tin);
  rose.position.set(0.58, 0.63, 0);
  rose.rotation.z = -0.9;
  root.add(rose);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 16, Math.PI), tin);
  handle.position.y = 0.6;
  root.add(handle);
  return shadowy(root);
}

export function makePot(seed = 1): THREE.Group {
  const root = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 18), mat(0xc96a3b));
  pot.position.y = 0.22;
  root.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 18), mat(0xb35a2e));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.45;
  root.add(rim);
  const leaves = mat(seed % 2 ? 0x5fae45 : 0x4f9a3a);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), leaves);
    leaf.position.set(Math.cos(a) * 0.12, 0.62 + (i % 2) * 0.1, Math.sin(a) * 0.12);
    leaf.scale.set(0.7, 1.2, 0.7);
    root.add(leaf);
  }
  return shadowy(root);
}

/** Big wooden hamster wheel on a stand. `rotor` spins around the local X axis. */
export function makeWheel(): { root: THREE.Group; rotor: THREE.Group; seat: THREE.Vector3; spin(dt: number, speed: number): void } {
  const root = new THREE.Group();
  const R = 1.0;
  const W = 0.75;
  const wood = mat(0xd9a46d);
  const rotor = new THREE.Group();
  rotor.position.y = R + 0.15;
  for (const x of [-W / 2, W / 2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 8, 40), wood);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    rotor.add(ring);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, R * 2, 6), wood);
      spoke.rotation.x = (i / 4) * Math.PI;
      spoke.position.x = x;
      rotor.add(spoke);
    }
  }
  const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, W, 6), mat(0xf3e2c3), 24);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    rungs.setMatrixAt(i, m.compose(new THREE.Vector3(0, Math.cos(a) * R, Math.sin(a) * R), q, new THREE.Vector3(1, 1, 1)));
  }
  rotor.add(rungs);
  root.add(rotor);
  const stand = mat(0x8a5a3c);
  for (const x of [-W / 2 - 0.12, W / 2 + 0.12]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, R + 0.35, 8), stand);
      leg.position.set(x, (R + 0.15) / 2, s * 0.35);
      leg.rotation.x = s * -0.35;
      root.add(leg);
    }
  }
  return {
    root: shadowy(root),
    rotor,
    seat: new THREE.Vector3(0, 0.2, 0),
    spin(dt: number, speed: number) {
      rotor.rotation.x += dt * speed;
    },
  };
}

/** Sandy path ribbon following the course, with a few pebbles. */
export function makePath(course: Course, width = 1.5): THREE.Group {
  const root = new THREE.Group();
  const pos: number[] = [];
  const idx: number[] = [];
  const step = 0.4;
  let i = 0;
  for (let s = 0; s <= course.length; s += step, i++) {
    const p = course.pointAt(s);
    const t = course.tangentAt(s);
    const w = width / 2 + Math.sin(s * 0.9) * 0.08;
    pos.push(p.x - t.z * w, 0.015, p.z + t.x * w, p.x + t.z * w, 0.015, p.z - t.x * w);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ribbon = new THREE.Mesh(g, mat(0xe6c98f, { side: THREE.DoubleSide }));
  ribbon.receiveShadow = true;
  root.add(ribbon);
  const count = Math.floor(course.length * 2);
  const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.05), mat(0xbfb6a8, { flatShading: true }), count);
  const m = new THREE.Matrix4();
  for (let k = 0; k < count; k++) {
    const s = (k / count) * course.length;
    const p = course.pointAt(s);
    const t = course.tangentAt(s);
    const off = (((k * 53) % 11) / 11 - 0.5) * width * 0.9;
    m.makeTranslation(p.x - t.z * off, 0.03, p.z + t.x * off);
    pebbles.setMatrixAt(k, m);
  }
  root.add(pebbles);
  return root;
}
