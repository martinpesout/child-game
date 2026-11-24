import * as THREE from 'three';

const RADIUS = 0.3;

/** Soft dark disc straight under the hamster – shows where a jump will land. */
export class BlobShadow {
  readonly mesh: THREE.Mesh;

  constructor() {
    const g = new THREE.CircleGeometry(RADIUS, 24);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.name = 'blobShadow';
    this.mesh.renderOrder = 1;
  }

  /** `groundY` = surface right under the body, `bodyY` = the body's feet. */
  place(x: number, z: number, groundY: number, bodyY: number): void {
    const h = Math.max(0, bodyY - groundY);
    this.mesh.position.set(x, groundY + 0.01, z);
    this.mesh.scale.setScalar(1 / (1 + 0.6 * h));
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.25, 0.35 - 0.1 * h);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
