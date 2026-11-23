import * as THREE from 'three';

const CONFETTI_COLORS = [0xff6b8b, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xb388ff, 0xff9f43];

/** One-shot confetti burst around a point. */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private readonly vel: THREE.Vector3[] = [];
  private readonly pos: THREE.Vector3[] = [];
  private readonly spin: number[] = [];
  private t = 0;
  private readonly tmp = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly one = new THREE.Vector3(1, 1, 1);

  constructor(center: THREE.Vector3, count = 120) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 0.12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 4 + Math.random() * 3;
      const out = 1 + Math.random() * 2;
      this.vel.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
      this.pos.push(center.clone().add(new THREE.Vector3(0, 0.5, 0)));
      this.spin.push(Math.random() * 10);
      this.mesh.setColorAt(i, c.setHex(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
    }
    this.mesh.frustumCulled = false;
  }

  /** Returns false when finished. */
  update(dt: number): boolean {
    this.t += dt;
    for (let i = 0; i < this.pos.length; i++) {
      const v = this.vel[i];
      v.y -= 6 * dt;
      v.multiplyScalar(1 - 1.2 * dt);
      this.pos[i].addScaledVector(v, dt);
      if (this.pos[i].y < 0.02) this.pos[i].y = 0.02;
      this.q.setFromEuler(this.e.set(this.t * this.spin[i], this.t * 3, 0));
      this.tmp.compose(this.pos[i], this.q, this.one);
      this.mesh.setMatrixAt(i, this.tmp);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return this.t < 4;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Pulsing golden sparkle used as the "here is a nut" hint. */
export class HintSparkle {
  readonly root = new THREE.Group();
  private t = 0;
  private readonly star: THREE.Mesh;
  private readonly ring: THREE.Mesh;

  constructor() {
    this.star = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffd84d }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xffe680, transparent: true, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.03;
    this.root.add(this.star, this.ring);
    this.root.visible = false;
  }

  update(dt: number): void {
    this.t += dt;
    this.star.position.y = 0.75 + Math.sin(this.t * 4) * 0.08;
    this.star.rotation.y = this.t * 3;
    this.star.scale.setScalar(1 + Math.sin(this.t * 6) * 0.2);
    const p = (this.t * 0.8) % 1;
    this.ring.scale.setScalar(0.6 + p);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 1 - p;
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const m of [this.star, this.ring]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  }
}
