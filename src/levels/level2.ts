import * as THREE from 'three';
import { Squirrel } from '../characters/squirrel';
import { buildWorld } from '../world/world';
import { hoopColliders, makeHoop, makeTube, makePuddle, makeFlowerbed, makeFence, makeCan, makePot, makeWheel, makePath, setGateState, tubeColliders, tubeZone, puddleCollider } from '../world/garden';
import type { Collider } from '../physics/physics';
import type { LineId } from '../audio/lines';
import { GateTracker, navArrowVisible, type Course, type Gate } from './course';
import { SquirrelRunner } from './squirrelRunner';
import { LEVEL2, level2Course, level2Gates, level2Placements, level2Terrain } from './level2Data';
import { LevelBase, type LevelLayout, type Treat } from './levelBase';

const CHEER_COOLDOWN = 8;
const SPLASH_COOLDOWN = 2.5;
const TUBE_WARN = 4;
const WHEEL_TRAVEL = 1.2;

/** Level 2 – the garden: race the squirrel through 8 hoops and tubes; finish in the hamster wheel. */
export class Level2Garden extends LevelBase {
  readonly course: Course = level2Course();
  readonly gates: Gate[] = level2Gates(this.course);
  readonly puddles = level2Placements(this.course).puddles;
  private tracker!: GateTracker;
  private gateObjs: THREE.Object3D[] = [];
  private garden!: THREE.Group;
  private inTube: ((x: number, z: number) => boolean)[] = [];
  private squirrel!: Squirrel;
  private runner!: SquirrelRunner;
  private wheel!: ReturnType<typeof makeWheel>;
  private wheelPos = new THREE.Vector3();
  private wheelCollider!: Collider;
  private arrow!: THREE.Group;
  private t = 0;
  private cheerCooldown = 0;
  private splashCooldown = 0;
  private warnedTubes = new Set<number>();
  private waitingSaid = false;
  private finishT = -1;
  private finishFrom = new THREE.Vector3();
  private prev = { x: 0, z: 0 };
  private cameraYaw = 0;
  /** Whether the navigation arrow is showing (for tests / HUD). */
  navArrow = false;

  constructor() {
    super();
    this.celebrationTime = 4;
  }

  get goal() {
    return { done: this.tracker?.passed ?? 0, total: this.gates.length, icon: 'hoop' };
  }

  get squirrelS(): number {
    return this.runner.s;
  }

  /** Side view of the hamster wheel for the finish (camera looks along the wheel's axle). */
  get finishShot(): { from: THREE.Vector3; at: THREE.Vector3 } | null {
    if (this.finishT < 0) return null;
    const ry = this.wheel.root.rotation.y;
    const axleX = Math.cos(ry);
    const axleZ = -Math.sin(ry);
    const at = new THREE.Vector3(this.wheelPos.x, 0.75, this.wheelPos.z);
    return { from: new THREE.Vector3(at.x + axleX * 3.6, 1.5, at.z + axleZ * 3.6), at };
  }

  get npc(): Squirrel {
    return this.squirrel;
  }

  isComplete(): boolean {
    return this.tracker?.isDone() ?? false;
  }

  protected layout(scene: THREE.Scene): LevelLayout {
    const course = this.course;
    const terrain = level2Terrain(course);
    const place = level2Placements(course);
    const L = LEVEL2.tubeLength;

    const colliders: Collider[] = [...LEVEL2.props.map((p) => p.collider)];
    for (const g of this.gates) colliders.push(...(g.kind === 'tube' ? tubeColliders(g, L) : hoopColliders(g)));
    for (const p of place.puddles) colliders.push(puddleCollider(p.x, p.z, p.r));
    for (const d of place.decor) {
      if (d.type === 'flowerbed') colliders.push({ kind: 'box', x: d.x, z: d.z, halfX: 1.0, halfZ: 0.45, height: 0.95, yaw: d.yaw });
      else if (d.type === 'fence') colliders.push({ kind: 'box', x: d.x, z: d.z, halfX: 1.3, halfZ: 0.08, height: 0.9, yaw: d.yaw });
      else colliders.push({ kind: 'cylinder', x: d.x, z: d.z, radius: d.type === 'can' ? 0.4 : 0.34, height: 0.9 });
    }
    const end = course.pointAt(course.length);
    this.wheelPos.set(end.x, 0, end.z);
    this.wheelCollider = { kind: 'cylinder', x: end.x, z: end.z, radius: 0.6, height: 2.2 };
    colliders.push(this.wheelCollider);

    const view = buildWorld(scene, {
      halfSize: LEVEL2.halfSize,
      terrain,
      colliders,
      props: LEVEL2.props,
      avoid: [
        ...place.bonuses.map((b) => ({ x: b.x, z: b.z, r: 0.5 })),
        ...place.puddles.map((p) => ({ x: p.x, z: p.z, r: p.r + 0.2 })),
        // keep grass off the path
        ...Array.from({ length: Math.ceil(course.length / 0.8) }, (_, i) => {
          const p = course.pointAt(i * 0.8);
          return { x: p.x, z: p.z, r: 0.9 };
        }),
      ],
    });

    // garden-specific scenery
    this.garden = new THREE.Group();
    this.garden.add(makePath(course));
    place.puddles.forEach((p, i) => {
      const o = makePuddle(p.r, i + 1);
      o.position.set(p.x, terrain.height(p.x, p.z), p.z);
      this.garden.add(o);
    });
    place.decor.forEach((d, i) => {
      let o: THREE.Object3D;
      if (d.type === 'flowerbed') o = makeFlowerbed(1.0, 0.45, d.yaw, i);
      else if (d.type === 'fence') o = makeFence(1.3, d.yaw);
      else if (d.type === 'can') o = makeCan();
      else o = makePot(i);
      o.position.set(d.x, terrain.height(d.x, d.z), d.z);
      this.garden.add(o);
      view.occluders.push(o);
    });
    this.gateObjs = this.gates.map((g) => {
      const o = g.kind === 'tube' ? makeTube(g, L) : makeHoop(g);
      this.garden.add(o);
      if (g.kind === 'tube') view.occluders.push(o);
      return o;
    });
    this.inTube = this.gates.filter((g) => g.kind === 'tube').map((g) => tubeZone(g, L));
    this.wheel = makeWheel();
    const tEnd = course.tangentAt(course.length);
    this.wheel.root.position.copy(this.wheelPos);
    this.wheel.root.rotation.y = Math.atan2(tEnd.x, tEnd.z) + Math.PI / 2;
    this.garden.add(this.wheel.root);
    scene.add(this.garden);

    const start = course.pointAt(0);
    const t0 = course.tangentAt(0);
    return {
      view,
      physics: { colliders, bounds: { halfSize: LEVEL2.halfSize }, ground: (x, z) => terrain.height(x, z) },
      spawn: { x: start.x, z: start.z, heading: Math.atan2(t0.x, t0.z) },
      treats: place.bonuses.map((b) => ({ kind: b.kind, x: b.x, z: b.z, y: 0 })),
    };
  }

  protected onSetup(): void {
    this.tracker = new GateTracker(this.gates);
    this.runner = new SquirrelRunner(this.course.length);
    this.runner.s = 2.5;
    this.squirrel = new Squirrel();
    this.scene.add(this.squirrel.root);
    this.placeSquirrel();
    this.arrow = makeArrow();
    this.scene.add(this.arrow);
    this.prev = { x: this.body.pos.x, z: this.body.pos.z };
    this.t = 0;
    this.cheerCooldown = 0;
    this.splashCooldown = 0;
    this.warnedTubes.clear();
    this.waitingSaid = false;
    this.finishT = -1;
  }

  protected canJump(): boolean {
    return !this.inTube.some((inside) => inside(this.body.pos.x, this.body.pos.z));
  }

  protected onTreat(t: Treat): void {
    this.events.onCollect(t.spot.kind, 0, 0);
  }

  protected onCelebrate(): void {
    this.finishT = 0;
    // the hamster hops *into* the wheel, so its solid stand must not push it out
    this.physics.colliders = this.physics.colliders.filter((c) => c !== this.wheelCollider);
    this.finishFrom.set(this.body.pos.x, this.body.pos.y, this.body.pos.z);
    this.squirrel.cheer();
    this.say('l2finish', true);
  }

  update(dt: number, input: { move: { x: number; y: number }; action: boolean }, cameraYaw: number): void {
    this.cameraYaw = cameraYaw;
    super.update(dt, input, cameraYaw);
  }

  protected onUpdate(dt: number): void {
    this.t += dt;
    this.cheerCooldown = Math.max(0, this.cheerCooldown - dt);
    this.splashCooldown = Math.max(0, this.splashCooldown - dt);
    const pos = this.body.pos;

    // gates
    const passed = this.tracker.update(this.prev, { x: pos.x, z: pos.z });
    this.prev = { x: pos.x, z: pos.z };
    if (passed !== null) {
      this.events.onGoal?.(passed, this.gates.length);
      if (passed % 2 === 1 && passed < this.gates.length - 1 && this.cheerCooldown === 0) {
        this.say((['l2cheer1', 'l2cheer2', 'l2cheer3'] as LineId[])[Math.floor(Math.random() * 3)]);
      }
    }
    this.gateObjs.forEach((o, i) => setGateState(o, i < this.tracker.passed ? 'done' : i === this.tracker.next ? 'next' : 'waiting', this.t));

    // "into the tube!" when approaching a tube
    const next = this.gates[this.tracker.next];
    if (next?.kind === 'tube' && !this.warnedTubes.has(this.tracker.next) && Math.hypot(next.x - pos.x, next.z - pos.z) < TUBE_WARN) {
      this.warnedTubes.add(this.tracker.next);
      this.say('l2tube', true);
    }

    // squirrel
    const playerS = this.course.nearestS(pos.x, pos.z);
    // progress beyond the next gate doesn't count, so cutting across doesn't drag the squirrel ahead
    const nextS = next ? next.s : this.course.length;
    this.runner.update(dt, Math.min(playerS, nextS + 1), this.isComplete());
    if (this.runner.waiting && !this.waitingSaid) {
      this.waitingSaid = true;
      this.squirrel.wave();
      this.say('l2wait');
    }
    if (!this.runner.waiting) this.waitingSaid = false;
    this.placeSquirrel();
    this.squirrel.update(dt, this.runner.speed, this.hamster.root.position, this.headingAt(this.runner.s));

    // puddle bumps
    if (this.splashCooldown === 0) {
      for (const p of this.puddles) {
        if (Math.hypot(pos.x - p.x, pos.z - p.z) < p.r + 0.32) {
          this.splashCooldown = SPLASH_COOLDOWN;
          this.events.onSplash?.();
          break;
        }
      }
    }

    // navigation arrow over the hamster
    this.updateArrow(next, Math.hypot(pos.x - this.course.pointAt(playerS).x, pos.z - this.course.pointAt(playerS).z));

    // finish: hop into the wheel and run in it
    if (this.finishT >= 0) this.updateFinish(dt);
  }

  protected onDispose(): void {
    this.garden.removeFromParent();
    this.garden.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mt = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
      else mt?.dispose();
    });
    this.squirrel.dispose();
    this.arrow.removeFromParent();
    this.arrow.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    (this.arrow.userData.material as THREE.Material).dispose();
  }

  private say(id: LineId, force = false): void {
    if (!force && this.cheerCooldown > 0) return;
    this.cheerCooldown = CHEER_COOLDOWN;
    this.events.onSquirrel?.(id, this.squirrel.root);
  }

  private headingAt(s: number): number {
    const t = this.course.tangentAt(s);
    return Math.atan2(t.x, t.z);
  }

  private placeSquirrel(): void {
    const p = this.course.pointAt(this.runner.s);
    // run beside the path so the hamster can pass
    const t = this.course.tangentAt(this.runner.s);
    this.squirrel.root.position.set(p.x - t.z * 0.55, 0, p.z + t.x * 0.55);
  }

  private updateArrow(next: Gate | undefined, offPath: number): void {
    if (!next || this.isComplete()) {
      this.arrow.visible = this.navArrow = false;
      return;
    }
    const pos = this.hamster.root.position;
    const dx = next.x - pos.x;
    const dz = next.z - pos.z;
    // camera looks along (-sin yaw, -cos yaw); the gate is "on screen" when within ~50° of that
    const fx = -Math.sin(this.cameraYaw);
    const fz = -Math.cos(this.cameraYaw);
    const len = Math.hypot(dx, dz) || 1;
    const onScreen = (dx * fx + dz * fz) / len > Math.cos((50 * Math.PI) / 180);
    this.navArrow = navArrowVisible(offPath, onScreen);
    this.arrow.visible = this.navArrow;
    this.arrow.position.set(pos.x, pos.y + 1.15 + Math.sin(this.t * 4) * 0.06, pos.z);
    this.arrow.rotation.y = Math.atan2(dx, dz);
  }

  private updateFinish(dt: number): void {
    this.finishT += dt;
    const k = Math.min(1, this.finishT / WHEEL_TRAVEL);
    const seat = this.wheelPos;
    const e = k * k * (3 - 2 * k);
    this.body.pos.x = this.finishFrom.x + (seat.x - this.finishFrom.x) * e;
    this.body.pos.z = this.finishFrom.z + (seat.z - this.finishFrom.z) * e;
    this.body.pos.y = Math.sin(k * Math.PI) * 0.6 + this.wheel.seat.y * k;
    // keep the running animation going, facing along the wheel's rolling direction
    // the wheel rolls along its local Z, so the hamster faces along the wheel's yaw
    const dir = this.wheel.root.rotation.y;
    this.body.vel.x = Math.sin(dir) * 2.5;
    this.body.vel.z = Math.cos(dir) * 2.5;
    this.body.vel.y = 0;
    this.body.grounded = true;
    this.hamster.root.position.set(this.body.pos.x, this.body.pos.y, this.body.pos.z);
    if (k >= 1) this.wheel.spin(dt, 6); // bottom of the wheel moves backwards under the running hamster
  }
}

/** Chunky rounded arrow that floats above the hamster and points to the next gate. */
function makeArrow(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xffc93c });
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 16), m);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.2;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12), m);
  shaft.rotation.x = Math.PI / 2;
  g.add(head, shaft);
  g.visible = false;
  g.userData.material = m;
  return g;
}
