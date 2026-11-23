import * as THREE from 'three';
import { PartKit } from './parts';
import { angleLerp } from './hamster';

const BODY = 0x8a5a3c;
const SPIKE = 0x5b3a26;
const FACE = 0xf3d9b8;
const PINK = 0xf4a6b0;

/** Friendly hedgehog NPC. Faces +Z at rotation 0; origin at its feet. */
export class Hedgehog {
  readonly root = new THREE.Group();
  private readonly kit = new PartKit();
  private readonly bob = new THREE.Group();
  private readonly paw: THREE.Group;
  private t = 0;
  private waveT = -1;
  private hopT = -1;
  private yaw = 0;

  constructor() {
    const k = this.kit;
    this.root.add(this.bob);
    this.root.scale.setScalar(1.3);

    // round body
    this.bob.add(k.ball(0.26, BODY, [0, 0.24, -0.03], [1, 0.85, 1.1]));
    // spikes: instanced cones over the back hemisphere
    const spikeGeo = k.geom(new THREE.ConeGeometry(0.035, 0.14, 6));
    const spikes = new THREE.InstancedMesh(spikeGeo, k.mat(SPIKE), 70);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const n = new THREE.Vector3();
    let i = 0;
    for (let row = 0; row < 7; row++) {
      const phi = 0.25 + row * 0.24; // from top towards the back
      const count = 10;
      for (let c = 0; c < count && i < 70; c++) {
        const theta = Math.PI * 0.15 + (c / (count - 1)) * Math.PI * 0.7 + (row % 2) * 0.08;
        // direction on the upper/back part of the body ellipsoid
        n.set(Math.cos(theta) * Math.sin(phi), Math.cos(phi), -Math.sin(theta) * Math.sin(phi)).normalize();
        if (n.z > 0.35) continue;
        q.setFromUnitVectors(up, n);
        const p = new THREE.Vector3(n.x * 0.26, 0.24 + n.y * 0.22, -0.03 + n.z * 0.29);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        spikes.setMatrixAt(i++, m);
      }
    }
    spikes.count = i;
    spikes.castShadow = true;
    this.bob.add(spikes);

    // face: light snout pointing forward
    const head = new THREE.Group();
    head.position.set(0, 0.24, 0.18);
    this.bob.add(head);
    head.add(k.ball(0.16, FACE, [0, 0, 0], [1, 0.9, 1]));
    const snout = new THREE.Mesh(k.geom(new THREE.ConeGeometry(0.075, 0.16, 16)), k.mat(FACE));
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.03, 0.17);
    head.add(snout);
    head.add(k.ball(0.03, 0x1a1210, [0, -0.03, 0.255], [1, 0.9, 1], 0.2));
    for (const s of [-1, 1]) {
      const e = k.eye(0.026);
      e.position.set(s * 0.065, 0.04, 0.125);
      head.add(e);
      const blush = k.ball(0.07, FACE, [s * 0.09, -0.04, 0.06]);
      head.add(blush);
      k.spot(blush, 0.07, 0.38, PINK, [s * 0.5, 0, 0.85]);
      head.add(k.ball(0.035, PINK, [s * 0.11, 0.12, 0.0], [1, 1, 0.5]));
    }
    // feet + waving paw
    for (const s of [-1, 1]) this.bob.add(k.ball(0.045, FACE, [s * 0.13, 0.03, 0.12], [1, 0.6, 1.3]));
    this.paw = new THREE.Group();
    this.paw.position.set(0.2, 0.2, 0.12);
    this.paw.add(k.ball(0.045, FACE, [0, -0.06, 0], [0.8, 1.4, 0.8]));
    this.bob.add(this.paw);
  }

  wave(): void {
    this.waveT = 0;
  }

  hop(): void {
    this.hopT = 0;
  }

  update(dt: number, lookTarget: THREE.Vector3 | null): void {
    this.t += dt;
    const breathe = 1 + Math.sin(this.t * 2.6) * 0.025;
    this.bob.scale.set(breathe, 1 / breathe, breathe);
    this.bob.position.y = 0;

    if (lookTarget) {
      const want = Math.atan2(lookTarget.x - this.root.position.x, lookTarget.z - this.root.position.z);
      this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 4));
    }
    this.root.rotation.y = this.yaw;

    this.paw.rotation.z = 0;
    if (this.waveT >= 0) {
      this.waveT += dt;
      const p = this.waveT / 1.6;
      this.paw.rotation.z = Math.sin(p * Math.PI) * (1.6 + Math.sin(this.waveT * 14) * 0.35);
      if (p >= 1) this.waveT = -1;
    }
    if (this.hopT >= 0) {
      this.hopT += dt;
      const p = this.hopT / 1.2;
      this.bob.position.y = Math.abs(Math.sin(p * Math.PI * 3)) * 0.15 * (1 - p);
      if (p >= 1) this.hopT = -1;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.kit.dispose();
  }
}
