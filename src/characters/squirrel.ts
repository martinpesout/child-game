import * as THREE from 'three';
import { PartKit } from './parts';
import { angleLerp } from './hamster';

const FUR = 0xc8743a;
const BELLY = 0xfbe3c4;
const DARK = 0x9c5426;
const PINK = 0xf4a6b0;

/** Friendly racing squirrel. Faces +Z at rotation 0; origin at its feet. */
export class Squirrel {
  readonly root = new THREE.Group();
  private readonly kit = new PartKit();
  private readonly bob = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly paw = new THREE.Group();
  private t = 0;
  private gait = 0;
  private waveT = -1;
  private cheerT = -1;
  private yaw = 0;

  constructor() {
    const k = this.kit;
    this.root.add(this.bob);
    this.root.scale.setScalar(1.2);

    this.bob.add(k.ball(0.17, FUR, [0, 0.24, 0], [0.95, 1.15, 1]));
    this.bob.add(k.ball(0.12, BELLY, [0, 0.22, 0.08], [0.9, 1.1, 0.8]));
    // head
    const head = new THREE.Group();
    head.position.set(0, 0.48, 0.06);
    this.bob.add(head);
    head.add(k.ball(0.14, FUR, [0, 0, 0]));
    head.add(k.ball(0.075, BELLY, [0, -0.03, 0.1], [1.1, 0.85, 0.9]));
    head.add(k.ball(0.022, 0x3a2418, [0, -0.0, 0.17], [1.2, 0.9, 1], 0.3));
    for (const s of [-1, 1]) {
      const e = k.eye(0.03);
      e.position.set(s * 0.065, 0.03, 0.115);
      head.add(e);
      const cheek = k.ball(0.05, BELLY, [s * 0.08, -0.04, 0.07]);
      head.add(cheek);
      k.spot(cheek, 0.05, 0.4, PINK, [s * 0.5, 0, 0.85]);
      // ears with tufts
      const ear = new THREE.Group();
      ear.position.set(s * 0.08, 0.13, -0.01);
      ear.rotation.z = -s * 0.25;
      ear.add(k.ball(0.04, FUR, [0, 0, 0], [0.7, 1.3, 0.5]));
      const tuft = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.025, 0.08, 6)), k.mat(DARK));
      tuft.position.y = 0.07;
      ear.add(tuft);
      head.add(ear);
    }
    // paws + feet
    for (const s of [-1, 1]) this.bob.add(k.ball(0.04, FUR, [s * 0.08, 0.03, 0.06], [0.9, 0.6, 1.4]));
    this.paw.position.set(0.12, 0.32, 0.08);
    this.paw.add(k.ball(0.035, FUR, [0, -0.04, 0], [0.8, 1.4, 0.8]));
    this.bob.add(this.paw);
    this.bob.add(k.ball(0.035, FUR, [-0.1, 0.3, 0.09], [0.8, 1.2, 0.8]));
    // big bushy tail: a curl of fluffy balls
    this.tail.name = 'tail';
    this.tail.position.set(0, 0.18, -0.15);
    const curl: [number, number, number, number][] = [
      [0, 0.02, -0.05, 0.1],
      [0, 0.15, -0.14, 0.13],
      [0, 0.32, -0.16, 0.15],
      [0, 0.48, -0.1, 0.15],
      [0, 0.58, 0.0, 0.12],
    ];
    curl.forEach(([x, y, z, r], i) => this.tail.add(k.ball(r, i === curl.length - 1 ? BELLY : FUR, [x, y, z])));
    this.bob.add(this.tail);
  }

  wave(): void {
    this.waveT = 0;
  }

  cheer(): void {
    this.cheerT = 0;
  }

  /** `speed` in m/s along the track; `lookTarget` turns the squirrel towards the hamster when standing. */
  update(dt: number, speed: number, lookTarget: THREE.Vector3 | null, heading?: number): void {
    this.t += dt;
    const running = speed > 0.3;
    if (running) this.gait += dt * (6 + speed * 3);
    this.bob.position.y = running ? Math.abs(Math.sin(this.gait)) * 0.12 : 0;
    this.bob.rotation.x = running ? Math.sin(this.gait) * 0.12 : 0;
    this.tail.rotation.x = -0.2 + Math.sin(this.t * (running ? 9 : 2.2)) * (running ? 0.25 : 0.12);

    let want = this.yaw;
    if (running && heading !== undefined) want = heading;
    else if (lookTarget) want = Math.atan2(lookTarget.x - this.root.position.x, lookTarget.z - this.root.position.z);
    this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 8));
    this.root.rotation.y = this.yaw;

    this.paw.rotation.z = 0;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const p = this.waveT / 1.4;
      this.paw.rotation.z = Math.sin(p * Math.PI) * (1.6 + Math.sin(this.waveT * 14) * 0.35);
      if (p >= 1) this.waveT = -1;
    }
    if (this.cheerT >= 0) {
      this.cheerT += dt;
      const p = this.cheerT / 1.5;
      this.bob.position.y = Math.abs(Math.sin(p * Math.PI * 3)) * 0.3 * (1 - p);
      this.bob.rotation.y = p * Math.PI * 2;
      if (p >= 1) {
        this.cheerT = -1;
        this.bob.rotation.y = 0;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
