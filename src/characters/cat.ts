import * as THREE from 'three';
import { PartKit } from './parts';
import type { CatState } from '../levels/catWatch';

const ORANGE = 0xf2a24c;
const LIGHT = 0xf7c27e;
const STRIPE = 0xc46a22;
const CREAM = 0xfdeacf;
const PINK = 0xf4a6b0;
const GREEN = 0x7ccf4a;

/**
 * Big fluffy ginger tabby curled up in the yard. Faces +Z. `setState` drives eyelids, ears, head and the "Zzz";
 * `scare()` (meow!) makes the fur bristle and the tail puff up.
 */
export class Cat {
  readonly root = new THREE.Group();
  /** 0 closed … 1 open (for tests). */
  eyeOpen = 0;
  private readonly kit = new PartKit();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly ear = new THREE.Group();
  private readonly bristle = new THREE.Group();
  private readonly lids: THREE.Mesh[] = [];
  private readonly zzz: THREE.Group;
  private state: CatState = 'sleep';
  private k = 0;
  private t = 0;
  private scareT = -1;
  private laughT = -1;

  constructor() {
    const k = this.kit;
    this.root.add(this.body);
    this.root.scale.setScalar(1.7);

    // curled body: one smooth round loaf
    this.body.add(k.ball(0.3, ORANGE, [0, 0.2, 0], [1.25, 0.72, 1]));
    // light belly and a fluffy chest ruff peeking out
    this.body.add(k.ball(0.2, CREAM, [0.08, 0.15, 0.2], [1.25, 0.6, 0.6]));
    for (let i = 0; i < 4; i++) this.body.add(k.ball(0.06, CREAM, [0.1 + (i - 1.5) * 0.06, 0.24 - (i % 2) * 0.03, 0.26], [1, 0.8, 0.6]));
    // bold tabby stripes over the back
    for (let i = 0; i < 6; i++) {
      const s = k.ball(0.055, STRIPE, [-0.32 + i * 0.12, 0.37 - Math.abs(i - 2.5) * 0.015, -0.02], [0.55, 0.22, 2.1]);
      s.rotation.y = 0.15 - i * 0.05;
      this.body.add(s);
    }
    // bristled fur along the spine (flat while calm, stands up on a fright)
    this.bristle.name = 'bristle';
    this.bristle.position.set(0, 0.4, -0.02);
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.035, 0.12, 5)), k.mat(i % 2 ? STRIPE : ORANGE));
      spike.position.set(-0.32 + i * 0.08, 0.04, (i % 3 - 1) * 0.04);
      this.bristle.add(spike);
    }
    this.bristle.scale.set(1, 0.05, 1);
    this.body.add(this.bristle);

    // front paws tucked in, with pink pads
    const pads = new THREE.Group();
    pads.name = 'pads';
    for (const s of [-1, 1]) {
      this.body.add(k.ball(0.075, CREAM, [0.13 + s * 0.1, 0.05, 0.27], [1, 0.6, 1.35]));
      pads.add(k.ball(0.022, PINK, [0.13 + s * 0.1, 0.035, 0.37], [1.3, 0.6, 0.6]));
      for (const dx of [-0.03, 0, 0.03]) pads.add(k.ball(0.011, PINK, [0.13 + s * 0.1 + dx, 0.06, 0.365], [1, 1, 0.6]));
    }
    this.body.add(pads);

    // head resting on the paws
    this.head.position.set(0.22, 0.25, 0.22);
    this.body.add(this.head);
    this.head.add(k.ball(0.18, ORANGE, [0, 0, 0], [1.12, 0.95, 1]));
    // fluffy cheeks
    for (const s of [-1, 1]) this.head.add(k.ball(0.08, LIGHT, [s * 0.12, -0.06, 0.06], [1.1, 0.85, 0.9]));
    // tabby "M" on the forehead
    for (const [x, rz] of [[-0.05, 0.4], [0, 0], [0.05, -0.4]] as [number, number][]) {
      const m = k.ball(0.018, STRIPE, [x, 0.12, 0.13], [0.6, 2.2, 0.5]);
      m.rotation.z = rz;
      this.head.add(m);
    }
    this.head.add(k.ball(0.085, CREAM, [0, -0.06, 0.12], [1.3, 0.8, 0.8]));
    this.head.add(k.ball(0.026, PINK, [0, -0.015, 0.19], [1.2, 0.8, 0.9]));
    for (const s of [-1, 1]) {
      const ear = s === 1 ? this.ear : new THREE.Group();
      ear.position.set(s * 0.1, 0.13, 0);
      ear.rotation.z = -s * 0.15;
      const cone = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.065, 0.13, 4)), k.mat(ORANGE));
      cone.position.y = 0.05;
      ear.add(cone);
      const inner = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.035, 0.08, 4)), k.mat(PINK));
      inner.position.set(0, 0.04, 0.02);
      ear.add(inner);
      this.head.add(ear);
      // big green eye with a slit pupil + eyelid (half sphere that slides up)
      const eye = new THREE.Group();
      eye.position.set(s * 0.075, 0.03, 0.14);
      const iris = k.ball(0.045, GREEN, [0, 0, 0], [1, 1, 0.7], 0.2);
      if (s === 1) iris.name = 'iris';
      eye.add(iris);
      const slit = k.ball(0.012, 0x111111, [0, 0, 0.03], [0.6, 2.4, 0.5], 0.2);
      eye.add(slit);
      const shine = k.ball(0.009, 0xffffff, [0.012, 0.015, 0.033], [1, 1, 0.5], 0.1);
      eye.add(shine);
      this.head.add(eye);
      const lid = new THREE.Mesh(k.geom(new THREE.SphereGeometry(0.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), k.mat(ORANGE));
      lid.position.copy(eye.position);
      lid.rotation.x = Math.PI / 2 + 0.2;
      this.head.add(lid);
      this.lids.push(lid);
      // three whiskers per side
      for (const [dy, rz] of [[-0.005, 0.12], [0.02, 0], [-0.03, 0.25]] as [number, number][]) {
        const w = new THREE.Mesh(k.geom(new THREE.CylinderGeometry(0.003, 0.002, 0.2, 4)), k.mat(0xffffff));
        w.rotation.z = Math.PI / 2 + s * rz;
        w.position.set(s * 0.15, -0.05 + dy, 0.13);
        this.head.add(w);
      }
    }

    // long fluffy striped tail wrapped around the body
    this.tail.name = 'tail';
    this.tail.position.set(-0.32, 0.12, 0.05);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.3;
      this.tail.add(k.ball(0.075 - i * 0.003, i % 2 ? STRIPE : ORANGE, [Math.sin(a) * 0.27 - 0.05, 0, Math.cos(a) * 0.27 - 0.12]));
    }
    this.tail.add(k.ball(0.06, CREAM, [Math.sin(2.7) * 0.27 - 0.05, 0, Math.cos(2.7) * 0.27 - 0.12]));
    this.body.add(this.tail);

    // "Zzz"
    this.zzz = new THREE.Group();
    this.zzz.name = 'zzz';
    const zMat = k.mat(0xffffff);
    for (let i = 0; i < 3; i++) {
      const z = new THREE.Mesh(k.geom(new THREE.TorusGeometry(0.035 + i * 0.012, 0.009, 4, 4)), zMat);
      z.position.set(0.3 + i * 0.07, 0.5 + i * 0.1, 0.2);
      this.zzz.add(z);
    }
    this.root.add(this.zzz);
  }

  setState(s: CatState, progress: number): void {
    this.state = s;
    this.k = progress;
  }

  /** "Meow!" – the head pops up, the fur bristles and the tail puffs up. */
  scare(): void {
    this.scareT = 0;
  }

  /** Little chuckle / yawn before falling asleep again. */
  laugh(): void {
    this.laughT = 0;
  }

  update(dt: number): void {
    this.t += dt;
    const sleeping = this.state === 'sleep';
    this.zzz.visible = sleeping;
    this.eyeOpen = this.state === 'look' ? 1 : this.state === 'warn' ? Math.max(0, (this.k - 0.3) / 0.7) : 0;
    // the lid rolls up and back over the top of the eye when open
    this.lids.forEach((l) => (l.rotation.x = Math.PI / 2 + 0.2 - this.eyeOpen * 2.5));
    const breathe = sleeping ? 1 + Math.sin(this.t * 1.6) * 0.05 : 1;
    this.body.scale.set(breathe, breathe, 1);
    if (sleeping) this.zzz.children.forEach((z, i) => (z.position.y = 0.5 + i * 0.1 + ((this.t * 0.08 + i * 0.04) % 0.1)));
    this.ear.rotation.z = -0.15 + (this.state === 'warn' ? Math.sin(this.t * 30) * 0.3 : 0);
    this.tail.rotation.y = Math.sin(this.t * (sleeping ? 0.8 : 3)) * (sleeping ? 0.08 : 0.25);
    const lift = this.state === 'look' ? 0.08 : this.state === 'warn' ? 0.04 * this.k : 0;
    this.head.position.y = 0.25 + lift;
    this.head.rotation.y = this.state === 'look' ? Math.sin(this.t * 1.2) * 0.4 : 0;

    // fright: bristles up, tail puffs, head pops (eases back over ~1.5 s)
    let fright = 0;
    if (this.scareT >= 0) {
      this.scareT += dt;
      const p = this.scareT / 1.5;
      fright = p < 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88);
      this.head.position.y += Math.sin(Math.min(1, this.scareT / 0.6) * Math.PI) * 0.12;
      if (p >= 1) this.scareT = -1;
    }
    this.bristle.scale.y = 0.05 + fright * 1.0;
    this.tail.scale.setScalar(1 + fright * 0.45);

    if (this.laughT >= 0) {
      this.laughT += dt;
      const p = this.laughT / 1.2;
      this.head.rotation.z = Math.sin(this.laughT * 14) * 0.1 * (1 - p);
      if (p >= 1) {
        this.laughT = -1;
        this.head.rotation.z = 0;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
