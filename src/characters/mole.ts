import * as THREE from 'three';
import { PartKit } from './parts';
import { angleLerp } from './hamster';

const FUR = 0x55505a;
const LIGHT = 0x77717c;
const PINK = 0xf2a0b4;
const PAW = 0xf6c6c9;

/** Friendly mole. Faces +Z; origin at ground level – the body can sink into its molehill (`peek`). */
export class Mole {
  readonly root = new THREE.Group();
  /** Moves up/down when peeking and dances. */
  readonly body = new THREE.Group();
  private readonly kit = new PartKit();
  private readonly paw = new THREE.Group();
  private readonly hill: THREE.Mesh;
  private t = 0;
  private yaw = 0;
  private up = true;
  private waveT = -1;
  private danceT = -1;

  constructor() {
    const k = this.kit;
    this.root.scale.setScalar(1.25);
    this.root.add(this.body);
    // little earth mound around it, always at ground level
    this.hill = k.ball(0.3, 0x7a5032, [0, 0, 0], [1, 0.35, 1]);
    this.root.add(this.hill);
    this.body.add(k.ball(0.2, FUR, [0, 0.2, 0], [1, 1.1, 0.95]));
    this.body.add(k.ball(0.13, LIGHT, [0, 0.17, 0.1], [1, 1.1, 0.7]));
    const head = new THREE.Group();
    head.position.set(0, 0.38, 0.06);
    this.body.add(head);
    head.add(k.ball(0.15, FUR, [0, 0, 0], [1, 0.95, 1]));
    // long pink snout
    head.add(k.ball(0.05, PINK, [0, -0.03, 0.17], [1, 0.85, 1.3]));
    head.add(k.ball(0.022, 0xd06d86, [0, -0.02, 0.23]));
    for (const s of [-1, 1]) {
      const e = k.eye(0.02);
      e.position.set(s * 0.06, 0.03, 0.12);
      head.add(e);
      const cheek = k.ball(0.035, FUR, [s * 0.09, -0.05, 0.09]);
      head.add(cheek);
      k.spot(cheek, 0.035, 0.45, PINK, [s * 0.4, 0, 0.9]);
    }
    // big shovel paws
    this.body.add(k.ball(0.06, PAW, [-0.16, 0.18, 0.12], [1.3, 0.6, 1]));
    this.paw.position.set(0.16, 0.18, 0.12);
    this.paw.add(k.ball(0.06, PAW, [0, 0, 0], [1.3, 0.6, 1]));
    this.body.add(this.paw);
  }

  wave(): void {
    this.waveT = 0;
    this.up = true;
  }

  /** Pop up out of the molehill (true) or hide in it (false). */
  peek(up: boolean): void {
    this.up = up;
  }

  dance(): void {
    this.danceT = 0;
    this.up = true;
  }

  update(dt: number, look: THREE.Vector3 | null): void {
    this.t += dt;
    if (look) {
      const want = Math.atan2(look.x - this.root.position.x, look.z - this.root.position.z);
      this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 6));
      this.root.rotation.y = this.yaw;
    }
    const target = this.up ? 0 : -0.45;
    this.body.position.y += (target - this.body.position.y) * Math.min(1, dt * 8);
    if (Math.abs(this.body.position.y - target) < 0.005) this.body.position.y = target;
    // sniffing
    this.body.rotation.x = Math.sin(this.t * 7) * 0.03;
    this.body.rotation.y = 0;
    this.paw.rotation.z = 0;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const p = this.waveT / 1.4;
      this.paw.rotation.z = Math.sin(p * Math.PI) * (1.5 + Math.sin(this.waveT * 14) * 0.35);
      if (p >= 1) this.waveT = -1;
    }
    if (this.danceT >= 0) {
      this.danceT += dt;
      const p = this.danceT / 3;
      this.body.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.12;
      this.body.rotation.y = Math.sin(p * Math.PI * 4) * 0.8;
      this.paw.rotation.z = 1.2 + Math.sin(this.danceT * 12) * 0.4;
      if (p >= 1) this.danceT = -1;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
