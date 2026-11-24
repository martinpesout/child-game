import * as THREE from 'three';
import { PartKit } from './parts';

/** Pink earthworm in an underground pocket: wiggles, sometimes hides and peeks out again. */
export class Worm {
  readonly root = new THREE.Group();
  private readonly kit = new PartKit();
  private readonly segs: THREE.Mesh[] = [];
  private t = Math.random() * 3;
  private hideT = 4;

  constructor() {
    const k = this.kit;
    for (let i = 0; i < 6; i++) {
      const m = k.ball(0.05 - i * 0.003, i === 0 ? 0xf08aa6 : 0xf29bb0, [i * -0.07, 0.05, 0]);
      this.segs.push(m);
      this.root.add(m);
    }
    for (const s of [-1, 1]) {
      const e = k.eye(0.012);
      e.position.set(0.02, 0.075, s * 0.025);
      e.rotation.y = Math.PI / 2;
      this.segs[0].add(e);
    }
    this.root.scale.setScalar(1.6);
  }

  update(dt: number): void {
    this.t += dt;
    this.hideT -= dt;
    // every few seconds it pulls into the soil for a moment
    const hiding = this.hideT < 0 && this.hideT > -1.2;
    if (this.hideT < -1.2) this.hideT = 4 + Math.random() * 3;
    this.segs.forEach((m, i) => {
      m.position.y = 0.05 + Math.sin(this.t * 5 - i * 0.9) * 0.03 - (hiding ? 0.12 : 0);
      m.position.z = Math.sin(this.t * 3 - i * 0.7) * 0.02;
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}

/** Sleepy cockchafer: snores with a "Zzz", twitches its feelers; wakes up, stretches and waves. */
export class Beetle {
  readonly root = new THREE.Group();
  awake = false;
  private readonly kit = new PartKit();
  private readonly body = new THREE.Group();
  private readonly feelers: THREE.Group[] = [];
  private readonly zzz: THREE.Group;
  private t = 0;
  private wakeT = -1;
  private startleT = -1;

  constructor() {
    const k = this.kit;
    this.root.add(this.body);
    this.body.add(k.ball(0.13, 0x8a4f2a, [0, 0.1, 0], [1, 0.7, 1.25]));
    // wing cases with a seam
    this.body.add(k.ball(0.125, 0xa8643a, [0, 0.13, -0.02], [1.02, 0.6, 1.15]));
    const head = new THREE.Group();
    head.position.set(0, 0.11, 0.15);
    this.body.add(head);
    head.add(k.ball(0.07, 0x2e2018, [0, 0, 0]));
    for (const s of [-1, 1]) {
      const e = k.eye(0.02);
      e.position.set(s * 0.035, 0.025, 0.05);
      head.add(e);
      const f = new THREE.Group();
      f.position.set(s * 0.03, 0.05, 0.03);
      const stalk = new THREE.Mesh(k.geom(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 5)), k.mat(0x2e2018));
      stalk.position.y = 0.05;
      f.add(stalk);
      f.add(k.ball(0.018, 0x2e2018, [0, 0.1, 0]));
      f.rotation.z = -s * 0.4;
      head.add(f);
      this.feelers.push(f);
    }
    for (const s of [-1, 1]) for (const z of [-0.07, 0, 0.07]) this.body.add(k.ball(0.018, 0x2e2018, [s * 0.12, 0.02, z], [1.4, 0.6, 0.6]));
    // floating "Zzz"
    this.zzz = new THREE.Group();
    this.zzz.name = 'zzz';
    const zMat = k.mat(0xffffff);
    for (let i = 0; i < 3; i++) {
      const z = new THREE.Mesh(k.geom(new THREE.TorusGeometry(0.025 + i * 0.008, 0.007, 4, 4)), zMat);
      z.position.set(0.06 + i * 0.05, 0.28 + i * 0.07, 0);
      this.zzz.add(z);
    }
    this.root.add(this.zzz);
    this.root.scale.setScalar(1.5);
  }

  wake(): void {
    if (this.awake) return;
    this.awake = true;
    this.wakeT = 0;
  }

  /** A little jump of fright (e.g. when the dino skull clacks). */
  startle(): void {
    this.startleT = 0;
  }

  update(dt: number): void {
    this.t += dt;
    this.zzz.visible = !this.awake;
    if (!this.awake) {
      // slow snoring breath, drifting Zzz
      const b = 1 + Math.sin(this.t * 1.8) * 0.06;
      this.body.scale.set(b, b, 1);
      this.zzz.children.forEach((z, i) => (z.position.y = 0.28 + i * 0.07 + ((this.t * 0.1 + i * 0.05) % 0.1)));
    } else this.body.scale.set(1, 1, 1);
    this.feelers.forEach((f, i) => (f.rotation.x = Math.sin(this.t * (this.awake ? 6 : 1.5) + i) * (this.awake ? 0.35 : 0.12)));
    this.body.position.y = 0;
    this.body.rotation.z = 0;
    if (this.wakeT >= 0) {
      this.wakeT += dt;
      const p = this.wakeT / 1.2;
      this.body.position.y = Math.sin(p * Math.PI) * 0.06; // stretch
      this.body.rotation.z = Math.sin(this.wakeT * 10) * 0.12 * (1 - p);
      if (p >= 1) this.wakeT = -1;
    }
    if (this.startleT >= 0) {
      this.startleT += dt;
      const p = this.startleT / 0.5;
      this.body.position.y = Math.sin(p * Math.PI) * 0.12;
      if (p >= 1) this.startleT = -1;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
