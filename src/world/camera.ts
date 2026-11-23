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
  private readonly look = new THREE.Vector3();

  constructor(private readonly cam: THREE.PerspectiveCamera) {}

  update(target: THREE.Vector3, dt: number): void {
    const k = 1 - Math.exp(-FOLLOW_RATE * dt);
    this.cam.position.x += (target.x - this.cam.position.x) * k;
    this.cam.position.z += (target.z + DISTANCE - this.cam.position.z) * k;
    this.cam.position.y += (target.y * 0.6 + HEIGHT - this.cam.position.y) * k;
    this.look.set(this.cam.position.x, target.y * 0.6 + LOOK_HEIGHT, this.cam.position.z - DISTANCE);
    this.cam.lookAt(this.look);
  }

  snap(target: THREE.Vector3): void {
    this.cam.position.set(target.x, target.y * 0.6 + HEIGHT, target.z + DISTANCE);
    this.look.set(target.x, target.y * 0.6 + LOOK_HEIGHT, target.z);
    this.cam.lookAt(this.look);
  }
}
