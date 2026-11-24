import * as THREE from 'three';

/** Gentle rolling terrain: a few slow sine waves, scaled by an optional "keep flat" mask (0 = flat, 1 = full hills). */
export class Terrain {
  private readonly p: number[];

  constructor(private readonly opts: { seed: number; amplitude: number; flat?: (x: number, z: number) => number }) {
    let s = opts.seed * 9301 + 49297;
    const rnd = () => ((s = (s * 233280 + 49297) % 233280) / 233280) * Math.PI * 2;
    this.p = [rnd(), rnd(), rnd(), rnd()];
  }

  static flat(): Terrain {
    return new Terrain({ seed: 0, amplitude: 0 });
  }

  get amplitude(): number {
    return this.opts.amplitude;
  }

  height(x: number, z: number): number {
    const a = this.opts.amplitude;
    if (!a) return 0;
    const [p0, p1, p2, p3] = this.p;
    const raw = Math.sin(x * 0.21 + p0) * Math.cos(z * 0.17 + p1) * 0.6 + Math.sin((x + z) * 0.11 + p2) * Math.cos((x - z) * 0.07 + p3) * 0.4;
    const k = this.opts.flat ? Math.max(0, Math.min(1, this.opts.flat(x, z))) : 1;
    return a * raw * k;
  }

  /** Steepest slope (rise over run) sampled across the play area. */
  maxSlope(halfSize: number, step = 0.25): number {
    let max = 0;
    for (let x = -halfSize; x <= halfSize; x += step) {
      for (let z = -halfSize; z <= halfSize; z += step) {
        const h = this.height(x, z);
        max = Math.max(max, Math.abs(this.height(x + step, z) - h) / step, Math.abs(this.height(x, z + step) - h) / step);
      }
    }
    return max;
  }

  /** Ground mesh following the terrain inside the play area, flat beyond it. */
  mesh(size: number, segments: number, material: THREE.Material): THREE.Mesh {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    if (this.opts.amplitude) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, this.height(pos.getX(i), pos.getZ(i)));
      g.computeVertexNormals();
    }
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    return m;
  }
}
