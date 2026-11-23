import * as THREE from 'three';

const DISTANCE = 4.5;
const HEIGHT = 3;
const LOOK_HEIGHT = 0.4;
const FOLLOW_RATE = 5;

/**
 * Smooth third-person camera with a fixed heading (always looks towards -Z).
 * A fixed heading keeps "joystick up" meaning the same direction for young kids.
 */
export class FollowCamera {
  readonly yaw = 0;
  private readonly focus = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private initialised = false;

  constructor(private readonly cam: THREE.PerspectiveCamera) {}

  update(target: THREE.Vector3, dt: number): void {
    if (!this.initialised) return this.snap(target);
    this.focus.lerp(target, 1 - Math.exp(-FOLLOW_RATE * dt));
    this.place();
  }

  snap(target: THREE.Vector3): void {
    this.focus.copy(target);
    this.initialised = true;
    this.place();
  }

  private place(): void {
    const f = this.focus;
    this.cam.position.set(f.x, f.y * 0.6 + HEIGHT, f.z + DISTANCE);
    this.look.set(f.x, f.y * 0.6 + LOOK_HEIGHT, f.z);
    this.cam.lookAt(this.look);
  }
}
