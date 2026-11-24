import * as THREE from 'three';
import { Frog } from '../characters/frog';
import { buildWorld } from '../world/world';
import { Terrain } from '../world/terrain';
import { makePath } from '../world/garden';
import { makeWater, makeStone, makeStump, makeLily, makeLog, makeFlowerMarker, makeBud, makeRipples, setStepGlow, makeReeds } from '../world/brook';
import { moveCollider, supportOf, type Collider } from '../physics/physics';
import type { LineId } from '../audio/lines';
import { GateTracker, placeGates, type Course, type Gate } from './course';
import { FrogGuide, type Pt } from './frogGuide';
import { LilyPad, logOffset } from './platforms';
import {
  LEVEL3,
  FALL_Y,
  brookCenterX,
  brookHalfWidth,
  inBrook,
  level3Bonuses,
  level3Course,
  level3Crossings,
  level3Ground,
  level3LandSteps,
  level3SideStones,
  type Crossing,
  type StepSpot,
} from './level3Data';
import { LevelBase, type LevelLayout, type Treat } from './levelBase';

const CHEER_COOLDOWN = 8;
const LAUGH_COOLDOWN = 4;
const RESPAWN_AFTER = 0.8;
/** The fade starts this long before the hamster is moved, so the jump cut happens in the dark. */
const FADE_LEAD = 0.15;
/** After being put back, the hamster stands still a moment (a held joystick must not walk it straight back in). */
const RESPAWN_GRACE = 0.5;
/** Bank respawn spots keep this distance from the water. */
const BANK_MARGIN = 0.7;
const HINT_AFTER = 3;
const BIAS = 0.55;
const LILY_WARN = 4;
const BERRY_REACH = 0.6;
const FINISH_STUMP = { r: 0.6, top: 0.35 };

interface StepRef {
  kind: StepSpot['kind'];
  spot: StepSpot;
  c: Collider;
  obj: THREE.Object3D;
  lily?: LilyPad;
  /** live point the frog hops to (moved with the platform) */
  pt: Pt;
}

/** Level 3 – the brook: hop over 6 crossings after the frog; lily pads sink, the log sways; strawberry at the end. */
export class Level3Brook extends LevelBase {
  readonly course: Course = level3Course();
  readonly crossings: Crossing[] = level3Crossings(this.course);
  private readonly gates: Gate[] = placeGates(
    this.course,
    this.crossings.map((c) => ({ s: c.endS, kind: 'line' as const })),
  );
  /** Steps per crossing (for tests and the frog). */
  stepRefs: StepRef[][] = [];
  private staticSteps = new Set<Collider>();
  private tracker!: GateTracker;
  private group!: THREE.Group;
  private water!: THREE.Mesh;
  private flowers: ReturnType<typeof makeFlowerMarker>[] = [];
  private bloomK: number[] = [];
  private bud!: ReturnType<typeof makeBud>;
  private ripples!: ReturnType<typeof makeRipples>;
  private frog!: Frog;
  private guide!: FrogGuide;
  private stump = new THREE.Vector3();
  private t = 0;
  private prev = { x: 0, z: 0 };
  private safe = { x: 0, y: 0, z: 0, heading: 0 };
  private fallT = -1;
  private faded = false;
  private graceT = 0;
  private fallsAt: number[] = [];
  private hinted = new Set<number>();
  private laughCooldown = 0;
  private cheerCooldown = 0;
  private lilyWarned = false;
  private reached: number[] = [];
  private eaten = false;
  private sinkingBefore = new Set<LilyPad>();
  private bias = 0;
  /** Falls into the water so far. */
  falls = 0;

  constructor() {
    super();
    this.celebrationTime = 3.5;
  }

  get goal() {
    return { done: this.tracker?.passed ?? 0, total: this.crossings.length, icon: 'flower' };
  }

  get npc(): Frog {
    return this.frog;
  }

  /** Side swing for the chase camera while on a crossing. */
  get cameraBias(): number {
    return this.bias;
  }

  /** Side view of the finish stump with the hamster and the frog. */
  get finishShot(): { from: THREE.Vector3; at: THREE.Vector3 } | null {
    if (!this.eaten) return null;
    const at = new THREE.Vector3(this.stump.x, 0.6, this.stump.z);
    return { from: new THREE.Vector3(at.x - 0.6, 1.6, at.z + 3.4), at };
  }

  isComplete(): boolean {
    return this.eaten;
  }

  protected layout(scene: THREE.Scene): LevelLayout {
    const course = this.course;
    const ground = level3Ground();
    const colliders: Collider[] = [...LEVEL3.props.map((p) => p.collider)];
    this.group = new THREE.Group();
    this.staticSteps = new Set();

    const addStep = (spot: StepSpot, seed: number): StepRef => {
      const gy = ground(spot.x, spot.z);
      const c: Collider =
        spot.kind === 'log'
          ? { kind: 'box', x: spot.x, z: spot.z, halfX: spot.r, halfZ: (spot.len ?? 1.8) / 2, height: spot.top - gy }
          : { kind: 'cylinder', x: spot.x, z: spot.z, radius: spot.r, height: spot.top - gy };
      colliders.push(c);
      let obj: THREE.Object3D;
      if (spot.kind === 'stone') obj = makeStone(spot.r, spot.top, seed);
      else if (spot.kind === 'stump') obj = makeStump(spot.r, spot.top);
      else if (spot.kind === 'lily') obj = makeLily(spot.r, spot.top);
      else obj = makeLog(spot.len ?? 1.8, spot.r, spot.top);
      obj.position.set(spot.x, 0, spot.z);
      this.group.add(obj);
      const ref: StepRef = { kind: spot.kind, spot, c, obj, pt: { x: spot.x, y: spot.top, z: spot.z } };
      if (spot.kind === 'lily') ref.lily = new LilyPad();
      else if (spot.kind !== 'log') this.staticSteps.add(c);
      return ref;
    };

    let seed = 1;
    this.stepRefs = this.crossings.map((cr) => cr.steps.map((s) => addStep(s, seed++)));
    for (const s of [...level3LandSteps(course), ...level3SideStones()]) addStep(s, seed++);

    // finish stump with the strawberry flower
    const end = course.pointAt(course.length);
    this.stump.set(end.x, 0, end.z);
    const finish: StepSpot = { kind: 'stump', x: end.x, z: end.z, r: FINISH_STUMP.r, top: FINISH_STUMP.top };
    addStep(finish, seed++);
    this.bud = makeBud();
    this.bud.root.position.set(end.x, FINISH_STUMP.top, end.z);
    this.group.add(this.bud.root);

    // water, path, flowers on the far banks, reeds
    this.water = makeWater(brookCenterX, brookHalfWidth, LEVEL3.waterY, LEVEL3.halfSize + 2);
    this.group.add(this.water);
    this.group.add(makePath(course, 1.3));
    this.flowers = this.gates.map((g) => {
      const f = makeFlowerMarker();
      // beside the track so it never blocks the way
      f.root.position.set(g.x - g.dirZ * 0.9, 0, g.z + g.dirX * 0.9);
      this.group.add(f.root);
      return f;
    });
    const reeds: { x: number; z: number }[] = [];
    for (let z = -LEVEL3.halfSize + 1; z < LEVEL3.halfSize; z += 2.3) {
      const nearLeg = LEVEL3.legs.some((lz) => Math.abs(lz - z) < 1.6);
      if (nearLeg) continue;
      for (const s of [-1, 1]) reeds.push({ x: brookCenterX(z) + s * (brookHalfWidth(z) + 0.3), z });
    }
    reeds.forEach((r, i) => {
      const o = makeReeds(i);
      o.position.set(r.x, 0, r.z);
      this.group.add(o);
    });
    this.ripples = makeRipples();
    this.group.add(this.ripples.root);
    scene.add(this.group);

    const bonuses = level3Bonuses(course);
    const view = buildWorld(scene, {
      halfSize: LEVEL3.halfSize,
      terrain: Terrain.flat(),
      colliders,
      props: LEVEL3.props,
      avoid: [
        ...bonuses.map((b) => ({ x: b.x, z: b.z, r: 0.5 })),
        ...Array.from({ length: Math.ceil(course.length / 0.8) }, (_, i) => {
          const p = course.pointAt(i * 0.8);
          return { x: p.x, z: p.z, r: 0.8 };
        }),
      ],
      exclude: (x, z) => Math.abs(x - brookCenterX(z)) < brookHalfWidth(z) + 0.2,
    });
    for (const refs of this.stepRefs) for (const r of refs) view.occluders.push(r.obj);

    const start = course.pointAt(0);
    const t0 = course.tangentAt(0);
    return {
      view,
      physics: { colliders, bounds: { halfSize: LEVEL3.halfSize }, ground },
      spawn: { x: start.x, z: start.z, heading: Math.atan2(t0.x, t0.z) },
      treats: bonuses,
    };
  }

  protected onSetup(): void {
    this.tracker = new GateTracker(this.gates);
    this.frog = new Frog();
    this.scene.add(this.frog.root);
    const legs: Pt[][] = this.crossings.map((cr, i) => {
      const first = cr.steps[0];
      const last = cr.steps[cr.steps.length - 1];
      const dir = Math.sign(last.x - first.x) || 1;
      const hwIn = brookHalfWidth(first.z);
      const hwOut = brookHalfWidth(last.z);
      const z = LEVEL3.legs[i];
      return [
        { x: brookCenterX(z) - dir * (hwIn + 1.0), y: 0, z },
        ...this.stepRefs[i].map((r) => r.pt),
        { x: brookCenterX(z) + dir * (hwOut + 1.0), y: 0, z: z + 0.9 },
      ];
    });
    this.guide = new FrogGuide(legs);
    this.placeFrog(0);
    const p = this.body.pos;
    this.prev = { x: p.x, z: p.z };
    this.safe = { x: p.x, y: p.y, z: p.z, heading: this.hamster.root.rotation.y };
    this.t = 0;
    this.fallT = -1;
    this.faded = false;
    this.graceT = 0;
    this.falls = 0;
    this.fallsAt = this.crossings.map(() => 0);
    this.hinted.clear();
    this.laughCooldown = 0;
    this.cheerCooldown = 0;
    this.lilyWarned = false;
    this.reached = this.crossings.map(() => -1);
    this.bloomK = this.crossings.map(() => 0);
    this.eaten = false;
    this.sinkingBefore.clear();
    this.bias = 0;
  }

  protected canJump(): boolean {
    return this.fallT < 0;
  }

  protected onTreat(t: Treat): void {
    this.events.onCollect(t.spot.kind, 0, 0);
  }

  protected onCelebrate(): void {
    this.hamster.anim.celebrate();
    this.frog.hop();
    this.say('l3finish', true);
  }

  update(dt: number, input: { move: { x: number; y: number }; action: boolean }, cameraYaw: number): void {
    this.t += dt;
    this.movePlatforms(dt);
    this.graceT = Math.max(0, this.graceT - dt);
    const frozen = this.fallT >= 0 || this.graceT > 0;
    if (this.fallT >= 0 && this.body) {
      // no drifting back onto the bank while sinking
      this.body.vel.x = 0;
      this.body.vel.z = 0;
    }
    super.update(dt, frozen ? { move: { x: 0, y: 0 }, action: false } : input, cameraYaw);
  }

  protected onUpdate(dt: number): void {
    this.laughCooldown = Math.max(0, this.laughCooldown - dt);
    this.cheerCooldown = Math.max(0, this.cheerCooldown - dt);
    const pos = this.body.pos;
    (this.water.userData.tick as (t: number) => void)(this.t);
    this.ripples.update(dt);

    if (this.fallT >= 0) this.updateFall(dt);
    else if (!this.eaten) {
      if (inBrook(pos.x, pos.z) && pos.y < FALL_Y) this.startFall();
      else this.rememberSafe();
    }

    // crossings in order (flower on the far bank)
    const passed = this.tracker.update(this.prev, { x: pos.x, z: pos.z });
    this.prev = { x: pos.x, z: pos.z };
    if (passed !== null) {
      this.events.onGoal?.(passed, this.crossings.length);
      this.frog.cheer();
      if (passed < this.crossings.length - 1 && this.cheerCooldown === 0) {
        this.say((['l3cheer1', 'l3cheer2'] as LineId[])[passed % 2]);
      }
      if (this.tracker.isDone()) this.bud.open();
    }
    this.flowers.forEach((f, i) => {
      if (i < this.tracker.passed && this.bloomK[i] < 1) {
        this.bloomK[i] = Math.min(1, this.bloomK[i] + dt * 2);
        f.bloom(this.bloomK[i]);
      }
    });
    this.bud.update(dt);

    // warn about the sinking lily pads before crossing 5
    if (!this.lilyWarned && this.tracker.next === 4) {
      const first = this.crossings[4].steps[0];
      if (Math.hypot(pos.x - first.x, pos.z - first.z) < LILY_WARN) {
        this.lilyWarned = true;
        this.say('l3lily', true);
      }
    }

    this.updateGlow();
    this.updateBias();
    this.guide.update(dt, pos, this.tracker.passed);
    this.placeFrog(dt);

    // the strawberry
    if (!this.eaten && this.bud.isOpen) {
      const d = Math.hypot(pos.x - this.stump.x, pos.z - this.stump.z);
      if (d < BERRY_REACH && Math.abs(pos.y - FINISH_STUMP.top) < 0.5) {
        this.eaten = true;
        this.bud.berry.visible = false;
        this.hamster.anim.puffCheeks();
      }
    }
  }

  protected onDispose(): void {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mt = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
      else mt?.dispose();
    });
    this.frog.dispose();
  }

  // ------------------------------------------------------------------------------------------------

  private movePlatforms(dt: number): void {
    if (!this.physics) return;
    const swing = logOffset(this.t);
    const ground = this.physics.ground!;
    for (const refs of this.stepRefs) {
      for (const r of refs) {
        if (r.kind === 'log') {
          const z = r.spot.z + swing.along;
          const top = r.spot.top + swing.bob;
          moveCollider(r.c, { x: r.c.x, z, height: top - ground(r.c.x, z) }, [this.body], this.physics);
          r.obj.position.set(r.spot.x, swing.bob, z);
          r.obj.rotation.z = Math.sin(this.t * 2.1) * 0.04;
          r.pt.z = z;
          r.pt.y = top;
        } else if (r.lily) {
          const occupied = supportOf(this.body, this.physics) === r.c;
          r.lily.update(dt, occupied);
          if (r.lily.sinking && !this.sinkingBefore.has(r.lily)) {
            this.sinkingBefore.add(r.lily);
            this.events.onSink?.();
          }
          if (!r.lily.sinking) this.sinkingBefore.delete(r.lily);
          const top = r.spot.top - r.lily.drop;
          moveCollider(r.c, { x: r.c.x, z: r.c.z, height: top - ground(r.c.x, r.c.z) }, [this.body], this.physics);
          r.obj.position.y = -r.lily.drop + Math.sin(this.t * 1.7 + r.spot.x) * 0.01;
          const pad = r.obj.userData.pad as THREE.Object3D;
          pad.rotation.z = r.lily.shaking ? Math.sin(this.t * 40) * 0.05 : 0;
          r.pt.y = top;
        }
      }
    }
  }

  /** Last solid place (stone, stump or dry bank) – never a lily pad or the log. */
  private rememberSafe(): void {
    const b = this.body;
    if (!b.grounded) return;
    const sup = supportOf(b, this.physics);
    const heading = this.headingAt(b.pos.x, b.pos.z);
    if (sup && this.staticSteps.has(sup)) {
      this.safe = { x: sup.x, y: b.pos.y, z: sup.z, heading };
    } else if (!sup && !inBrook(b.pos.x, b.pos.z) && b.pos.y > -0.05) {
      // keep bank spots away from the water's edge (on the hamster's side)
      const cx = brookCenterX(b.pos.z);
      const minOff = brookHalfWidth(b.pos.z) + BANK_MARGIN;
      const off = b.pos.x - cx;
      const x = Math.abs(off) < minOff ? cx + Math.sign(off || 1) * minOff : b.pos.x;
      this.safe = { x, y: b.pos.y, z: b.pos.z, heading };
    }
    // which step of the current crossing was reached (for the glow)
    if (sup) {
      const i = this.tracker.next;
      const idx = this.stepRefs[i]?.findIndex((r) => r.c === sup) ?? -1;
      if (idx > this.reached[i]) this.reached[i] = idx;
    }
  }

  private startFall(): void {
    this.fallT = 0;
    this.falls++;
    this.events.onSplash?.();
    this.ripples.spawn(this.body.pos.x, this.body.pos.z, LEVEL3.waterY);
    this.frog.laugh();
    const i = Math.min(this.tracker.next, this.crossings.length - 1);
    this.fallsAt[i]++;
    if (this.fallsAt[i] >= HINT_AFTER && !this.hinted.has(i)) {
      this.hinted.add(i);
      this.say('l3hint', true);
      this.laughCooldown = LAUGH_COOLDOWN;
    } else if (this.laughCooldown === 0) {
      this.laughCooldown = LAUGH_COOLDOWN;
      this.say((['l3laugh1', 'l3laugh2', 'l3laugh3'] as LineId[])[(this.falls - 1) % 3], true);
    }
  }

  private updateFall(dt: number): void {
    this.fallT += dt;
    if (!this.faded && this.fallT >= RESPAWN_AFTER - FADE_LEAD) {
      this.faded = true;
      this.events.onRespawn?.();
    }
    if (this.fallT < RESPAWN_AFTER) return;
    this.fallT = -1;
    this.faded = false;
    this.graceT = RESPAWN_GRACE;
    const b = this.body;
    b.pos.x = this.safe.x;
    b.pos.y = this.safe.y;
    b.pos.z = this.safe.z;
    b.vel.x = b.vel.y = b.vel.z = 0;
    b.grounded = true;
    this.resetHeading(this.safe.heading);
    this.hamster.sync(b, 0);
    this.prev = { x: b.pos.x, z: b.pos.z };
  }

  private headingAt(x: number, z: number): number {
    const t = this.course.tangentAt(this.course.nearestS(x, z));
    return Math.atan2(t.x, t.z);
  }

  private updateGlow(): void {
    const i = this.tracker.next;
    this.stepRefs.forEach((refs, k) => {
      refs.forEach((r, j) => setStepGlow(r.obj, k === i && j === this.reached[k] + 1 && !this.eaten, this.t));
    });
  }

  private updateBias(): void {
    const p = this.body.pos;
    let bias = 0;
    LEVEL3.legs.forEach((z, i) => {
      if (Math.abs(p.z - z) < 2 && Math.abs(p.x - brookCenterX(z)) < brookHalfWidth(z) + 1.5) bias = BIAS * (i % 2 === 0 ? 1 : -1);
    });
    this.bias = bias;
  }

  private placeFrog(dt: number): void {
    const g = this.guide;
    this.frog.root.position.set(g.pos.x, g.pos.y, g.pos.z);
    this.frog.update(dt, g.waiting ? this.hamster.root.position : null, g.hopK, g.heading);
  }

  private say(id: LineId, force = false): void {
    if (!force && this.cheerCooldown > 0) return;
    this.cheerCooldown = CHEER_COOLDOWN;
    this.events.onFriendSay?.(id, this.frog.root);
  }
}
