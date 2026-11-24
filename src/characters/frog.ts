import * as THREE from 'three';
import { PartKit } from './parts';
import { angleLerp } from './hamster';

const GREEN = 0x6cc04a;
const DARK = 0x4a9a35;
const BELLY = 0xe9f5c8;
const PINK = 0xf4a6b0;

/** Cheerful frog. Faces +Z at rotation 0; origin at its feet. Position and heading are set by the level. */
export class Frog {
  readonly root = new THREE.Group();
  /** Bouncing body (laugh / breathe / hop pose). */
  readonly body = new THREE.Group();
  /** Back legs (stretched while hopping). */
  readonly legs = new THREE.Group();
  private readonly kit = new PartKit();
  private readonly sac: THREE.Mesh;
  private readonly arm = new THREE.Group();
  private t = 0;
  private yaw = 0;
  private laughT = -1;
  private waveT = -1;
  private cheerT = -1;
  private hopT = -1;

  constructor() {
    const k = this.kit;
    this.root.add(this.body);
    this.root.scale.setScalar(1.25);
    // squat body
    this.body.add(k.ball(0.2, GREEN, [0, 0.17, 0], [1.15, 0.8, 1.05]));
    this.body.add(k.ball(0.15, BELLY, [0, 0.14, 0.09], [1.05, 0.75, 0.8]));
    // head merged with the body, eyes on top
    const head = new THREE.Group();
    head.position.set(0, 0.3, 0.07);
    this.body.add(head);
    head.add(k.ball(0.16, GREEN, [0, 0, 0], [1.2, 0.75, 1]));
    const eyes = new THREE.Group();
    eyes.name = 'eyes';
    for (const s of [-1, 1]) {
      const bump = k.ball(0.075, GREEN, [s * 0.09, 0.09, 0.03]);
      eyes.add(bump);
      const e = k.eye(0.045);
      e.position.set(s * 0.09, 0.105, 0.075);
      eyes.add(e);
      const cheek = k.ball(0.04, GREEN, [s * 0.12, -0.03, 0.1]);
      head.add(cheek);
      k.spot(cheek, 0.04, 0.45, PINK, [s * 0.4, 0, 0.9]);
    }
    head.add(eyes);
    // smile
    const smile = new THREE.Mesh(k.geom(new THREE.TorusGeometry(0.07, 0.008, 6, 16, Math.PI)), k.mat(0x2d5a20));
    smile.position.set(0, -0.03, 0.15);
    smile.rotation.z = Math.PI;
    head.add(smile);
    // croaking sac under the chin
    this.sac = k.ball(0.06, BELLY, [0, -0.08, 0.12], [1.1, 0.8, 0.9]);
    this.sac.name = 'sac';
    head.add(this.sac);
    // front arms (one waves)
    this.body.add(k.ball(0.035, GREEN, [-0.12, 0.04, 0.13], [0.8, 1.4, 0.8]));
    this.arm.position.set(0.12, 0.1, 0.13);
    this.arm.add(k.ball(0.035, GREEN, [0, -0.05, 0], [0.8, 1.4, 0.8]));
    this.body.add(this.arm);
    // big back legs
    this.legs.position.set(0, 0.08, -0.08);
    for (const s of [-1, 1]) {
      this.legs.add(k.ball(0.09, DARK, [s * 0.16, 0.02, 0], [0.8, 0.6, 1.3]));
      this.legs.add(k.ball(0.05, DARK, [s * 0.2, -0.05, 0.12], [1.2, 0.4, 1.5]));
    }
    this.body.add(this.legs);
  }

  wave(): void {
    this.waveT = 0;
  }

  laugh(): void {
    this.laughT = 0;
  }

  cheer(): void {
    this.cheerT = 0;
  }

  /** Happy hopping on the spot (finish). */
  hop(): void {
    this.hopT = 0;
  }

  /** `hopK` = 0..1 phase of a hop between stones (0 = sitting). */
  update(dt: number, look: THREE.Vector3 | null, hopK: number, heading?: number): void {
    this.t += dt;
    let want = this.yaw;
    if (hopK > 0 && heading !== undefined) want = heading;
    else if (look) want = Math.atan2(look.x - this.root.position.x, look.z - this.root.position.z);
    this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 8));
    this.root.rotation.y = this.yaw;

    // breathing sac and a sitting pose
    const breathe = 1 + Math.max(0, Math.sin(this.t * 3)) * 0.35;
    this.sac.scale.set(1.1 * breathe, 0.8 * breathe, 0.9 * breathe);
    this.body.position.y = 0;
    this.body.rotation.set(0, 0, 0);
    this.legs.rotation.x = 0;
    if (hopK > 0) {
      // stretch the legs out behind during the hop
      this.legs.rotation.x = Math.sin(hopK * Math.PI) * 0.9;
      this.body.rotation.x = -Math.sin(hopK * Math.PI) * 0.3;
    }
    this.arm.rotation.z = 0;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const p = this.waveT / 1.4;
      this.arm.rotation.z = Math.sin(p * Math.PI) * (1.6 + Math.sin(this.waveT * 14) * 0.35);
      if (p >= 1) this.waveT = -1;
    }
    if (this.laughT >= 0) {
      this.laughT += dt;
      const p = this.laughT / 1.6;
      this.body.position.y = Math.abs(Math.sin(this.laughT * 18)) * 0.04 * (1 - p);
      this.body.rotation.z = Math.sin(this.laughT * 11) * 0.15 * (1 - p);
      this.sac.scale.multiplyScalar(1.3);
      if (p >= 1) this.laughT = -1;
    }
    if (this.cheerT >= 0) {
      this.cheerT += dt;
      const p = this.cheerT / 1.0;
      this.body.position.y = Math.sin(p * Math.PI) * 0.25;
      this.legs.rotation.x = Math.sin(p * Math.PI) * 0.8;
      if (p >= 1) this.cheerT = -1;
    }
    if (this.hopT >= 0) {
      this.hopT += dt;
      const p = this.hopT / 3;
      this.body.position.y = Math.abs(Math.sin(p * Math.PI * 5)) * 0.3;
      this.legs.rotation.x = Math.abs(Math.sin(p * Math.PI * 5)) * 0.8;
      this.body.rotation.y = p * Math.PI * 2;
      if (p >= 1) {
        this.hopT = -1;
        this.body.rotation.y = 0;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
