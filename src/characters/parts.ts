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

  /** Glossy black bead eye with a white highlight. */
  eye(r: number): THREE.Group {
    const g = new THREE.Group();
    g.add(this.ball(r, 0x1a1210, [0, 0, 0], [1, 1, 1], 0.15));
    g.add(this.ball(r * 0.35, 0xffffff, [r * 0.35, r * 0.4, r * 0.75], [1, 1, 1], 0.3));
    return g;
  }

  dispose(): void {
    this.geoms.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.geoms = [];
    this.mats.clear();
  }
}
