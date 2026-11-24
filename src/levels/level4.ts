import * as THREE from 'three';
import { Mole } from '../characters/mole';
import { buildWorld } from '../world/world';
import { Terrain } from '../world/terrain';
import { makeBigTree, makeMound, makeHole, makeMolehill, makeRootFence, makeFallingLeaf } from '../world/burrow';
import { makeTreat } from '../world/treats';
import { Underground, type UndergroundEvent } from '../world/underground';
import type { Collider } from '../physics/physics';
import type { LineId } from '../audio/lines';
import type { InputState } from '../input/types';
import { LEVEL4, penColliders, type Pen } from './level4Data';
import { LEVEL4_MAZES } from './level4Mazes';
import { LevelBase, type ActionMode, type LevelLayout, type Treat } from './levelBase';

const DIG_REACH = 1.1;
const HOLE_REACH = 1.1;
const TAPS = 3;
const IRIS = 1.0; // whole transition (close + open)
const CHEER_COOLDOWN = 8;
const STONE_COOLDOWN = 8;
const PRIZE_TIME = 0.5;

type Place = 'surface' | 'underground';
type Goal = { kind: 'under'; pen: number } | { kind: 'inside'; pen: number } | { kind: 'outside'; pen: number };

interface Mound {
  x: number;
  z: number;
  pen: 0 | 1 | 2;
  left: number;
  view: ReturnType<typeof makeMound>;
}

/** Level 4 – under the big tree: dig out 8 mounds; two of them hide in root pens reachable only through digging mazes. */
export class Level4Tree extends LevelBase {
  /** Undergrounds per pen (kept for the whole level, so dug tunnels stay). */
  ugs: Underground[] = [];
  private mounds: Mound[] = [];
  private group!: THREE.Group;
  private tree!: THREE.Group;
  private holes: THREE.Group[] = [];
  private leaves: ReturnType<typeof makeFallingLeaf>[] = [];
  private mole!: Mole;
  private moleTarget = new THREE.Vector3();
  private moleMoveT = -1;
  private placeVal: Place = 'surface';
  private penIdx = 0;
  private trans: { t: number; goal: Goal; done: boolean } | null = null;
  private prevTap = false;
  private done = 0;
  private t = 0;
  private cheerCooldown = 0;
  private stoneCooldown = 0;
  private prize: { obj: THREE.Object3D; t: number; from: THREE.Vector3 } | null = null;
  private holeSaid = new Set<number>();
  private aspect = 4 / 3;

  constructor() {
    super();
    this.celebrationTime = 3.5;
  }

  get goal() {
    return { done: this.done, total: LEVEL4.mounds.length, icon: 'mound' };
  }

  /** Underground the button is always the paw. */
  override get actionMode(): ActionMode {
    return this.placeVal === 'underground' && !this.trans ? 'dig' : super.actionMode;
  }

  get npc(): Mole {
    return this.mole;
  }

  get mode(): 'surface' | 'irisIn' | 'underground' | 'irisOut' {
    if (this.trans) return this.trans.t < IRIS / 2 ? 'irisIn' : 'irisOut';
    return this.placeVal;
  }

  /** The scene/camera to render instead of the meadow (while underground). */
  get view3d(): { scene: THREE.Scene; camera: THREE.Camera } | null {
    if (this.placeVal !== 'underground') return null;
    const u = this.ugs[this.penIdx];
    return u ? { scene: u.scene, camera: u.camera } : null;
  }

  /** Iris transition for the UI: k = 0 closed … 1 open; centre on screen (0..1) or null = project the surface hamster. */
  get iris(): { k: number; center: { x: number; y: number } | null } | null {
    if (!this.trans) return null;
    const p = this.trans.t / IRIS;
    const k = p < 0.5 ? 1 - 2 * p : 2 * p - 1;
    const center = this.placeVal === 'underground' ? this.ugs[this.penIdx].hamsterScreen() : null;
    return { k, center };
  }

  /** Arrow towards the maze exit when it is out of view (screen 0..1 + angle). */
  get exitIndicator(): { x: number; y: number; angle: number } | null {
    return this.placeVal === 'underground' && !this.trans ? this.ugs[this.penIdx].exitIndicator() : null;
  }

  isComplete(): boolean {
    return this.done >= LEVEL4.mounds.length;
  }

  resizeUnderground(aspect: number): void {
    this.aspect = aspect;
    this.ugs.forEach((u) => u.resize(aspect));
  }

  protected layout(scene: THREE.Scene): LevelLayout {
    const colliders: Collider[] = [...LEVEL4.props.map((p) => p.collider), { kind: 'cylinder', x: LEVEL4.tree.x, z: LEVEL4.tree.z, radius: LEVEL4.tree.r, height: 6 }];
    for (const p of LEVEL4.pens) colliders.push(...penColliders(p));
    this.group = new THREE.Group();
    this.tree = makeBigTree(LEVEL4.tree.r);
    this.tree.position.set(LEVEL4.tree.x, 0, LEVEL4.tree.z);
    this.group.add(this.tree);
    this.mounds = LEVEL4.mounds.map((m, i) => {
      const view = makeMound(i + 1);
      view.root.position.set(m.x, 0, m.z);
      this.group.add(view.root);
      return { ...m, left: TAPS, view };
    });
    this.holes = [];
    for (const p of LEVEL4.pens) {
      this.group.add(makeRootFence(p));
      const h = makeHole();
      h.position.set(p.hole.x, 0, p.hole.z);
      this.group.add(h);
      this.holes.push(h);
      for (const spot of [p.inside, p.back]) {
        const mh = makeMolehill();
        mh.position.set(spot.x, 0, spot.z);
        this.group.add(mh);
      }
    }
    const crown = new THREE.Vector3(LEVEL4.tree.x, 5.5, LEVEL4.tree.z);
    this.leaves = Array.from({ length: 6 }, (_, i) => makeFallingLeaf(i + 1, crown));
    this.leaves.forEach((l) => this.group.add(l.root));
    scene.add(this.group);

    const view = buildWorld(scene, {
      halfSize: LEVEL4.halfSize,
      terrain: Terrain.flat(),
      colliders,
      props: LEVEL4.props,
      avoid: [
        ...LEVEL4.mounds.map((m) => ({ x: m.x, z: m.z, r: 0.8 })),
        ...LEVEL4.pens.flatMap((p) => [p.hole, p.inside, p.back].map((s) => ({ x: s.x, z: s.z, r: 0.8 }))),
        { x: LEVEL4.bonus.x, z: LEVEL4.bonus.z, r: 0.5 },
        { x: LEVEL4.moleHome.x, z: LEVEL4.moleHome.z, r: 0.7 },
      ],
    });
    view.occluders.push(this.tree);
    return {
      view,
      physics: { colliders, bounds: { halfSize: LEVEL4.halfSize } },
      spawn: { x: LEVEL4.spawn.x, z: LEVEL4.spawn.z, heading: Math.PI },
      treats: [{ kind: LEVEL4.bonus.kind, x: LEVEL4.bonus.x, z: LEVEL4.bonus.z, y: 0 }],
    };
  }

  protected onSetup(): void {
    this.mole = new Mole();
    this.mole.root.position.set(LEVEL4.moleHome.x, 0, LEVEL4.moleHome.z);
    this.moleTarget.copy(this.mole.root.position);
    this.scene.add(this.mole.root);
    this.ugs = LEVEL4_MAZES.map((d) => {
      const u = new Underground(d);
      u.resize(this.aspect);
      return u;
    });
    this.placeVal = 'surface';
    this.penIdx = 0;
    this.trans = null;
    this.prevTap = false;
    this.done = 0;
    this.t = 0;
    this.cheerCooldown = 0;
    this.stoneCooldown = 0;
    this.prize = null;
    this.holeSaid.clear();
    this.moleMoveT = -1;
  }

  protected currentAction(): ActionMode {
    if (this.trans || this.placeVal !== 'surface') return 'jump';
    const p = this.body.pos;
    if (this.nearestMound(p.x, p.z)) return 'dig';
    if (this.nearSpot('hole') !== null || this.nearSpot('back') !== null) return 'enter';
    return 'jump';
  }

  protected onAction(mode: ActionMode): void {
    const p = this.body.pos;
    if (mode === 'dig') {
      const m = this.nearestMound(p.x, p.z);
      if (m) this.digMound(m);
    } else if (mode === 'enter') {
      const hole = this.nearSpot('hole');
      if (hole !== null) this.startTrans({ kind: 'under', pen: hole });
      else {
        const back = this.nearSpot('back');
        if (back !== null) this.startTrans({ kind: 'outside', pen: back });
      }
    }
  }

  protected onTreat(t: Treat): void {
    this.events.onCollect(t.spot.kind, 0, 0);
  }

  protected onCelebrate(): void {
    this.hamster.anim.celebrate();
    this.mole.dance();
    this.moleTarget.set(this.body.pos.x + 1.3, 0, this.body.pos.z - 0.6);
    this.mole.root.position.copy(this.moleTarget);
    this.say('l4finish', true);
  }

  update(dt: number, input: InputState, cameraYaw: number): void {
    this.t += dt;
    this.cheerCooldown = Math.max(0, this.cheerCooldown - dt);
    this.stoneCooldown = Math.max(0, this.stoneCooldown - dt);
    if (this.trans) {
      this.trans.t += dt;
      if (!this.trans.done && this.trans.t >= IRIS / 2) {
        this.trans.done = true;
        this.arrive(this.trans.goal);
      }
      if (this.trans.t >= IRIS) this.trans = null;
      this.prevTap = input.action;
      if (this.placeVal === 'underground') this.ugs[this.penIdx].update(dt, { x: 0, y: 0 }, false);
      else super.update(dt, { move: { x: 0, y: 0 }, action: false }, cameraYaw);
      return;
    }
    if (this.placeVal === 'underground') {
      const tap = input.action && !this.prevTap;
      this.prevTap = input.action;
      const ev = this.ugs[this.penIdx].update(dt, input.move, tap);
      for (const e of ev) this.handleUnder(e);
      return;
    }
    super.update(dt, input, cameraYaw);
  }

  protected onUpdate(dt: number): void {
    (this.tree.userData.tick as (t: number) => void)(this.t);
    this.holes.forEach((h) => (h.userData.tick as (t: number) => void)(this.t));
    this.leaves.forEach((l) => l.update(dt));
    for (const m of this.mounds) m.view.shake(this.t);
    this.updatePrize(dt);
    this.updateMole(dt);
    // hint when standing at a hole for the first time
    const hole = this.nearSpot('hole');
    if (hole !== null && !this.holeSaid.has(hole)) {
      this.holeSaid.add(hole);
      this.say('l4hole', true);
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
    this.prize?.obj.removeFromParent();
    this.prize = null;
    this.mole.dispose();
    this.ugs.forEach((u) => u.dispose());
    this.ugs = [];
    this.placeVal = 'surface';
    this.trans = null;
  }

  // ------------------------------------------------------------------------------------------------

  private nearestMound(x: number, z: number): Mound | null {
    let best: Mound | null = null;
    let bd = DIG_REACH;
    for (const m of this.mounds) {
      if (m.left <= 0) continue;
      const d = Math.hypot(m.x - x, m.z - z);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  private nearSpot(which: 'hole' | 'back'): number | null {
    const p = this.body.pos;
    for (let i = 0; i < LEVEL4.pens.length; i++) {
      const s = LEVEL4.pens[i][which];
      if (Math.hypot(s.x - p.x, s.z - p.z) < (which === 'hole' ? HOLE_REACH : DIG_REACH)) return i;
    }
    return null;
  }

  private digMound(m: Mound): void {
    m.left--;
    m.view.setLeft(m.left);
    this.events.onDig?.('mound');
    if (m.left > 0) return;
    const idx = this.done++;
    this.events.onGoal?.(idx, LEVEL4.mounds.length);
    this.hamster.anim.puffCheeks();
    // a treasure pops out and flies into the hamster's cheeks
    const kinds = ['nut', 'nut', 'nut'] as const;
    const obj = makeTreat(kinds[idx % kinds.length], this.kit);
    obj.scale.multiplyScalar(1.8);
    obj.position.set(m.x, 0.3, m.z);
    this.scene.add(obj);
    this.prize?.obj.removeFromParent();
    this.prize = { obj, t: 0, from: obj.position.clone() };
    if (!this.isComplete() && this.cheerCooldown === 0) this.say(idx % 2 ? 'l4cheer2' : 'l4cheer1');
  }

  private updatePrize(dt: number): void {
    if (!this.prize) return;
    const pr = this.prize;
    pr.t += dt;
    const k = Math.min(1, pr.t / PRIZE_TIME);
    const target = this.hamster.root.position.clone().add(new THREE.Vector3(0, 0.45, 0));
    pr.obj.position.lerpVectors(pr.from, target, k * k);
    pr.obj.position.y += Math.sin(k * Math.PI) * 0.8;
    pr.obj.scale.setScalar(1.8 * (1 - k * 0.8));
    if (k >= 1) {
      pr.obj.removeFromParent();
      this.prize = null;
    }
  }

  private startTrans(goal: Goal): void {
    if (this.trans) return;
    this.trans = { t: 0, goal, done: false };
  }

  /** Midpoint of the iris: swap the world. */
  private arrive(goal: Goal): void {
    const pen = LEVEL4.pens[goal.pen];
    if (goal.kind === 'under') {
      this.placeVal = 'underground';
      this.penIdx = goal.pen;
      this.ugs[goal.pen].enter();
      return;
    }
    this.placeVal = 'surface';
    if (goal.kind === 'inside') this.putOnSurface(pen.inside.x, pen.inside.z, Math.atan2(pen.x - pen.inside.x, pen.z - pen.inside.z));
    else {
      // just outside the hole, facing away from the pen
      const dx = pen.hole.x - pen.x;
      const dz = pen.hole.z - pen.z;
      const l = Math.hypot(dx, dz) || 1;
      this.putOnSurface(pen.hole.x + (dx / l) * 1.1, pen.hole.z + (dz / l) * 1.1, Math.atan2(dx, dz));
    }
  }

  private putOnSurface(x: number, z: number, heading: number): void {
    const b = this.body;
    b.pos.x = x;
    b.pos.y = 0;
    b.pos.z = z;
    b.vel.x = b.vel.y = b.vel.z = 0;
    b.grounded = true;
    this.resetHeading(heading);
    this.hamster.sync(b, 0);
  }

  private handleUnder(e: UndergroundEvent): void {
    switch (e.type) {
      case 'crack':
      case 'dig':
        this.events.onDig?.('soil');
        break;
      case 'blocked':
        this.events.onDig?.('blocked');
        if (this.stoneCooldown === 0) {
          this.stoneCooldown = STONE_COOLDOWN;
          this.sayUnder('l4stone');
        }
        break;
      case 'big':
        this.stoneCooldown = STONE_COOLDOWN;
        this.sayUnder(e.big === 'chest' ? 'l4chest' : e.big === 'dino' ? 'l4dino' : 'l4stone', e.obj);
        break;
      case 'item':
        if (e.item) {
          this.bonusTaken++;
          this.events.onCollect(e.item, 0, 0);
        }
        break;
      case 'friend':
        this.sayUnder(e.friend === 'worm' ? 'l4worm' : 'l4beetle', e.obj);
        break;
      case 'exit':
        this.startTrans({ kind: 'inside', pen: this.penIdx });
        break;
      case 'leave':
        this.startTrans({ kind: 'outside', pen: this.penIdx });
        break;
    }
  }

  /** The mole pops up near the next unfinished place (closest mound outside, or the hole of an unfinished pen). */
  private updateMole(dt: number): void {
    const look = this.hamster.root.position;
    if (!this.isComplete()) {
      const target = this.moleSpot();
      if (target && target.distanceTo(this.moleTarget) > 0.5 && this.moleMoveT < 0) {
        this.moleTarget.copy(target);
        this.moleMoveT = 0;
        this.mole.peek(false);
      }
    }
    if (this.moleMoveT >= 0) {
      this.moleMoveT += dt;
      if (this.moleMoveT > 0.6) {
        this.mole.root.position.copy(this.moleTarget);
        this.mole.peek(true);
        this.moleMoveT = -1;
      }
    }
    this.mole.update(dt, look);
  }

  private moleSpot(): THREE.Vector3 | null {
    const p = this.body.pos;
    let best: { x: number; z: number } | null = null;
    let bd = Infinity;
    const consider = (x: number, z: number) => {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < bd) {
        bd = d;
        best = { x, z };
      }
    };
    for (const m of this.mounds) if (m.left > 0 && m.pen === 0) consider(m.x, m.z);
    LEVEL4.pens.forEach((pen: Pen, i) => {
      if (this.mounds.some((m) => m.pen === i + 1 && m.left > 0)) consider(pen.hole.x, pen.hole.z);
    });
    if (!best) return null;
    const b = best as { x: number; z: number };
    // beside the spot, a little towards the hamster
    const dx = p.x - b.x;
    const dz = p.z - b.z;
    const l = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(b.x + (dz / l) * 1.2, 0, b.z - (dx / l) * 1.2);
  }

  private say(id: LineId, force = false): void {
    if (!force && this.cheerCooldown > 0) return;
    this.cheerCooldown = CHEER_COOLDOWN;
    this.events.onFriendSay?.(id, this.mole.root);
  }

  private sayUnder(id: LineId, obj?: THREE.Object3D): void {
    this.events.onFriendSay?.(id, obj ?? this.ugs[this.penIdx].speaker);
  }
}
