import * as THREE from 'three';

/** Gnarly roots: tapered, bending strands with little rootlets – for the root pens, the big tree and the underground. */

/** Small deterministic random generator so the same seed gives the same roots. */
function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/** Tube along `pts` whose radius follows `radius(t)` (t = 0 at the first point). */
function taperedTube(pts: THREE.Vector3[], radius: (t: number) => number, segs: number, radial = 7): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts);
  const base = 1;
  const g = new THREE.TubeGeometry(curve, segs, base, radial, false);
  const pos = g.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r / base).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * One root strand through `pts` with a radius profile, plus a few thin rootlets branching off.
 * Returns a group (first child = the main strand).
 */
export function rootStrand(pts: THREE.Vector3[], radius: (t: number) => number, mat: THREE.Material, seed: number, rootlets = 3): THREE.Group {
  const g = new THREE.Group();
  const main = new THREE.Mesh(taperedTube(pts, radius, Math.max(8, pts.length * 6)), mat);
  main.castShadow = true;
  main.receiveShadow = true;
  g.add(main);
  const r = rng(seed);
  const curve = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < rootlets; i++) {
    const t = 0.25 + r() * 0.6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(r() < 0.5 ? -1 : 1);
    const len = 0.18 + r() * 0.25;
    const q = [
      p.clone(),
      p.clone().addScaledVector(side, len * 0.5).add(new THREE.Vector3(0, -len * 0.25, 0)),
      p.clone().addScaledVector(side, len).add(new THREE.Vector3((r() - 0.5) * 0.1, -len * 0.55, (r() - 0.5) * 0.1)),
    ];
    const r0 = radius(t) * 0.35;
    g.add(new THREE.Mesh(taperedTube(q, (u) => r0 * (1 - u * 0.85), 6, 5), mat));
  }
  return g;
}

/** Root arching out of the ground at `a`, up to `height`, and back into the ground at `b` (thick at both ends). */
export function makeRootArch(a: THREE.Vector3, b: THREE.Vector3, height: number, seed: number, mat: THREE.Material, thick = 0.13): THREE.Group {
  const r = rng(seed);
  const n = 6;
  const pts: THREE.Vector3[] = [];
  const side = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    // a lumpy arch: higher in the middle, a little wobble sideways and in height
    p.y = (i === 0 || i === n ? -0.08 : 0) + Math.sin(t * Math.PI) * height * (0.85 + r() * 0.3);
    p.addScaledVector(side, (r() - 0.5) * 0.16 * Math.sin(t * Math.PI));
    pts.push(p);
  }
  return rootStrand(pts, (t) => thick * (0.55 + 0.45 * Math.abs(Math.cos(t * Math.PI))), mat, seed + 7, 2);
}

const bark = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });

/** Big tree roots flaring out from the trunk base and diving into the ground. */
export function makeTreeRoots(trunkR: number, count: number): THREE.Group {
  const g = new THREE.Group();
  const mats = [bark(0x6e4426), bark(0x7a4e2d)];
  const r = rng(11);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + r() * 0.4;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const bend = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((r() - 0.5) * 0.6);
    const reach = 1.3 + r() * 0.9;
    const pts = [
      dir.clone().multiplyScalar(trunkR * 0.6).setY(0.7),
      dir.clone().multiplyScalar(trunkR + 0.3).add(bend.clone().multiplyScalar(0.3)).setY(0.32),
      dir.clone().multiplyScalar(trunkR + reach * 0.6).add(bend).setY(0.12),
      dir.clone().multiplyScalar(trunkR + reach).add(bend.clone().multiplyScalar(1.4)).setY(-0.1),
    ];
    g.add(rootStrand(pts, (t) => 0.32 * (1 - t) + 0.04, mats[i % 2], 20 + i, 2));
  }
  return g;
}

/**
 * Underground band of roots right under the grass, from x0 to x1 around y = top − depth/2, kept off the `free`
 * columns (entry shaft, exit). `userData.hanging` lists the dangling rootlets (they sway).
 */
export function makeRootBand(x0: number, x1: number, top: number, depth: number, free: number[], seed: number, frontZ = 0): THREE.Group {
  const g = new THREE.Group();
  const mats = [bark(0x5a3a20), bark(0x6b4429), bark(0x4a2e18)];
  const hanging: THREE.Object3D[] = [];
  const r = rng(seed);
  const gap = 0.38;
  // split [x0, x1] into runs that avoid the free columns
  const cuts = [...free].sort((a, b) => a - b);
  const runs: [number, number][] = [];
  let s = x0;
  for (const f of cuts) {
    if (f - gap > s) runs.push([s, f - gap]);
    s = Math.max(s, f + gap);
  }
  if (x1 > s) runs.push([s, x1]);
  for (const [a, b] of runs) {
    if (b - a < 0.25) continue;
    for (let layer = 0; layer < 3; layer++) {
      const pts: THREE.Vector3[] = [];
      const n = Math.max(3, Math.round((b - a) / 0.45));
      const yMid = top - depth * (0.32 + layer * 0.22);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(new THREE.Vector3(a + (b - a) * t, yMid + (r() - 0.5) * depth * 0.25, frontZ + (r() - 0.5) * 0.06));
      }
      const thick = 0.085 - layer * 0.015;
      g.add(rootStrand(pts, (t) => thick * (0.7 + 0.3 * Math.sin(t * Math.PI * 3 + layer)), mats[layer], seed * 10 + layer, 0));
    }
    // thin rootlets dangling below the band (they sway gently)
    for (let x = a + 0.15; x < b - 0.1; x += 0.35 + r() * 0.3) {
      const len = 0.16 + r() * 0.24;
      const holder = new THREE.Group();
      holder.position.set(x, top - depth + 0.03, frontZ + 0.01);
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3((r() - 0.5) * 0.06, -len * 0.5, 0), new THREE.Vector3((r() - 0.5) * 0.1, -len, 0)];
      holder.add(new THREE.Mesh(taperedTube(pts, (t) => 0.03 * (1 - t * 0.8), 6, 5), mats[1]));
      g.add(holder);
      hanging.push(holder);
    }
  }
  // a few thick roots from the tree side curling down into the soil
  for (let i = 0; i < 2; i++) {
    const sx = x0 + 0.3 + i * 0.7;
    const pts = [
      new THREE.Vector3(sx, top + 0.05, frontZ),
      new THREE.Vector3(sx + 0.35, top - depth * 0.6, frontZ + 0.02),
      new THREE.Vector3(sx + 0.55, top - depth * 1.3, frontZ),
      new THREE.Vector3(sx + 0.5 + r() * 0.3, top - depth * 1.9, frontZ),
    ];
    if (free.some((f) => Math.abs(f - (sx + 0.4)) < gap + 0.3)) continue;
    g.add(rootStrand(pts, (t) => 0.11 * (1 - t) + 0.02, mats[i % 3], seed * 31 + i, 2));
  }
  g.userData.hanging = hanging;
  return g;
}
