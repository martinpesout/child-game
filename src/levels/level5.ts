import * as THREE from 'three';
import { Hedgehog } from '../characters/hedgehog';
import { Squirrel } from '../characters/squirrel';
import { Frog } from '../characters/frog';
import { Mole } from '../characters/mole';
import { Cat } from '../characters/cat';
import { buildWorld } from '../world/world';
import { Terrain } from '../world/terrain';
import { hoopColliders, makeHoop, makePath, setGateState } from '../world/garden';
import { makeWater, makeStone, makeLily, makeRipples } from '../world/brook';
import { makeHole } from '../world/burrow';
import { makeCover, makeHideShade, makeHomeFence } from '../world/yard';
import { Underground, type UndergroundEvent } from '../world/underground';
import { moveCollider, supportOf, type Collider } from '../physics/physics';
import type { LineId } from '../audio/lines';
import type { InputState } from '../input/types';
import { GateTracker, type Course, type Gate } from './course';
import { CatWatch } from './catWatch';
import { LilyPad } from './platforms';
import { FALL_Y } from './level3Data';
import { LEVEL5, fenceColliders, inBrook5, inYard, level5Course, level5Ground, level5Hoops, shadeFor } from './level5Data';
import { LevelBase, type ActionMode, type LevelLayout, type Treat } from './levelBase';

const SECTIONS = 5;
const IRIS = 1.0;
const RESPAWN_AFTER = 0.8;
const FADE_LEAD = 0.15;
const GRACE = 0.5;
const FLEE_TIME = 0.6;
const HOLE_REACH = 1.1;
const DOOR_REACH = 1.3;
const FRIEND_GAP = 1.1;

type Place = 'surface' | 'underground';

/** Level 5 – home: hoops in the garden, one brook crossing, under the fence, past the sleeping cat, into the house. */
export class Level5Home extends LevelBase {
  readonly course: Course = level5Course();
  readonly hoops: Gate[] = level5Hoops(this.course);
  /** Icons of the five sections for the HUD. */
  readonly goalIcons = ['hoop', 'stone', 'paw', 'cat', 'house'];
  ug!: Underground;
  watch!: CatWatch;
  /** Sections done (0..5). */
  done = 0;
  falls = 0;
  catches = 0;
  private hoopTracker!: GateTracker;
  private hoopObjs: THREE.Object3D[] = [];
  private group!: THREE.Group;
  private water!: THREE.Mesh;
  private ripples!: ReturnType<typeof makeRipples>;
  private lily!: { c: Collider; obj: THREE.Object3D; pad: LilyPad; top: number };
  private staticSteps = new Set<Collider>();
  private shades: { x: number; z: number; r: number; mesh: THREE.Mesh }[] = [];
  private squirrel!: Squirrel;
  private frog!: Frog;
  private mole!: Mole;
  private hedgehog!: Hedgehog;
  private cat!: Cat;
  private arrow!: THREE.Mesh;
  private placeVal: Place = 'surface';
  private trans: { t: number; to: 'under' | 'exit' | 'back'; done: boolean } | null = null;
  private prevTap = false;
  private prev = { x: 0, z: 0 };
  private t = 0;
  private safe = { x: 0, y: 0, z: 0, heading: 0 };
  private fallT = -1;
  private faded = false;
  private graceT = 0;
  private flee: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private lastShade: { x: number; z: number } | null = null;
  private yardSaid = false;
  private catState = 'sleep';
  private entered = false;
  private finaleT = -1;
  private finaleSaid = 0;

  constructor(private readonly catOpts: ConstructorParameters<typeof CatWatch>[0] = {}) {
    super();
    this.celebrationTime = 6;
  }

  get goal() {
    return { done: this.done, total: SECTIONS, icon: 'hoop' };
  }

  /** The friend who greets and speaks in the current part of the way. */
  get npc(): Squirrel | Frog | Mole | Hedgehog {
    if (this.entered || this.done >= 3) return this.hedgehog;
    if (this.done >= 2) return this.mole;
    if (this.done >= 1) return this.frog;
    return this.squirrel;
  }

  get mode(): 'surface' | 'irisIn' | 'underground' | 'irisOut' {
    if (this.trans) return this.trans.t < IRIS / 2 ? 'irisIn' : 'irisOut';
    return this.placeVal;
  }

  get view3d(): { scene: THREE.Scene; camera: THREE.Camera } | null {
    return this.placeVal === 'underground' && this.ug ? { scene: this.ug.scene, camera: this.ug.camera } : null;
  }

  get iris(): { k: number; center: { x: number; y: number } | null } | null {
    if (!this.trans) return null;
    const p = this.trans.t / IRIS;
    return { k: p < 0.5 ? 1 - 2 * p : 2 * p - 1, center: this.placeVal === 'underground' ? this.ug.hamsterScreen() : null };
  }

  get exitIndicator(): { x: number; y: number; angle: number } | null {
    return this.placeVal === 'underground' && !this.trans ? this.ug.exitIndicator() : null;
  }

  /** Show the ✋ hint: the cat is waking up or looking while the hamster is in the yard. */
  get catHint(): boolean {
    return this.watching() && this.watch.state !== 'sleep';
  }

  override get actionMode(): ActionMode {
    return this.placeVal === 'underground' && !this.trans ? 'dig' : super.actionMode;
  }

  /** Camera for the finale: in front of the house door. */
  get finishShot(): { from: THREE.Vector3; at: THREE.Vector3 } | null {
    if (!this.entered) return null;
    const d = LEVEL5.door;
    return { from: new THREE.Vector3(d.x + 1.2, 2.4, d.z + 5.5), at: new THREE.Vector3(d.x, 0.8, d.z - 0.8) };
  }

  isComplete(): boolean {
    return this.entered;
  }

  resizeUnderground(aspect: number): void {
    this.ug?.resize(aspect);
  }

  protected layout(scene: THREE.Scene): LevelLayout {
    const ground = level5Ground();
    const colliders: Collider[] = [...LEVEL5.props.map((p) => p.collider), ...fenceColliders()];
    for (const g of this.hoops) colliders.push(...hoopColliders(g));
    this.group = new THREE.Group();
    this.staticSteps = new Set();

    // garden: path and hoops
    this.group.add(makePath(this.course, 1.3));
    this.hoopObjs = this.hoops.map((g) => {
      const o = makeHoop(g);
      this.group.add(o);
      return o;
    });

    // brook: water across x, stones and one lily pad
    this.water = makeWater(() => 0, () => LEVEL5.brook.halfWidth, LEVEL3_WATER_Y, LEVEL5.halfSize + 2);
    this.water.rotation.y = Math.PI / 2;
    this.water.position.z = LEVEL5.brook.z;
    this.group.add(this.water);
    LEVEL5.brook.steps.forEach((st, i) => {
      const c: Collider = { kind: 'cylinder', x: st.x, z: st.z, radius: st.r, height: st.top - ground(st.x, st.z) };
      colliders.push(c);
      const obj = st.kind === 'lily' ? makeLily(st.r, st.top) : makeStone(st.r, st.top, i + 1);
      obj.position.set(st.x, 0, st.z);
      this.group.add(obj);
      if (st.kind === 'lily') this.lily = { c, obj, pad: new LilyPad(), top: st.top };
      else this.staticSteps.add(c);
    });
    this.ripples = makeRipples();
    this.group.add(this.ripples.root);

    // fence and the hole under it
    this.group.add(makeHomeFence(LEVEL5.fenceZ, LEVEL5.halfSize));
    const hole = makeHole();
    hole.position.set(LEVEL5.hole.x, 0, LEVEL5.hole.z);
    this.group.add(hole);

    // yard: hiding spots with their shades
    this.shades = LEVEL5.yard.covers.map((cv, i) => {
      const o = makeCover(cv.kind, i + 1);
      o.position.set(cv.x, 0, cv.z);
      this.group.add(o);
      colliders.push({ kind: 'cylinder', x: cv.x, z: cv.z, radius: 0.4, height: 0.9 });
      const s = shadeFor(cv);
      const mesh = makeHideShade(s.r);
      mesh.position.x = s.x;
      mesh.position.z = s.z;
      this.group.add(mesh);
      return { ...s, mesh };
    });
    const cat = LEVEL5.yard.cat;
    colliders.push({ kind: 'cylinder', x: cat.x, z: cat.z, radius: cat.r, height: 1.0 });
    scene.add(this.group);

    const view = buildWorld(scene, {
      halfSize: LEVEL5.halfSize,
      terrain: Terrain.flat(),
      colliders,
      props: LEVEL5.props,
      house: { x: LEVEL5.house.x, z: LEVEL5.house.z, facing: LEVEL5.house.facing },
      avoid: [
        ...LEVEL5.bonuses.map((b) => ({ x: b.x, z: b.z, r: 0.5 })),
        ...this.shades.map((s) => ({ x: s.x, z: s.z, r: s.r })),
        { x: LEVEL5.hole.x, z: LEVEL5.hole.z, r: 0.9 },
        ...Array.from({ length: Math.ceil(this.course.length / 0.8) }, (_, i) => {
          const p = this.course.pointAt(i * 0.8);
          return { x: p.x, z: p.z, r: 0.8 };
        }),
      ],
      exclude: (_x, z) => Math.abs(z - LEVEL5.brook.z) < LEVEL5.brook.halfWidth + 0.2,
    });
    const start = this.course.pointAt(0);
    const t0 = this.course.tangentAt(0);
    return {
      view,
      physics: { colliders, bounds: { halfSize: LEVEL5.halfSize }, ground },
      spawn: { x: start.x, z: start.z, heading: Math.atan2(t0.x, t0.z) },
      treats: LEVEL5.bonuses,
    };
  }

  protected onSetup(): void {
    this.hoopTracker = new GateTracker(this.hoops);
    this.ug = new Underground(LEVEL5.maze);
    this.watch = new CatWatch(this.catOpts);
    // friends along the way
    this.squirrel = new Squirrel();
    this.squirrel.root.position.set(1.6, 0, 16.5);
    this.frog = new Frog();
    this.frog.root.position.set(1.2, 0, LEVEL5.brook.z - LEVEL5.brook.halfWidth - 0.8);
    this.mole = new Mole();
    this.mole.root.position.set(LEVEL5.hole.x + 1.2, 0, LEVEL5.hole.z + 0.3);
    this.hedgehog = new Hedgehog();
    this.hedgehog.root.position.set(-1.6, 0, LEVEL5.fenceZ - 1.3);
    this.cat = new Cat();
    this.cat.root.position.set(LEVEL5.yard.cat.x, 0, LEVEL5.yard.cat.z);
    this.cat.root.rotation.y = -Math.PI / 2 - 0.4;
    this.scene.add(this.squirrel.root, this.frog.root, this.mole.root, this.hedgehog.root, this.cat.root);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 12), new THREE.MeshBasicMaterial({ color: 0xffc93c }));
    this.arrow.geometry.rotateX(Math.PI / 2);
    this.arrow.visible = false;
    this.scene.add(this.arrow);
    const p = this.body.pos;
    this.prev = { x: p.x, z: p.z };
    this.safe = { x: p.x, y: 0, z: p.z, heading: this.hamster.root.rotation.y };
    this.done = 0;
    this.falls = 0;
    this.catches = 0;
    this.placeVal = 'surface';
    this.trans = null;
    this.fallT = -1;
    this.graceT = 0;
    this.flee = null;
    this.lastShade = null;
    this.yardSaid = false;
    this.entered = false;
    this.finaleT = -1;
    this.finaleSaid = 0;
    this.t = 0;
  }

  protected currentAction(): ActionMode {
    if (this.trans || this.placeVal !== 'surface' || this.flee) return 'jump';
    const p = this.body.pos;
    if (this.done >= 2 && Math.hypot(p.x - LEVEL5.hole.x, p.z - LEVEL5.hole.z) < HOLE_REACH && p.z > LEVEL5.fenceZ) return 'enter';
    if (this.done >= 4 && Math.hypot(p.x - LEVEL5.door.x, p.z - LEVEL5.door.z) < DOOR_REACH) return 'enter';
    return 'jump';
  }

  protected onAction(mode: ActionMode): void {
    if (mode !== 'enter') return;
    const p = this.body.pos;
    if (this.done >= 4 && Math.hypot(p.x - LEVEL5.door.x, p.z - LEVEL5.door.z) < DOOR_REACH) {
      this.enterHouse();
      return;
    }
    this.trans = { t: 0, to: 'under', done: false };
  }

  protected canJump(): boolean {
    return this.fallT < 0 && !this.flee;
  }

  protected onTreat(t: Treat): void {
    this.events.onCollect(t.spot.kind, 0, 0);
  }

  protected onCelebrate(): void {
    this.finaleT = 0;
    this.finaleSaid = 0;
    // everyone gathers around the house
    const d = LEVEL5.door;
    const spots: [THREE.Object3D, number, number][] = [
      [this.hedgehog.root, -1.6, 0.6],
      [this.squirrel.root, 1.7, 0.7],
      [this.frog.root, -1.0, 1.7],
      [this.mole.root, 1.0, 1.8],
    ];
    for (const [o, dx, dz] of spots) o.position.set(d.x + dx, 0, d.z + dz);
    this.hedgehog.hop();
    this.squirrel.cheer();
    this.frog.hop();
    this.mole.dance();
  }

  update(dt: number, input: InputState, cameraYaw: number): void {
    this.t += dt;
    if (this.trans) {
      this.trans.t += dt;
      if (!this.trans.done && this.trans.t >= IRIS / 2) {
        this.trans.done = true;
        this.arrive(this.trans.to);
      }
      if (this.trans.t >= IRIS) this.trans = null;
      if (this.placeVal === 'underground') this.ug.update(dt, input.move, false, true);
      else super.update(dt, { move: { x: 0, y: 0 }, action: false }, cameraYaw);
      this.lockAction();
      return;
    }
    if (this.placeVal === 'underground') {
      const tap = input.action && !this.prevTap;
      this.prevTap = input.action;
      for (const e of this.ug.update(dt, input.move, tap)) this.handleUnder(e);
      return;
    }
    this.moveLily(dt);
    this.graceT = Math.max(0, this.graceT - dt);
    const frozen = this.fallT >= 0 || this.graceT > 0 || !!this.flee;
    if (this.fallT >= 0 && this.body) {
      this.body.vel.x = 0;
      this.body.vel.z = 0;
    }
    super.update(dt, frozen ? { move: { x: 0, y: 0 }, action: false } : input, cameraYaw);
  }

  protected onUpdate(dt: number): void {
    const pos = this.body.pos;
    (this.water.userData.tick as (t: number) => void)(this.t);
    this.ripples.update(dt);

    // hoops (garden section)
    if (this.done === 0) {
      const passed = this.hoopTracker.update(this.prev, { x: pos.x, z: pos.z });
      if (passed !== null && this.hoopTracker.isDone()) this.completeSection();
    }
    this.hoopObjs.forEach((o, i) => setGateState(o, i < this.hoopTracker.passed ? 'done' : i === this.hoopTracker.next ? 'next' : 'waiting', this.t));
    this.updateArrow();

    // brook
    if (this.fallT >= 0) this.updateFall(dt);
    else if (!this.entered) {
      if (inBrook5(pos.x, pos.z) && pos.y < FALL_Y) this.startFall();
      else this.rememberSafe();
    }
    if (this.done === 1 && this.body.grounded && pos.z < LEVEL5.brook.z - LEVEL5.brook.halfWidth - 0.2 && pos.y > -0.05) this.completeSection();

    // yard and the cat
    this.updateYard(dt);
    if (this.done === 3 && pos.z < LEVEL5.yardEndZ) this.completeSection();

    // friends idle
    const look = this.hamster.root.position;
    this.squirrel.update(dt, 0, look);
    this.frog.update(dt, look, 0);
    this.mole.update(dt, look);
    this.hedgehog.update(dt, look);
    this.cat.update(dt);

    if (this.finaleT >= 0) this.updateFinale(dt);
    this.prev = { x: pos.x, z: pos.z };
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
    this.arrow.removeFromParent();
    this.arrow.geometry.dispose();
    (this.arrow.material as THREE.Material).dispose();
    for (const c of [this.squirrel, this.frog, this.mole, this.hedgehog, this.cat]) c.dispose();
    this.ug.dispose();
    this.placeVal = 'surface';
    this.trans = null;
  }

  // ------------------------------------------------------------------------------------------------

  private completeSection(): void {
    const i = this.done++;
    this.events.onGoal?.(i, SECTIONS);
    if (i === 0) this.say('l5frog', this.frog.root);
    if (i === 1) this.say('l5mole', this.mole.root);
  }

  private say(id: LineId, obj: THREE.Object3D): void {
    this.events.onFriendSay?.(id, obj);
  }

  private updateArrow(): void {
    const next = this.done === 0 ? this.hoops[this.hoopTracker.next] : undefined;
    const pos = this.hamster.root.position;
    if (!next) {
      this.arrow.visible = false;
      return;
    }
    // show it when the next hoop is behind the hamster (missed) or far off the path
    const dx = next.x - pos.x;
    const dz = next.z - pos.z;
    const behind = dx * next.dirX + dz * next.dirZ < 0;
    this.arrow.visible = behind || Math.hypot(dx, dz) > 6;
    this.arrow.position.set(pos.x, pos.y + 1.15 + Math.sin(this.t * 4) * 0.06, pos.z);
    this.arrow.rotation.y = Math.atan2(dx, dz);
  }

  private moveLily(dt: number): void {
    if (!this.physics) return;
    const l = this.lily;
    const occupied = supportOf(this.body, this.physics) === l.c;
    const wasSinking = l.pad.sinking;
    l.pad.update(dt, occupied);
    if (l.pad.sinking && !wasSinking) this.events.onSink?.();
    const top = l.top - l.pad.drop;
    moveCollider(l.c, { x: l.c.x, z: l.c.z, height: top - this.physics.ground!(l.c.x, l.c.z) }, [this.body], this.physics);
    l.obj.position.y = -l.pad.drop;
    (l.obj.userData.pad as THREE.Object3D).rotation.z = l.pad.shaking ? Math.sin(this.t * 40) * 0.05 : 0;
  }

  private rememberSafe(): void {
    const b = this.body;
    if (!b.grounded) return;
    const sup = supportOf(b, this.physics);
    if (sup && this.staticSteps.has(sup)) this.safe = { x: sup.x, y: b.pos.y, z: sup.z, heading: Math.PI };
    else if (!sup && !inBrook5(b.pos.x, b.pos.z) && b.pos.y > -0.05) {
      // keep bank spots away from the water's edge
      const edge = LEVEL5.brook.halfWidth + 0.7;
      const dz = b.pos.z - LEVEL5.brook.z;
      const z = Math.abs(dz) < edge ? LEVEL5.brook.z + Math.sign(dz || 1) * edge : b.pos.z;
      this.safe = { x: b.pos.x, y: b.pos.y, z, heading: this.hamster.root.rotation.y };
    }
  }

  private startFall(): void {
    this.fallT = 0;
    this.faded = false;
    this.falls++;
    this.events.onSplash?.();
    this.ripples.spawn(this.body.pos.x, this.body.pos.z, LEVEL3_WATER_Y);
    this.frog.laugh();
    this.say('l3laugh2', this.frog.root);
  }

  private updateFall(dt: number): void {
    this.fallT += dt;
    if (!this.faded && this.fallT >= RESPAWN_AFTER - FADE_LEAD) {
      this.faded = true;
      this.events.onRespawn?.();
    }
    if (this.fallT < RESPAWN_AFTER) return;
    this.fallT = -1;
    this.graceT = GRACE;
    this.putAt(this.safe.x, this.safe.y, this.safe.z, this.safe.heading);
  }

  private putAt(x: number, y: number, z: number, heading: number): void {
    const b = this.body;
    b.pos.x = x;
    b.pos.y = y;
    b.pos.z = z;
    b.vel.x = b.vel.y = b.vel.z = 0;
    b.grounded = true;
    this.resetHeading(heading);
    this.hamster.sync(b, 0);
    this.prev = { x, z };
  }

  private arrive(to: 'under' | 'exit' | 'back'): void {
    if (to === 'under') {
      this.placeVal = 'underground';
      this.ug.enter();
      return;
    }
    this.placeVal = 'surface';
    if (to === 'exit') {
      this.putAt(LEVEL5.exitSpot.x, 0, LEVEL5.exitSpot.z, Math.PI);
      if (this.done === 2) this.completeSection();
    } else this.putAt(LEVEL5.hole.x, 0, LEVEL5.hole.z + 1.4, 0);
  }

  private handleUnder(e: UndergroundEvent): void {
    switch (e.type) {
      case 'crack':
        this.events.onDig?.('soil');
        break;
      case 'dig':
        this.events.onDig?.('crumble');
        break;
      case 'blocked':
        this.events.onDig?.('blocked');
        break;
      case 'big':
        this.events.onSqueak?.();
        this.say('l5duck', e.obj ?? this.ug.speaker);
        break;
      case 'item':
        if (e.item) {
          this.bonusTaken++;
          this.events.onCollect(e.item, 0, 0);
        }
        break;
      case 'exit':
        if (!this.trans) this.trans = { t: 0, to: 'exit', done: false };
        break;
      case 'leave':
        if (!this.trans) this.trans = { t: 0, to: 'back', done: false };
        break;
    }
  }

  /** Is the cat game on (hamster in the yard, yard not done yet)? */
  private watching(): boolean {
    if (!this.body || this.placeVal !== 'surface' || this.done !== 3 || this.entered) return false;
    return inYard(this.body.pos.x, this.body.pos.z);
  }

  private updateYard(dt: number): void {
    const pos = this.body.pos;
    const inShade = this.shades.find((s) => Math.hypot(pos.x - s.x, pos.z - s.z) < s.r) ?? null;
    if (inShade) this.lastShade = { x: inShade.x, z: inShade.z };
    this.shades.forEach((s) => (s.mesh.userData.setActive as (on: boolean) => void)(this.catHint && s === inShade));

    if (this.watching()) {
      if (!this.yardSaid) {
        this.yardSaid = true;
        this.say('l5yard', this.hedgehog.root);
      }
      const speed = Math.hypot(this.body.vel.x, this.body.vel.z);
      const r = this.flee ? null : this.watch.update(dt, { speed, hidden: !!inShade });
      if (r === 'caught') this.caught();
    }
    if (this.catState !== this.watch.state && this.watching()) {
      if (this.watch.state === 'sleep' && this.catState === 'look') this.cat.laugh();
      this.catState = this.watch.state;
    }
    this.cat.setState(this.watching() ? this.watch.state : 'sleep', this.watch.progress);

    if (this.flee) {
      this.flee.t += dt;
      const k = Math.min(1, this.flee.t / FLEE_TIME);
      const e = k * k * (3 - 2 * k);
      this.body.pos.x = this.flee.from.x + (this.flee.to.x - this.flee.from.x) * e;
      this.body.pos.z = this.flee.from.z + (this.flee.to.z - this.flee.from.z) * e;
      this.body.pos.y = Math.sin(k * Math.PI) * 0.35;
      this.body.vel.x = (this.flee.to.x - this.flee.from.x) / FLEE_TIME;
      this.body.vel.z = (this.flee.to.z - this.flee.from.z) / FLEE_TIME;
      if (k >= 1) {
        this.flee = null;
        this.putAt(this.body.pos.x, 0, this.body.pos.z, Math.PI);
      }
    }
  }

  private caught(): void {
    this.catches++;
    this.cat.scare();
    this.events.onMeow?.();
    this.say('l5meow', this.cat.root);
    this.hamster.anim.celebrate(); // a startled hop
    const to = this.lastShade ?? LEVEL5.yard.start;
    this.flee = { from: new THREE.Vector3(this.body.pos.x, 0, this.body.pos.z), to: new THREE.Vector3(to.x, 0, to.z), t: 0 };
  }

  private enterHouse(): void {
    this.completeSection();
    this.entered = true;
    this.events.onDoor?.();
    // the hamster pops out of the door to wave at everyone
    this.putAt(LEVEL5.door.x, 0, LEVEL5.door.z - 0.2, 0);
  }

  private updateFinale(dt: number): void {
    this.finaleT += dt;
    const lines: [LineId, THREE.Object3D][] = [
      ['l5home1', this.hedgehog.root],
      ['l5home2', this.squirrel.root],
      ['l5home3', this.frog.root],
      ['l5home4', this.mole.root],
    ];
    while (this.finaleSaid < lines.length && this.finaleT >= 0.4 + this.finaleSaid * FRIEND_GAP) {
      const [id, obj] = lines[this.finaleSaid++];
      this.say(id, obj);
    }
  }
}

/** Drawn water height (same as level 3). */
const LEVEL3_WATER_Y = 0.08;
