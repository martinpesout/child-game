import * as THREE from 'three';
import { PartKit } from '../characters/parts';

const WING_COLORS = [0xffb3d1, 0xffe066, 0xa8d8ff, 0xc7a6ff, 0xffffff, 0xffb366];

interface Flyer {
  obj: THREE.Group;
  wings: THREE.Object3D[];
  home: THREE.Vector2;
  phase: number;
  speed: number;
  kind: 'butterfly' | 'bee';
  target: THREE.Vector3;
  wait: number;
}

/** Decorative butterflies and bees – no gameplay effect. */
export class Critters {
  private readonly kit = new PartKit();
  private readonly root = new THREE.Group();
  private readonly flyers: Flyer[] = [];
  private readonly tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly halfSize: number, butterflies = 6, bees = 4) {
    const limit = halfSize - 3;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < butterflies; i++) {
      const obj = new THREE.Group();
      const col = WING_COLORS[i % WING_COLORS.length];
      const wingGeo = this.kit.geom(new THREE.CircleGeometry(0.09, 16));
      const wingMat = new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.7 });
      const wings: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        const hinge = new THREE.Group();
        const w1 = new THREE.Mesh(wingGeo, wingMat);
        w1.position.set(s * 0.08, 0, 0.02);
        w1.scale.set(1, 1.2, 1);
        const w2 = new THREE.Mesh(wingGeo, wingMat);
        w2.position.set(s * 0.06, 0, -0.07);
        w2.scale.set(0.7, 0.8, 1);
        hinge.add(w1, w2);
        hinge.rotation.x = -Math.PI / 2;
        obj.add(hinge);
        wings.push(hinge);
      }
      obj.add(this.kit.ball(0.018, 0x3a2a20, [0, 0, 0], [1, 1, 4.5]));
      obj.userData.mat = wingMat;
      this.flyers.push({ obj, wings, home: new THREE.Vector2(rnd(-limit, limit), rnd(-limit, limit)), phase: rnd(0, 10), speed: rnd(0.25, 0.45), kind: 'butterfly', target: new THREE.Vector3(), wait: 0 });
    }
    for (let i = 0; i < bees; i++) {
      const obj = new THREE.Group();
      obj.add(this.kit.ball(0.05, 0xffc93c, [0, 0, 0], [1, 1, 1.4], 0.6));
      for (const z of [-0.02, 0.025]) {
        const ring = new THREE.Mesh(this.kit.geom(new THREE.TorusGeometry(0.047, 0.012, 6, 16)), this.kit.mat(0x2b2118));
        ring.position.z = z;
        ring.scale.set(1, 1, 1);
        obj.add(ring);
      }
      const eyeL = this.kit.ball(0.012, 0x111111, [-0.02, 0.015, 0.065]);
      const eyeR = this.kit.ball(0.012, 0x111111, [0.02, 0.015, 0.065]);
      obj.add(eyeL, eyeR);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const wings: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        const hinge = new THREE.Group();
        hinge.position.set(0, 0.04, 0);
        const w = new THREE.Mesh(this.kit.geom(new THREE.CircleGeometry(0.045, 12)), wingMat);
        w.position.x = s * 0.045;
        w.scale.set(1, 0.6, 1);
        hinge.add(w);
        hinge.rotation.x = -Math.PI / 2;
        obj.add(hinge);
        wings.push(hinge);
      }
      obj.userData.mat = wingMat;
      const f: Flyer = { obj, wings, home: new THREE.Vector2(), phase: rnd(0, 10), speed: rnd(1.2, 1.8), kind: 'bee', target: new THREE.Vector3(), wait: 0 };
      obj.position.set(rnd(-limit, limit), 0.6, rnd(-limit, limit));
      this.pickBeeTarget(f);
      this.flyers.push(f);
    }
    this.flyers.forEach((f) => this.root.add(f.obj));
    scene.add(this.root);
  }

  get all(): THREE.Object3D[] {
    return this.flyers.map((f) => f.obj);
  }

  update(dt: number): void {
    for (const f of this.flyers) {
      f.phase += dt;
      if (f.kind === 'butterfly') this.updateButterfly(f, dt);
      else this.updateBee(f, dt);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.flyers.forEach((f) => (f.obj.userData.mat as THREE.Material).dispose());
    this.kit.dispose();
  }

  private updateButterfly(f: Flyer, dt: number): void {
    const t = f.phase * f.speed;
    const prev = this.tmp.copy(f.obj.position);
    f.obj.position.set(
      f.home.x + Math.sin(t * 1.3) * 3 + Math.sin(t * 0.7) * 1.5,
      0.9 + Math.sin(t * 2.1) * 0.35 + Math.sin(f.phase * 6) * 0.05,
      f.home.y + Math.cos(t * 0.9) * 3,
    );
    this.clamp(f.obj.position);
    const dx = f.obj.position.x - prev.x;
    const dz = f.obj.position.z - prev.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) f.obj.rotation.y = Math.atan2(dx, dz);
    const flap = Math.sin(f.phase * 14) * 0.9;
    f.wings[0].rotation.y = flap;
    f.wings[1].rotation.y = -flap;
    void dt;
  }

  private updateBee(f: Flyer, dt: number): void {
    const p = f.obj.position;
    if (f.wait > 0) {
      f.wait -= dt;
      p.y = f.target.y + Math.sin(f.phase * 9) * 0.03;
      if (f.wait <= 0) this.pickBeeTarget(f);
    } else {
      const d = this.tmp.subVectors(f.target, p);
      const len = d.length();
      if (len < 0.1) {
        f.wait = 0.8 + Math.random() * 1.5;
      } else {
        p.addScaledVector(d.normalize(), Math.min(len, f.speed * dt));
        p.y += Math.sin(f.phase * 12) * 0.01;
        f.obj.rotation.y = Math.atan2(d.x, d.z);
      }
    }
    this.clamp(p);
    const flap = Math.sin(f.phase * 60) * 0.6;
    f.wings[0].rotation.y = flap;
    f.wings[1].rotation.y = -flap;
  }

  private pickBeeTarget(f: Flyer): void {
    const p = f.obj.position;
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 3;
    f.target.set(p.x + Math.cos(a) * r, 0.35 + Math.random() * 0.6, p.z + Math.sin(a) * r);
    this.clamp(f.target);
  }

  private clamp(v: THREE.Vector3): void {
    const lim = this.halfSize - 1;
    v.x = Math.max(-lim, Math.min(lim, v.x));
    v.z = Math.max(-lim, Math.min(lim, v.z));
    v.y = Math.max(0.3, Math.min(1.8, v.y));
  }
}
