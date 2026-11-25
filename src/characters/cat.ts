import * as THREE from 'three';
import { PartKit } from './parts';
import type { CatState } from '../levels/catWatch';

const ORANGE = 0xf0a04b;
const STRIPE = 0xc9742a;
const CREAM = 0xfbe3c4;
const PINK = 0xf4a6b0;

/** Big sleepy ginger cat curled up in the yard. Faces +Z; `setState` drives the eyelids, ears and the "Zzz". */
export class Cat {
  readonly root = new THREE.Group();
  /** 0 closed … 1 open (for tests). */
  eyeOpen = 0;
  private readonly kit = new PartKit();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly ear = new THREE.Group();
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
    // curled body with stripes
    this.body.add(k.ball(0.3, ORANGE, [0, 0.2, 0], [1.25, 0.7, 1]));
    this.body.add(k.ball(0.2, CREAM, [0.05, 0.16, 0.18], [1.2, 0.6, 0.6]));
    for (let i = 0; i < 4; i++) this.body.add(k.ball(0.06, STRIPE, [-0.25 + i * 0.15, 0.36, -0.05], [0.6, 0.25, 1.6]));
    // paws tucked in front
    for (const s of [-1, 1]) this.body.add(k.ball(0.07, CREAM, [0.12 + s * 0.09, 0.05, 0.27], [1, 0.6, 1.3]));
    // head resting on the paws
    this.head.position.set(0.22, 0.25, 0.22);
    this.body.add(this.head);
    this.head.add(k.ball(0.17, ORANGE, [0, 0, 0], [1.1, 0.95, 1]));
    this.head.add(k.ball(0.08, CREAM, [0, -0.05, 0.12], [1.3, 0.8, 0.8]));
    this.head.add(k.ball(0.025, PINK, [0, -0.01, 0.18]));
    for (const s of [-1, 1]) {
      const ear = s === 1 ? this.ear : new THREE.Group();
      ear.position.set(s * 0.1, 0.13, 0);
      const cone = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.06, 0.12, 4)), k.mat(ORANGE));
      cone.position.y = 0.05;
      ear.add(cone);
      this.head.add(ear);
      // eye + eyelid (a half sphere that slides up)
      const eye = k.eye(0.035);
      eye.position.set(s * 0.07, 0.03, 0.14);
      this.head.add(eye);
      const lid = new THREE.Mesh(k.geom(new THREE.SphereGeometry(0.042, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), k.mat(ORANGE));
      lid.position.copy(eye.position);
      lid.rotation.x = Math.PI / 2 + 0.2;
      this.head.add(lid);
      this.lids.push(lid);
      // whiskers
      for (const dy of [-0.01, 0.015]) {
        const w = new THREE.Mesh(k.geom(new THREE.CylinderGeometry(0.003, 0.003, 0.16, 4)), k.mat(0xffffff));
        w.rotation.z = Math.PI / 2 + s * 0.15;
        w.position.set(s * 0.12, -0.05 + dy, 0.12);
        this.head.add(w);
      }
    }
    // long tail wrapped around
    this.tail.position.set(-0.32, 0.12, 0.05);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.35;
      this.tail.add(k.ball(0.06 - i * 0.003, i % 2 ? STRIPE : ORANGE, [Math.sin(a) * 0.25 - 0.05, 0, Math.cos(a) * 0.25 - 0.1]));
    }
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

  /** "Meow!" – the head pops up. */
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
    // eyelids slide up as the eye opens
    this.lids.forEach((l) => (l.rotation.x = Math.PI / 2 + 0.2 - this.eyeOpen * 1.6));
    // breathing belly, snoring Zzz
    const breathe = sleeping ? 1 + Math.sin(this.t * 1.6) * 0.05 : 1;
    this.body.scale.set(breathe, breathe, 1);
    if (sleeping) this.zzz.children.forEach((z, i) => (z.position.y = 0.5 + i * 0.1 + ((this.t * 0.08 + i * 0.04) % 0.1)));
    // warning: ear twitches, tail swishes
    this.ear.rotation.z = this.state === 'warn' ? Math.sin(this.t * 30) * 0.3 : 0;
    this.tail.rotation.y = Math.sin(this.t * (this.state === 'sleep' ? 0.8 : 3)) * (this.state === 'sleep' ? 0.08 : 0.25);
    // looking: the head lifts and turns a little
    const lift = this.state === 'look' ? 0.08 : this.state === 'warn' ? 0.04 * this.k : 0;
    this.head.position.y = 0.25 + lift;
    this.head.rotation.y = this.state === 'look' ? Math.sin(this.t * 1.2) * 0.4 : 0;
    if (this.scareT >= 0) {
      this.scareT += dt;
      const p = this.scareT / 0.6;
      this.head.position.y += Math.sin(p * Math.PI) * 0.12;
      if (p >= 1) this.scareT = -1;
    }
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
