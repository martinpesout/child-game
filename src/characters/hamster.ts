import * as THREE from 'three';
import type { Body } from '../physics/physics';
import { HamsterAnim } from './hamsterAnim';
import { PartKit } from './parts';

const FUR = 0xd99a4e;
const CREAM = 0xfff1dc;
const PINK = 0xf4a6b0;
const BLUSH = 0xff8fa3;
/** Model is built at ~0.22 m body radius; scaled up a bit so kids see it well. */
const VISUAL_SCALE = 1.25;

export function angleLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Cute procedural hamster. Faces +Z at rotation 0; origin at its feet. */
export class Hamster {
  readonly root = new THREE.Group();
  readonly anim = new HamsterAnim();
  private readonly kit = new PartKit();
  private readonly bob = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly cheeks: THREE.Object3D[] = [];
  private readonly eyes: THREE.Object3D[] = [];
  private readonly paws: THREE.Mesh[] = [];
  private lookTarget: THREE.Vector3 | null = null;
  private yaw = 0;

  constructor() {
    const k = this.kit;
    this.root.add(this.bob);
    this.root.scale.setScalar(VISUAL_SCALE);

    // body + belly + tail
    this.bob.add(k.ball(0.22, FUR, [0, 0.2, 0], [1, 0.88, 1.1]));
    this.bob.add(k.ball(0.17, CREAM, [0, 0.16, 0.09], [1, 0.9, 0.9]));
    this.bob.add(k.ball(0.035, CREAM, [0, 0.17, -0.24]));

    // head
    this.head.position.set(0, 0.34, 0.15);
    this.bob.add(this.head);
    this.head.add(k.ball(0.18, FUR, [0, 0.03, 0], [1.05, 0.95, 0.95]));
    // cream face patch + muzzle
    this.head.add(k.ball(0.12, CREAM, [0, -0.02, 0.08], [1.1, 0.85, 0.9]));
    this.head.add(k.ball(0.065, CREAM, [0, -0.02, 0.15]));
    this.head.add(k.ball(0.022, PINK, [0, 0.01, 0.213], [1.2, 0.9, 1], 0.5));
    // cheeks (puffable)
    for (const s of [-1, 1]) {
      const cheek = new THREE.Group();
      cheek.position.set(s * 0.115, -0.04, 0.07);
      const cheekBall = k.ball(0.085, CREAM, [0, 0, 0], [1, 0.9, 1]);
      cheek.add(cheekBall);
      k.spot(cheekBall, 0.085, 0.38, BLUSH, [s * 0.55, 0.05, 0.83]);
      this.head.add(cheek);
      this.cheeks.push(cheek);
    }
    // eyes
    for (const s of [-1, 1]) {
      const e = k.eye(0.036);
      e.position.set(s * 0.078, 0.055, 0.148);
      this.head.add(e);
      this.eyes.push(e);
    }
    // ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.115, 0.17, 0.0);
      ear.rotation.z = -s * 0.35;
      ear.add(k.ball(0.055, FUR, [0, 0, 0], [1, 1, 0.45]));
      ear.add(k.ball(0.036, PINK, [0, 0, 0.018], [1, 1, 0.4], 0.6));
      this.head.add(ear);
    }
    // paws: front L/R, back L/R
    const pawPos: [number, number, number][] = [
      [-0.1, 0.03, 0.13],
      [0.1, 0.03, 0.13],
      [-0.12, 0.03, -0.1],
      [0.12, 0.03, -0.1],
    ];
    for (const p of pawPos) {
      const paw = k.ball(0.04, PINK, p, [1, 0.6, 1.3], 0.7);
      this.paws.push(paw);
      this.bob.add(paw);
    }
  }

  /** Instantly face a heading (rotation.y). */
  face(yaw: number): void {
    this.yaw = yaw;
    this.root.rotation.y = yaw;
  }

  lookAt(target: THREE.Vector3 | null): void {
    this.lookTarget = target;
  }

  sync(body: Body, dt: number): void {
    const speed = Math.hypot(body.vel.x, body.vel.z);
    this.anim.update(dt, speed, body.grounded);
    this.root.position.set(body.pos.x, body.pos.y, body.pos.z);
    if (speed > 0.2) this.yaw = angleLerp(this.yaw, Math.atan2(body.vel.x, body.vel.z), Math.min(1, dt * 12));
    const a = this.anim;

    // breathing
    const breathe = 1 + Math.sin(a.time * 3) * 0.02;
    this.bob.scale.set(breathe, 1 / breathe, breathe);
    this.bob.position.y = 0;
    this.bob.rotation.set(0, 0, 0);

    const gait = a.gaitPhase;
    const pawSwing = a.mood === 'run' ? 0.05 : 0;
    this.paws.forEach((p, i) => {
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      p.position.y = 0.03 + Math.max(0, Math.sin(gait + phase)) * pawSwing * 0.8;
      p.position.z = (i < 2 ? 0.13 : -0.1) + Math.cos(gait + phase) * pawSwing;
    });

    if (a.mood === 'run') {
      this.bob.position.y = Math.abs(Math.sin(gait)) * 0.035;
      this.bob.rotation.z = Math.sin(gait) * 0.07;
      this.bob.rotation.x = 0.08;
    } else if (a.mood === 'air') {
      this.bob.scale.set(0.93, 1.12, 0.93);
    } else if (a.mood === 'celebrate') {
      const p = a.celebrateProgress;
      this.bob.position.y = Math.sin(Math.min(1, p * 1.6) * Math.PI) * 0.35;
      this.bob.rotation.y = Math.min(1, p * 1.6) * Math.PI * 2;
    }

    const puff = 1 + 0.5 * a.cheekPuff;
    this.cheeks.forEach((c) => c.scale.setScalar(puff));
    this.eyes.forEach((e) => (e.scale.y = Math.max(0.1, 1 - a.blink)));

    // head turns toward a nearby friend, otherwise gentle idle tilt
    let headYaw = 0;
    if (this.lookTarget) {
      const want = Math.atan2(this.lookTarget.x - body.pos.x, this.lookTarget.z - body.pos.z);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      headYaw = Math.max(-0.7, Math.min(0.7, d));
    }
    this.head.rotation.y = angleLerp(this.head.rotation.y, headYaw, Math.min(1, dt * 6));
    this.head.rotation.z = a.mood === 'idle' ? Math.sin(a.time * 0.9) * 0.08 : 0;

    this.root.rotation.y = this.yaw;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
