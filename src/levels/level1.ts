import * as THREE from 'three';
import type { InputState } from '../input/types';
import { cameraRelative } from '../input/combine';
import { stepBody, type Body, type PhysicsWorld } from '../physics/physics';
import { Hamster } from '../characters/hamster';
import { PartKit } from '../characters/parts';
import { buildMeadow, type Meadow } from '../world/meadow';
import { makeTreat } from '../world/treats';
import { Confetti, HintSparkle } from '../world/effects';
import { LEVEL1, type ItemSpot } from './level1Data';
import { HintTimer, Progress } from './progress';
import type { Level, LevelEvents } from './level';

type LevelData = typeof LEVEL1;

const PICKUP_RADIUS = 0.5;
const PICKUP_HEIGHT = 0.5;
const CELEBRATION_TIME = 2.2;
const PICKUP_ANIM = 0.25;
/** Treats are drawn bigger than life so kids spot them in the grass. */
const TREAT_SCALE = 1.8;

interface Treat {
  spot: ItemSpot;
  root: THREE.Group;
  phase: number;
  taken: boolean;
  /** seconds since pickup, while the "flying into the hamster" animation plays */
  pickT: number;
}

export class Level1Meadow implements Level {
  private scene!: THREE.Scene;
  private events!: LevelEvents;
  private meadow!: Meadow;
  private hamster!: Hamster;
  private kit!: PartKit;
  private body!: Body;
  private world!: PhysicsWorld;
  private treats: Treat[] = [];
  private progress!: Progress;
  private hint!: HintTimer;
  private sparkle!: HintSparkle;
  private confetti: Confetti | null = null;
  private celebrateLeft = -1;
  private completedFired = false;
  private readonly tmp = new THREE.Vector3();

  constructor(private readonly data: LevelData = LEVEL1) {}

  get player(): THREE.Object3D {
    return this.hamster.root;
  }

  get treatsLeft(): number {
    return this.treats.filter((t) => !t.taken).length;
  }

  get nuts(): { collected: number; total: number } {
    return { collected: this.progress.nuts, total: this.progress.nutsTotal };
  }

  get bonuses(): { collected: number; total: number } {
    return { collected: this.progress.bonuses, total: this.progress.bonusTotal };
  }

  /** Stars earned so far, as if the level were finished now (for the HUD). */
  get starsIfDone(): number {
    const p = this.progress;
    return Math.min(3, 1 + Math.floor((2 * p.bonuses) / Math.max(1, p.bonusTotal)));
  }

  /** Exposed for NPCs and the camera. */
  get hamsterModel(): Hamster {
    return this.hamster;
  }

  setup(scene: THREE.Scene, events: LevelEvents): void {
    this.scene = scene;
    this.events = events;
    const d = this.data;
    this.meadow = buildMeadow(scene, d);
    this.world = { colliders: d.colliders, bounds: { halfSize: d.halfSize } };
    this.body = { pos: { x: d.spawn.x, y: 0, z: d.spawn.z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
    this.hamster = new Hamster();
    this.hamster.face(Math.PI);
    this.hamster.sync(this.body, 0);
    scene.add(this.hamster.root);

    this.kit = new PartKit();
    this.treats = d.items.map((spot, i) => {
      const root = makeTreat(spot.kind, this.kit);
      root.scale.multiplyScalar(TREAT_SCALE);
      const holder = new THREE.Group();
      holder.add(root);
      holder.position.set(spot.x, spot.y, spot.z);
      scene.add(holder);
      return { spot, root: holder, phase: i * 0.7, taken: false, pickT: -1 };
    });

    const nutsTotal = d.items.filter((i) => i.kind === 'nut').length;
    this.progress = new Progress(nutsTotal, d.items.length - nutsTotal);
    this.hint = new HintTimer(20);
    this.sparkle = new HintSparkle();
    scene.add(this.sparkle.root);
    this.celebrateLeft = -1;
    this.completedFired = false;
  }

  update(dt: number, input: InputState, cameraYaw: number): void {
    const celebrating = this.progress.isComplete();
    const wish = celebrating ? { x: 0, z: 0 } : cameraRelative(input.move, cameraYaw);
    stepBody(this.body, wish, !celebrating && input.action, dt, this.world);
    this.hamster.sync(this.body, dt);
    this.meadow.update(this.hamster.root.position);

    let collected = false;
    for (const t of this.treats) {
      if (t.taken) {
        if (t.pickT >= 0) this.animatePickup(t, dt);
        continue;
      }
      t.phase += dt;
      t.root.children[0].position.y = 0.06 + Math.sin(t.phase * 2.5) * 0.05;
      t.root.children[0].rotation.y = t.phase * 1.2;
      const dx = t.spot.x - this.body.pos.x;
      const dz = t.spot.z - this.body.pos.z;
      if (Math.hypot(dx, dz) < PICKUP_RADIUS && Math.abs(t.spot.y - this.body.pos.y) < PICKUP_HEIGHT) {
        t.taken = true;
        t.pickT = 0;
        collected = true;
        this.progress.collect(t.spot.kind);
        this.hamster.anim.puffCheeks();
        this.events.onCollect(t.spot.kind, this.progress.nuts, this.progress.nutsTotal);
      }
    }

    if (this.progress.isComplete() && this.celebrateLeft < 0 && !this.completedFired) {
      this.celebrateLeft = CELEBRATION_TIME;
      this.hamster.anim.celebrate();
      this.confetti = new Confetti(this.hamster.root.position);
      this.scene.add(this.confetti.mesh);
    }
    if (this.celebrateLeft >= 0) {
      this.celebrateLeft -= dt;
      if (this.celebrateLeft < 0 && !this.completedFired) {
        this.completedFired = true;
        this.events.onComplete(this.progress.stars());
      }
    }
    if (this.confetti && !this.confetti.update(dt)) {
      this.confetti.dispose();
      this.confetti = null;
    }

    this.updateHint(dt, collected);
  }

  isComplete(): boolean {
    return this.progress.isComplete();
  }

  stars(): number {
    return this.progress.stars();
  }

  dispose(): void {
    this.meadow.dispose();
    this.hamster.dispose();
    this.treats.forEach((t) => t.root.removeFromParent());
    this.treats = [];
    this.kit.dispose();
    this.sparkle.dispose();
    this.confetti?.dispose();
    this.confetti = null;
  }

  private animatePickup(t: Treat, dt: number): void {
    t.pickT += dt;
    const k = Math.min(1, t.pickT / PICKUP_ANIM);
    const target = this.tmp.copy(this.hamster.root.position).add(new THREE.Vector3(0, 0.45, 0));
    t.root.position.lerp(target, k);
    t.root.scale.setScalar(Math.max(0.01, 1 + 0.4 * Math.sin(k * Math.PI) - k));
    if (k >= 1) {
      t.root.visible = false;
      t.pickT = -1;
    }
  }

  private updateHint(dt: number, collected: boolean): void {
    const show = !this.progress.isComplete() && this.hint.update(dt, collected);
    this.sparkle.root.visible = show;
    if (!show) return;
    let best: Treat | null = null;
    let bestD = Infinity;
    for (const t of this.treats) {
      if (t.taken || t.spot.kind !== 'nut') continue;
      const d = Math.hypot(t.spot.x - this.body.pos.x, t.spot.z - this.body.pos.z);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (best) {
      this.sparkle.root.position.set(best.spot.x, best.spot.y, best.spot.z);
      this.sparkle.update(dt);
    }
  }
}
