import * as THREE from 'three';
import type { Collider } from '../physics/physics';
import type { LEVEL1 } from '../levels/level1Data';

type LevelData = typeof LEVEL1;

const GRASS_COUNT = 3500;
const FLOWER_COUNT = 260;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function insideCollider(x: number, z: number, c: Collider, pad: number): boolean {
  if (c.kind === 'cylinder') return Math.hypot(x - c.x, z - c.z) < c.radius + pad;
  return Math.abs(x - c.x) < c.halfX + pad && Math.abs(z - c.z) < c.halfZ + pad;
}

function tuftGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const base = new THREE.Color(0x4f9a3a);
  const tip = new THREE.Color(0xa8e070);
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const lean = 0.06;
    const w = 0.035;
    const h = 0.22 + (i % 2) * 0.06;
    const cx = Math.cos(a);
    const sz = Math.sin(a);
    // two base vertices perpendicular to lean direction, one tip vertex
    pos.push(-sz * w, 0, cx * w, sz * w, 0, -cx * w, cx * lean, h, sz * lean);
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function skyDome(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x7cc8f7) }, bottom: { value: new THREE.Color(0xe8f7ff) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = clamp(vP.y*1.6+0.1,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, t),1.0); }',
  });
  return new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), mat);
}

function mat(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts });
}

function shadowy<T extends THREE.Object3D>(o: T, cast = true): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = cast;
      c.receiveShadow = true;
    }
  });
  return o;
}

function makeBush(c: Collider, r: () => number): THREE.Group {
  const g = new THREE.Group();
  const radius = c.kind === 'cylinder' ? c.radius : Math.max(c.halfX, c.halfZ);
  const greens = [0x5fae45, 0x6cbf4f, 0x4f9a3a];
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const blobs: [number, number, number, number][] = [
    [0, c.height * 0.5, 0, radius * 0.95],
    [radius * 0.55, c.height * 0.38, radius * 0.2, radius * 0.6],
    [-radius * 0.5, c.height * 0.4, -radius * 0.25, radius * 0.65],
    [radius * 0.1, c.height * 0.75, -radius * 0.2, radius * 0.55],
  ];
  for (const [x, y, z, s] of blobs) {
    const m = new THREE.Mesh(sphere, mat(greens[Math.floor(r() * greens.length)]));
    m.position.set(x, y, z);
    m.scale.set(s, Math.min(s, c.height * 0.55), s);
    g.add(m);
  }
  // a few tiny berries for cuteness
  const berry = new THREE.SphereGeometry(0.05, 8, 6);
  const berryMat = mat(0xe8424f, { roughness: 0.4 });
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2;
    const b = new THREE.Mesh(berry, berryMat);
    b.position.set(Math.cos(a) * radius * 0.9, c.height * (0.35 + r() * 0.35), Math.sin(a) * radius * 0.9);
    g.add(b);
  }
  g.position.set(c.x, 0, c.z);
  return shadowy(g);
}

function makeRock(c: Collider, r: () => number): THREE.Mesh {
  const hx = c.kind === 'box' ? c.halfX : c.radius;
  const hz = c.kind === 'box' ? c.halfZ : c.radius;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), mat(0xb8b2a8, { flatShading: true }));
  m.scale.set(hx * 1.12, c.height, hz * 1.12);
  m.position.set(c.x, 0, c.z);
  m.rotation.y = r() * Math.PI;
  return shadowy(m);
}

function makeTree(c: Collider): THREE.Group {
  const g = new THREE.Group();
  const radius = c.kind === 'cylinder' ? c.radius : 0.7;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 3.2, 12), mat(0x8a5a3c));
  trunk.position.y = 1.6;
  g.add(trunk);
  const leaf = new THREE.SphereGeometry(1, 16, 12);
  const blobs: [number, number, number, number, number][] = [
    [0, 4.2, 0, 2.2, 0x5fae45],
    [1.4, 3.6, 0.6, 1.5, 0x6cbf4f],
    [-1.3, 3.7, -0.4, 1.6, 0x4f9a3a],
    [0.2, 5.3, -0.3, 1.4, 0x7ccc5a],
  ];
  for (const [x, y, z, s, col] of blobs) {
    const m = new THREE.Mesh(leaf, mat(col));
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    g.add(m);
  }
  g.position.set(c.x, 0, c.z);
  return shadowy(g);
}

function makeHouse(c: Collider): THREE.Group {
  const g = new THREE.Group();
  const radius = c.kind === 'cylinder' ? c.radius : 1.4;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, 1.3, 28), mat(0xe0b07a));
  wall.position.y = 0.65;
  g.add(wall);
  // nutshell-like dome roof
  const roof = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.18, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa0623a));
  roof.position.y = 1.25;
  roof.scale.y = 0.85;
  g.add(roof);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 12), mat(0x6e4126));
  tip.position.y = 1.25 + radius * 1.18 * 0.85 + 0.12;
  g.add(tip);
  // round door facing the meadow (-Z)
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), mat(0x5a3a22));
  door.position.set(0, 0.48, -radius - 0.01);
  door.rotation.y = Math.PI;
  g.add(door);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 8, 24), mat(0xf6e3c4));
  frame.position.copy(door.position);
  frame.position.z -= 0.01;
  g.add(frame);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0xffd166, { roughness: 0.3 }));
  knob.position.set(0.22, 0.45, -radius - 0.05);
  g.add(knob);
  // little round windows
  for (const a of [-0.9, 0.9]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), mat(0xbfe7ff, { roughness: 0.2, emissive: 0x334455 }));
    w.position.set(Math.sin(a) * (radius + 0.01), 0.8, -Math.cos(a) * (radius + 0.01));
    w.lookAt(w.position.x * 2, 0.8, w.position.z * 2);
    g.add(w);
  }
  g.position.set(c.x, 0, c.z);
  return shadowy(g);
}

function makeFence(halfSize: number): THREE.Group {
  const g = new THREE.Group();
  const edge = halfSize + 0.25;
  const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 1.0, 8);
  const postMat = mat(0xc28a55);
  const spacing = 1.6;
  const perSide = Math.ceil((edge * 2) / spacing);
  const posts = new THREE.InstancedMesh(postGeo, postMat, perSide * 4);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < perSide; k++) {
      const t = -edge + k * spacing;
      const [x, z] = s === 0 ? [t, -edge] : s === 1 ? [edge, t] : s === 2 ? [-t, edge] : [-edge, -t];
      m.makeTranslation(x, 0.5, z);
      posts.setMatrixAt(i++, m);
    }
  }
  g.add(posts);
  const railMat = mat(0xd9a46d);
  for (const y of [0.4, 0.8]) {
    for (let s = 0; s < 4; s++) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(edge * 2, 0.08, 0.05), railMat);
      rail.position.y = y;
      if (s === 0) rail.position.z = -edge;
      if (s === 1) { rail.position.x = edge; rail.rotation.y = Math.PI / 2; }
      if (s === 2) rail.position.z = edge;
      if (s === 3) { rail.position.x = -edge; rail.rotation.y = Math.PI / 2; }
      g.add(rail);
    }
  }
  // hedge outside the fence so the world feels closed and soft
  const hedgeGeo = new THREE.SphereGeometry(1, 12, 8);
  const hedgeMat = mat(0x4f9a3a);
  const hedgeCount = perSide * 4;
  const hedge = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgeCount);
  const r = rng(7);
  i = 0;
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < perSide; k++) {
      const t = -edge + k * spacing;
      const o = edge + 1.6;
      const [x, z] = s === 0 ? [t, -o] : s === 1 ? [o, t] : s === 2 ? [-t, o] : [-o, -t];
      const size = 1.2 + r() * 0.6;
      m.compose(p.set(x, size * 0.5, z), q, sc.set(size, size * 0.9, size));
      hedge.setMatrixAt(i++, m);
    }
  }
  g.add(hedge);
  return g;
}

function makeHills(): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 20, 12);
  const cols = [0x8fd06a, 0x7cc35a, 0x9ad877];
  const r = rng(3);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.3;
    const d = 45 + r() * 15;
    const m = new THREE.Mesh(geo, mat(cols[i % 3]));
    const s = 10 + r() * 10;
    m.scale.set(s * 1.6, s * 0.55, s);
    m.position.set(Math.cos(a) * d, -2, Math.sin(a) * d);
    g.add(m);
  }
  // fluffy clouds
  const cloudMat = mat(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 });
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const b = new THREE.Mesh(geo, cloudMat);
      b.scale.setScalar(1.6 + r() * 1.2);
      b.position.set(j * 1.8 - 2.7, r() * 0.8, r() * 0.8);
      c.add(b);
    }
    const a = r() * Math.PI * 2;
    c.position.set(Math.cos(a) * 40, 16 + r() * 8, Math.sin(a) * 40 - 10);
    g.add(c);
  }
  return g;
}

function scatter(
  data: LevelData,
  count: number,
  pad: number,
  seed: number,
  extraAvoid: { x: number; z: number; r: number }[],
): { x: number; z: number }[] {
  const r = rng(seed);
  const out: { x: number; z: number }[] = [];
  const lim = data.halfSize;
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const x = (r() * 2 - 1) * lim;
    const z = (r() * 2 - 1) * lim;
    if (data.colliders.some((c) => insideCollider(x, z, c, pad))) continue;
    if (extraAvoid.some((a) => Math.hypot(x - a.x, z - a.z) < a.r)) continue;
    out.push({ x, z });
  }
  return out;
}

export interface Meadow {
  readonly sun: THREE.DirectionalLight;
  update(focus: THREE.Vector3): void;
  dispose(): void;
}

/** Builds the meadow for a level: ground, grass, flowers, props, fence, sky and lights. */
export function buildMeadow(scene: THREE.Scene, data: LevelData): Meadow {
  const root = new THREE.Group();
  const r = rng(42);

  root.add(skyDome());
  scene.fog = new THREE.Fog(0xe8f7ff, 35, 85);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), mat(0x86c95e));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  // soft dirt patch in front of the house
  // the house door looks towards the spawn point
  const toSpawn = new THREE.Vector2(data.spawn.x - data.house.x, data.spawn.z - data.house.z).normalize();
  const houseYaw = Math.atan2(-toSpawn.x, -toSpawn.y);
  const patchPos = { x: data.house.x + toSpawn.x * 2.4, z: data.house.z + toSpawn.y * 2.4 };
  const patch = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), mat(0xd8b27e));
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(patchPos.x, 0.01, patchPos.z);
  patch.receiveShadow = true;
  root.add(patch);

  const avoid = [
    ...data.items.map((i) => ({ x: i.x, z: i.z, r: 0.5 })),
    { x: patchPos.x, z: patchPos.z, r: 1.6 },
  ];

  // grass tufts
  const tufts = scatter(data, GRASS_COUNT, 0.1, 11, avoid);
  const grass = new THREE.InstancedMesh(tuftGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), tufts.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  tufts.forEach((t, i) => {
    const k = 0.8 + r() * 0.9;
    m.compose(p.set(t.x, 0, t.z), q.setFromEuler(e.set(0, r() * Math.PI * 2, 0)), s.set(k, k, k));
    grass.setMatrixAt(i, m);
  });
  grass.receiveShadow = true;
  root.add(grass);

  // flowers
  const spots = scatter(data, FLOWER_COUNT, 0.2, 23, avoid);
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xffffff, { roughness: 0.6 }), spots.length);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4), mat(0x4f9a3a), spots.length);
  const flowerCols = [0xffffff, 0xffe066, 0xff9ecb, 0xc7a6ff, 0xffb366].map((c) => new THREE.Color(c));
  spots.forEach((f, i) => {
    m.compose(p.set(f.x, 0.17, f.z), q.identity(), s.set(1, 0.6, 1));
    petals.setMatrixAt(i, m);
    petals.setColorAt(i, flowerCols[Math.floor(r() * flowerCols.length)]);
    m.compose(p.set(f.x, 0.08, f.z), q.identity(), s.set(1, 1, 1));
    stems.setMatrixAt(i, m);
  });
  root.add(petals, stems);

  for (const prop of data.props) {
    if (prop.type === 'bush') root.add(makeBush(prop.collider, r));
    if (prop.type === 'rock') root.add(makeRock(prop.collider, r));
    if (prop.type === 'tree') root.add(makeTree(prop.collider));
    if (prop.type === 'house') root.add(makeHouse(prop.collider)).children.at(-1)!.rotation.y = houseYaw;
  }
  root.add(makeFence(data.halfSize));
  root.add(makeHills());

  const hemi = new THREE.HemisphereLight(0xffffff, 0x7fae5a, 1.15);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  root.add(sun, sun.target);

  scene.add(root);

  const sunOffset = new THREE.Vector3(6, 14, 8);
  return {
    sun,
    update(focus: THREE.Vector3) {
      sun.target.position.copy(focus);
      sun.position.copy(focus).add(sunOffset);
    },
    dispose() {
      root.removeFromParent();
      scene.fog = null;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mt = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
        else mt?.dispose();
      });
      sun.dispose();
    },
  };
}
