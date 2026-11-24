import * as THREE from 'three';
import type { InputState } from '../input/types';
import { cameraRelative } from '../input/combine';
import { steer } from '../input/steer';
import { groundAt, stepBody, topHeightAt, type Body, type PhysicsWorld } from '../physics/physics';
import { BlobShadow } from '../world/shadow';
import { Hamster } from '../characters/hamster';
import { PartKit } from '../characters/parts';
import type { World } from '../world/world';
import { makeTreat } from '../world/treats';
import { Confetti } from '../world/effects';
import { Critters } from '../world/critters';
import type { ItemSpot } from './level1Data';
import { computeStars } from './progress';
import type { Level, LevelEvents } from './level';

const PICKUP_RADIUS = 0.5;
const PICKUP_HEIGHT = 0.5;
const PICKUP_ANIM = 0.25;
/** Treats are drawn bigger than life so kids spot them in the grass. */
const TREAT_SCALE = 1.8;
const CRITTER_NEAR = 1.5;
const CRITTER_REPEAT = 10;

export interface Treat {
  spot: ItemSpot;
  root: THREE.Group;
  phase: number;
  taken: boolean;
  /** seconds since pickup, while the "flying into the hamster" animation plays */
  pickT: number;
}

/** What a concrete level provides when it is set up. */
export interface LevelLayout {
  view: World;
  physics: PhysicsWorld;
  spawn: { x: number; z: number; heading: number };
  /** Collectable treats; every kind except 'nut' counts as a bonus for stars. */
  treats: ItemSpot[];
}

/**
 * Shared skeleton of every level: hamster + physics + steering, treats and bonuses,
 * butterflies/bees with their chatter, celebration and clean-up. Levels add their goal.
 */
export abstract class LevelBase implements Level {
  protected scene!: THREE.Scene;
  protected events!: LevelEvents;
  protected view!: World;
  protected hamster!: Hamster;
  protected kit!: PartKit;
  protected body!: Body;
  protected physics!: PhysicsWorld;
  protected treats: Treat[] = [];
  protected critters!: Critters;
  protected bonusTotal = 0;
  protected bonusTaken = 0;
  /** Seconds between finishing the goal and the end screen. */
  protected celebrationTime = 2.2;
  private confetti: Confetti | null = null;
  private shadow: BlobShadow | null = null;
  private celebrateLeft = -1;
  private completedFired = false;
  private steerMode = false;
  private headingVal = Math.PI;
  private critterCooldown = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly lift = new THREE.Vector3(0, 0.45, 0);

  /** Build the world, physics, spawn point and treats. */
  protected abstract layout(scene: THREE.Scene): LevelLayout;
  /** Level goal for the HUD (e.g. nuts or gates). */
  abstract get goal(): { done: number; total: number; icon: string };
  abstract isComplete(): boolean;

  /** Extra set-up after the shared parts exist. */
  protected onSetup(): void {}
  /** Per-step level logic after the hamster moved. `collected` = a treat was picked this step. */
  protected onUpdate(_dt: number, _collected: boolean): void {}
  /** A treat was picked up. */
  protected onTreat(t: Treat): void {
    this.events.onCollect(t.spot.kind, 0, 0);
  }
  /** Can the hamster jump right now? (e.g. not inside a tube) */
  protected canJump(): boolean {
    return true;
  }
  /** Start of the celebration (confetti + happy hamster by default). */
  protected onCelebrate(): void {
    this.hamster.anim.celebrate();
  }
  /** Movement is frozen while celebrating; levels may still move the hamster themselves. */
  protected onDispose(): void {}

  get player(): THREE.Object3D {
    return this.hamster.root;
  }

  get treatsLeft(): number {
    return this.treats.filter((t) => !t.taken).length;
  }

  get bonuses(): { collected: number; total: number } {
    return { collected: this.bonusTaken, total: this.bonusTotal };
  }

  /** Props that may hide the hamster from the camera. */
  get occluders(): THREE.Object3D[] {
    return this.view.occluders;
  }

  /** "Toy car" steering (for the camera-behind mode) instead of camera-relative movement. */
  get steering(): boolean {
    return this.steerMode;
  }

  set steering(on: boolean) {
    this.steerMode = on;
    if (this.hamster) this.headingVal = this.hamster.root.rotation.y;
  }

  /** Direction the hamster faces (rotation.y). */
  get heading(): number {
    return this.steerMode ? this.headingVal : this.hamster.root.rotation.y;
  }

  get critterObjects(): THREE.Object3D[] {
    return this.critters.all;
  }

  stars(): number {
    return computeStars(this.isComplete(), this.bonusTaken, this.bonusTotal);
  }

  setup(scene: THREE.Scene, events: LevelEvents): void {
    this.scene = scene;
    this.events = events;
    const l = this.layout(scene);
    this.view = l.view;
    this.physics = l.physics;
    const y = groundAt(l.spawn.x, l.spawn.z, l.physics);
    this.body = { pos: { x: l.spawn.x, y, z: l.spawn.z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
    this.hamster = new Hamster();
    this.hamster.face(l.spawn.heading);
    this.headingVal = l.spawn.heading;
    this.hamster.sync(this.body, 0);
    scene.add(this.hamster.root);
    this.shadow = new BlobShadow();
    scene.add(this.shadow.mesh);

    this.critters = new Critters(scene, l.physics.bounds.halfSize);
    this.critterCooldown = 0;

    this.kit = new PartKit();
    this.treats = l.treats.map((spot, i) => {
      const root = makeTreat(spot.kind, this.kit);
      root.scale.multiplyScalar(TREAT_SCALE);
      const holder = new THREE.Group();
      holder.add(root);
      holder.position.set(spot.x, spot.y || groundAt(spot.x, spot.z, l.physics), spot.z);
      scene.add(holder);
      return { spot, root: holder, phase: i * 0.7, taken: false, pickT: -1 };
    });
    this.bonusTotal = l.treats.filter((t) => t.kind !== 'nut').length;
    this.bonusTaken = 0;
    this.celebrateLeft = -1;
    this.completedFired = false;
    this.confetti = null;
    this.onSetup();
  }

  update(dt: number, input: InputState, cameraYaw: number): void {
    const celebrating = this.isComplete();
    let wish = { x: 0, z: 0 };
    if (!celebrating) {
      if (this.steerMode) {
        const r = steer(input.move, this.headingVal, dt);
        this.headingVal = r.heading;
        wish = r.wish;
      } else wish = cameraRelative(input.move, cameraYaw);
    }
    const wasGrounded = this.body.grounded;
    stepBody(this.body, wish, !celebrating && input.action && this.canJump(), dt, this.physics);
    if (wasGrounded && this.body.vel.y > 0) this.events.onJump?.();
    const gaitBefore = this.hamster.anim.gaitPhase;
    this.hamster.sync(this.body, dt);
    if (this.steerMode && !celebrating) this.hamster.face(this.headingVal);
    if (Math.floor(this.hamster.anim.gaitPhase / Math.PI) !== Math.floor(gaitBefore / Math.PI)) this.events.onStep?.();
    this.view.update(this.hamster.root.position);
    const p = this.body.pos;
    this.shadow?.place(p.x, p.z, topHeightAt(p.x, p.z, this.body.radius, this.physics), p.y);

    const collected = this.updateTreats(dt);
    this.onUpdate(dt, collected);
    this.updateCelebration(dt);
    this.critters.update(dt);
    this.updateCritterChat(dt);
  }

  dispose(): void {
    this.onDispose();
    this.view.dispose();
    this.hamster.dispose();
    this.shadow?.dispose();
    this.shadow = null;
    this.critters.dispose();
    this.treats.forEach((t) => t.root.removeFromParent());
    this.treats = [];
    this.kit.dispose();
    this.confetti?.dispose();
    this.confetti = null;
  }

  private updateTreats(dt: number): boolean {
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
      if (Math.hypot(dx, dz) < PICKUP_RADIUS && Math.abs(t.root.position.y - this.body.pos.y) < PICKUP_HEIGHT) {
        t.taken = true;
        t.pickT = 0;
        collected = true;
        if (t.spot.kind !== 'nut') this.bonusTaken++;
        this.hamster.anim.puffCheeks();
        this.onTreat(t);
      }
    }
    return collected;
  }

  private updateCelebration(dt: number): void {
    if (this.isComplete() && this.celebrateLeft < 0 && !this.completedFired) {
      this.celebrateLeft = this.celebrationTime;
      this.events.onFinished?.(this.stars());
      this.onCelebrate();
      this.confetti = new Confetti(this.hamster.root.position);
      this.scene.add(this.confetti.mesh);
    }
    if (this.celebrateLeft >= 0) {
      this.celebrateLeft -= dt;
      if (this.celebrateLeft < 0 && !this.completedFired) {
        this.completedFired = true;
        this.events.onComplete(this.stars());
      }
    }
    if (this.confetti && !this.confetti.update(dt)) {
      this.confetti.dispose();
      this.confetti = null;
    }
  }

  private updateCritterChat(dt: number): void {
    this.critterCooldown = Math.max(0, this.critterCooldown - dt);
    if (this.critterCooldown > 0 || this.isComplete()) return;
    const near = this.critters.nearest(this.hamster.root.position, CRITTER_NEAR);
    if (!near) return;
    this.critterCooldown = CRITTER_REPEAT;
    this.events.onCritter?.(near.kind, near.obj);
  }

  private animatePickup(t: Treat, dt: number): void {
    t.pickT += dt;
    const k = Math.min(1, t.pickT / PICKUP_ANIM);
    t.root.position.lerp(this.tmp.copy(this.hamster.root.position).add(this.lift), k);
    t.root.scale.setScalar(Math.max(0.01, 1 + 0.4 * Math.sin(k * Math.PI) - k));
    if (k >= 1) {
      t.root.visible = false;
      t.pickT = -1;
    }
  }
}
