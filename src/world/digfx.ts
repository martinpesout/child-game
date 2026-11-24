import * as THREE from 'three';

/** Digging effects: clods of earth thrown backwards between the paws, bouncing and settling, plus soft dust puffs. */

const CLODS = 36;
const DUST = 10;
const GRAVITY = 9;
const CLOD_LIFE = 2.2;
const DUST_LIFE = 0.9;

interface Clod {
  m: THREE.Mesh;
  v: THREE.Vector3;
  spin: THREE.Vector3;
  t: number;
  ground: number;
  alive: boolean;
}

interface Dust {
  s: THREE.Sprite;
  v: THREE.Vector3;
  t: number;
  size: number;
  alive: boolean;
}

/** Soft round dust texture (radial falloff), made in code so it also works without a canvas. */
function dustTexture(): THREE.DataTexture {
  const n = 32;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const a = Math.max(0, 1 - d) ** 1.6;
      const i = (y * n + x) * 4;
      data[i] = 196;
      data[i + 1] = 160;
      data[i + 2] = 118;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const t = new THREE.DataTexture(data, n, n);
  t.needsUpdate = true;
  return t;
}

export class DirtFx {
  readonly root = new THREE.Group();
  private readonly clods: Clod[] = [];
  private readonly dust: Dust[] = [];
  private readonly geo = new THREE.DodecahedronGeometry(0.045);
  private readonly mats = [0x7a4a26, 0x8b5a35, 0x5e3a1d].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  private readonly tex = dustTexture();
  private next = 0;
  private nextDust = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < CLODS; i++) {
      const m = new THREE.Mesh(this.geo, this.mats[i % 3]);
      m.visible = false;
      m.castShadow = true;
      this.root.add(m);
      this.clods.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0, ground: 0, alive: false });
    }
    for (let i = 0; i < DUST; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false;
      this.root.add(s);
      this.dust.push({ s, v: new THREE.Vector3(), t: 0, size: 0.3, alive: false });
    }
    scene.add(this.root);
  }

  get clodsAlive(): number {
    return this.clods.filter((c) => c.alive).length;
  }

  get dustAlive(): number {
    return this.dust.filter((d) => d.alive).length;
  }

  /** Mean position of the flying clods (tests). */
  meanClod(): THREE.Vector3 {
    const alive = this.clods.filter((c) => c.alive);
    const p = new THREE.Vector3();
    alive.forEach((c) => p.add(c.m.position));
    return alive.length ? p.divideScalar(alive.length) : p;
  }

  minClodY(): number {
    return Math.min(...this.clods.filter((c) => c.alive).map((c) => c.m.position.y - c.ground), 0);
  }

  /**
   * One paw scrape at `at`: clods fly along `back` (unit vector, the way behind the digger) and up;
   * `ground` = height where they land. `strength` scales the throw (1 = normal).
   */
  burst(at: THREE.Vector3, back: THREE.Vector3, ground: number, strength = 1): void {
    const side = new THREE.Vector3(-back.z, 0, back.x);
    if (side.lengthSq() < 1e-6) side.set(0, 0, 1); // throwing straight up/down (underground): spread sideways in z
    for (let i = 0; i < 10; i++) {
      const c = this.clods[this.next];
      this.next = (this.next + 1) % CLODS;
      c.alive = true;
      c.t = 0;
      c.ground = ground;
      c.m.visible = true;
      c.m.position.copy(at).addScaledVector(side, (Math.random() - 0.5) * 0.2);
      c.m.position.y = Math.max(at.y, ground) + 0.05;
      c.m.scale.setScalar(0.6 + Math.random() * 0.9);
      const speed = (1.4 + Math.random() * 1.4) * strength;
      c.v.copy(back).multiplyScalar(speed).addScaledVector(side, (Math.random() - 0.5) * 1.2);
      c.v.y = (1.6 + Math.random() * 1.6) * strength;
      c.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    }
    for (let i = 0; i < 3; i++) {
      const d = this.dust[this.nextDust];
      this.nextDust = (this.nextDust + 1) % DUST;
      d.alive = true;
      d.t = 0;
      d.size = 0.25 + Math.random() * 0.2;
      d.s.visible = true;
      d.s.position.copy(at).addScaledVector(back, 0.1 + i * 0.12).addScaledVector(side, (Math.random() - 0.5) * 0.25);
      d.s.position.y = Math.max(at.y, ground) + 0.12;
      d.v.copy(back).multiplyScalar(0.25).addScaledVector(side, (Math.random() - 0.5) * 0.3);
      d.v.y = 0.35 + Math.random() * 0.25;
    }
  }

  update(dt: number): void {
    for (const c of this.clods) {
      if (!c.alive) continue;
      c.t += dt;
      const p = c.m.position;
      if (p.y > c.ground + 0.001 || c.v.y > 0) {
        c.v.y -= GRAVITY * dt;
        p.addScaledVector(c.v, dt);
        c.m.rotation.x += c.spin.x * dt;
        c.m.rotation.y += c.spin.y * dt;
        if (p.y <= c.ground) {
          // bounce a little, then rest
          p.y = c.ground;
          c.v.y = Math.abs(c.v.y) > 1 ? -c.v.y * 0.3 : 0;
          c.v.x *= 0.4;
          c.v.z *= 0.4;
          c.spin.multiplyScalar(0.3);
        }
      }
      // shrink away at the end of its life
      const left = CLOD_LIFE - c.t;
      if (left < 0.4) c.m.scale.multiplyScalar(Math.max(0, left / 0.4) ** 0.2 * 0.97);
      if (c.t >= CLOD_LIFE) {
        c.alive = false;
        c.m.visible = false;
      }
    }
    for (const d of this.dust) {
      if (!d.alive) continue;
      d.t += dt;
      const k = d.t / DUST_LIFE;
      d.s.position.addScaledVector(d.v, dt);
      d.s.scale.setScalar(d.size * (1 + k * 2.2));
      (d.s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - k);
      if (d.t >= DUST_LIFE) {
        d.alive = false;
        d.s.visible = false;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.geo.dispose();
    this.mats.forEach((m) => m.dispose());
    this.dust.forEach((d) => d.s.material.dispose());
    this.tex.dispose();
  }
}
