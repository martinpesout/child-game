import * as THREE from 'three';

/** Collects geometries/materials so a character can dispose everything it created. */
export class PartKit {
  private geoms: THREE.BufferGeometry[] = [];
  private mats = new Map<number, THREE.MeshStandardMaterial>();

  mat(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
    const key = color * 10 + Math.round(roughness * 9);
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
      this.mats.set(key, m);
    }
    return m;
  }

  /** Soft sphere mesh; `scale` squashes it into an ellipsoid. */
  ball(r: number, color: number, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], roughness = 0.9): THREE.Mesh {
    const g = new THREE.SphereGeometry(r, 24, 16);
    this.geoms.push(g);
    const m = new THREE.Mesh(g, this.mat(color, roughness));
    m.position.set(...pos);
    m.scale.set(...scale);
    m.castShadow = true;
    return m;
  }

  geom<T extends THREE.BufferGeometry>(g: T): T {
    this.geoms.push(g);
    return g;
  }

  /**
   * Paints a round spot onto a sphere of radius `r` (centred at the parent's origin): a thin spherical cap
   * that hugs the surface, so it reads as a painted mark rather than a bump.
   * `angle` is the spot's angular radius, `dir` points from the centre to the spot.
   */
  spot(parent: THREE.Object3D, r: number, angle: number, color: number, dir: [number, number, number], unlit = false): THREE.Mesh {
    const g = this.geom(new THREE.SphereGeometry(r * 1.008, 20, 6, 0, Math.PI * 2, 0, angle));
    const m = unlit ? this.basic(color) : this.mat(color, 0.8);
    const mesh = new THREE.Mesh(g, m);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
    parent.add(mesh);
    return mesh;
  }

  private basics = new Map<number, THREE.MeshBasicMaterial>();
  basic(color: number): THREE.MeshBasicMaterial {
    let m = this.basics.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color });
      this.basics.set(color, m);
    }
    return m;
  }

  /** Glossy black bead eye with a painted-on white highlight. */
  eye(r: number): THREE.Group {
    const g = new THREE.Group();
    const ball = this.ball(r, 0x1a1210, [0, 0, 0], [1, 1, 1], 0.15);
    g.add(ball);
    this.spot(ball, r, 0.42, 0xffffff, [0.4, 0.5, 0.77], true);
    this.spot(ball, r, 0.18, 0xffffff, [-0.3, -0.25, 0.92], true);
    return g;
  }

  dispose(): void {
    this.geoms.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.basics.forEach((m) => m.dispose());
    this.basics.clear();
    this.geoms = [];
    this.mats.clear();
  }
}
