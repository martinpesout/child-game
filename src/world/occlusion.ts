import * as THREE from 'three';

const FADED = 0.3;
const RATE = 8;
/** Heights above the target's feet that are checked for visibility (feet, belly, head). */
const PROBES = [0.1, 0.3, 0.55];

interface Entry {
  root: THREE.Object3D;
  mats: THREE.Material[];
  opacity: number;
}

/** Fades props that hide the player from the camera, so kids never lose sight of the hamster. */
export class OcclusionFader {
  private readonly entries: Entry[];
  private readonly ray = new THREE.Raycaster();
  private readonly dir = new THREE.Vector3();
  private readonly p = new THREE.Vector3();
  private readonly hits = new Set<Entry>();

  constructor(roots: THREE.Object3D[]) {
    this.entries = roots.map((root) => {
      const mats = new Set<THREE.Material>();
      root.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((x) => mats.add(x));
        else if (m) mats.add(m);
      });
      return { root, mats: [...mats], opacity: 1 };
    });
  }

  update(camera: THREE.Vector3, target: THREE.Vector3, dt: number): void {
    this.hits.clear();
    for (const h of PROBES) {
      this.p.set(target.x, target.y + h, target.z);
      this.dir.subVectors(this.p, camera);
      const dist = this.dir.length();
      this.ray.set(camera, this.dir.normalize());
      this.ray.far = dist;
      for (const e of this.entries) {
        if (this.hits.has(e)) continue;
        if (this.ray.intersectObject(e.root, true).length > 0) this.hits.add(e);
      }
    }
    const k = 1 - Math.exp(-RATE * dt);
    for (const e of this.entries) {
      const want = this.hits.has(e) ? FADED : 1;
      if (e.opacity === want) continue;
      e.opacity += (want - e.opacity) * k;
      if (Math.abs(e.opacity - want) < 0.01) e.opacity = want;
      const faded = e.opacity < 0.999;
      for (const m of e.mats) {
        if (m.transparent !== faded) m.needsUpdate = true;
        m.transparent = faded;
        m.opacity = e.opacity;
        m.depthWrite = !faded;
      }
    }
  }
}
