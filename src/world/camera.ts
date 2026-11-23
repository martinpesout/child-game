import * as THREE from 'three';

const DISTANCE = 4.5;
const HEIGHT = 3;
const LOOK_HEIGHT = 0.4;
const FOLLOW_RATE = 5;
/** Close-up: in front of the hamster's face, slightly to the side and above. */
const CLOSE_DIST = 1.35;
const CLOSE_SIDE = 0.35;
const CLOSE_HEIGHT = 0.75;
const CLOSE_LOOK = 0.45;
const BLEND_RATE = 2.5;
/** How fast the chase camera swings round behind the hamster. */
const CHASE_TURN_RATE = 3;

/**
 * Smooth third-person camera with a fixed heading (always looks towards -Z).
 * A fixed heading keeps "joystick up" meaning the same direction for young kids.
 */
export class FollowCamera {
  private chase = false;
  private heading = 0;
  private chaseYaw = 0;
  private readonly focus = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private initialised = false;
  private mode: 'follow' | 'closeup' = 'follow';
  private faceYaw = 0;
  /** 0 = follow framing, 1 = close-up framing. */
  private blend = 0;
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly la = new THREE.Vector3();
  private readonly lb = new THREE.Vector3();

  constructor(private readonly cam: THREE.PerspectiveCamera) {}

  /** Camera yaw used to map the joystick: fixed 0, or behind the hamster in chase mode. */
  get yaw(): number {
    return this.chase ? this.chaseYaw : 0;
  }

  /** Chase mode: the camera stays behind the hamster and turns with it. */
  setChase(on: boolean): void {
    this.chase = on;
    this.chaseYaw = this.heading + Math.PI;
  }

  /** Hamster heading (rotation.y) the chase camera should sit behind. */
  setHeading(h: number): void {
    this.heading = h;
  }

  /** Frame the hamster's face; `faceYaw` is the hamster's heading (rotation.y). */
  closeup(faceYaw: number): void {
    this.mode = 'closeup';
    this.faceYaw = faceYaw;
  }

  follow(): void {
    this.mode = 'follow';
  }

  get isBlending(): boolean {
    return this.blend > 0.01 && this.blend < 0.99;
  }

  update(target: THREE.Vector3, dt: number): void {
    if (!this.initialised) return this.snap(target);
    this.focus.lerp(target, 1 - Math.exp(-FOLLOW_RATE * dt));
    if (this.chase) {
      let d = this.heading + Math.PI - this.chaseYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.chaseYaw += d * (1 - Math.exp(-CHASE_TURN_RATE * dt));
      this.chaseYaw = Math.atan2(Math.sin(this.chaseYaw), Math.cos(this.chaseYaw));
    }
    const want = this.mode === 'closeup' ? 1 : 0;
    this.blend += (want - this.blend) * (1 - Math.exp(-BLEND_RATE * dt));
    if (Math.abs(this.blend - want) < 0.001) this.blend = want;
    this.place();
  }

  /** Jump straight to the current mode's framing. */
  cut(target: THREE.Vector3): void {
    this.focus.copy(target);
    this.chaseYaw = Math.atan2(Math.sin(this.heading + Math.PI), Math.cos(this.heading + Math.PI));
    this.initialised = true;
    this.blend = this.mode === 'closeup' ? 1 : 0;
    this.place();
  }

  snap(target: THREE.Vector3): void {
    this.focus.copy(target);
    this.chaseYaw = Math.atan2(Math.sin(this.heading + Math.PI), Math.cos(this.heading + Math.PI));
    this.initialised = true;
    this.place();
  }

  private place(): void {
    const f = this.focus;
    const yaw = this.yaw;
    // behind the camera's forward (-sin, -cos) means +(sin, cos)
    this.a.set(f.x + Math.sin(yaw) * DISTANCE, f.y * 0.6 + HEIGHT, f.z + Math.cos(yaw) * DISTANCE);
    this.la.set(f.x, f.y * 0.6 + LOOK_HEIGHT, f.z);
    if (this.blend > 0) {
      const sy = Math.sin(this.faceYaw);
      const cy = Math.cos(this.faceYaw);
      // forward of the face = (sin, cos); side = (cos, -sin)
      this.b.set(f.x + sy * CLOSE_DIST + cy * CLOSE_SIDE, f.y + CLOSE_HEIGHT, f.z + cy * CLOSE_DIST - sy * CLOSE_SIDE);
      this.lb.set(f.x, f.y + CLOSE_LOOK, f.z);
      const t = this.blend * this.blend * (3 - 2 * this.blend);
      this.a.lerp(this.b, t);
      this.la.lerp(this.lb, t);
    }
    this.cam.position.copy(this.a);
    this.look.copy(this.la);
    this.cam.lookAt(this.look);
  }
}
