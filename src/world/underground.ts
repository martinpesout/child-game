import * as THREE from 'three';
import { Hamster } from '../characters/hamster';
import { PartKit } from '../characters/parts';
import { Worm, Beetle } from '../characters/critters4';
import { MazeGrid, toDir, type BigKind, type MazeDef } from '../levels/maze';
import { makeTreat } from './treats';
import { makeChest, makeDino } from './buried';
import { DirtFx } from './digfx';
import { makeRootBand } from './roots';
import type { Body } from '../physics/physics';
import type { ItemKind } from '../levels/level1Data';

/** Underground "ant farm" diorama: a slice of soil with the digging maze, seen from the side. */

export type UndergroundEvent = {
  type: 'dig' | 'crack' | 'blocked' | 'item' | 'friend' | 'big' | 'exit' | 'leave';
  item?: ItemKind;
  friend?: 'worm' | 'beetle';
  big?: BigKind;
  /** Object to attach a speech bubble to. */
  obj?: THREE.Object3D;
};

const C = 0.6; // cell size
const D = 0.7; // slice depth
const MOVE_TIME = 0.2;
const BIG_REPEAT = 6;
const BLOCKED_REPEAT = 0.6;
const INTRO = 1.6;
/** Farthest the camera may sit; beyond this the hamster gets too small, so the camera pans instead. */
const MAX_DIST = 9.5;
const FOV = 50;

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts });

export class Underground {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 4 / 3, 0.1, 100);
  readonly grid: MazeGrid;
  readonly exitCell: { x: number; y: number };
  worm: Worm | null = null;
  beetle: Beetle | null = null;
  private readonly hamster = new Hamster();
  private readonly body: Body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
  private readonly kit = new PartKit();
  private readonly blocks = new Map<string, THREE.Mesh>();
  private readonly treats = new Map<string, THREE.Object3D>();
  private readonly soilMat = mat(0xa0703f);
  private readonly soilMat2 = mat(0x96683a);
  private readonly crackMat = mat(0x8a5d33);
  private readonly roots: THREE.Object3D[] = [];
  private readonly crumbs: { m: THREE.Mesh; v: THREE.Vector3; t: number }[] = [];
  private readonly crumbGeo = new THREE.DodecahedronGeometry(0.04);
  private readonly highlight: THREE.LineSegments;
  private readonly sunbeam: THREE.Mesh;
  private skull: THREE.Object3D | null = null;
  private skullT = -1;
  private aspect = 4 / 3;
  private dist = 8;
  private pan = false;
  private camX = 0;
  private t = 0;
  private introT = -1;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private moveT = -1;
  private yaw = Math.PI / 2;
  private bigCooldown = 0;
  private blockedCooldown = 0;
  private met = new Set<string>();
  /** After entering, the joystick must be let go once (a held stick must not climb straight back out). */
  private needNeutral = false;
  private readonly fx: DirtFx;

  constructor(def: MazeDef) {
    this.grid = new MazeGrid(def);
    const ex = def.rows[0].indexOf('E');
    this.exitCell = { x: ex, y: 0 };
    this.build(def);
    this.fx = new DirtFx(this.scene);
    this.scene.add(this.hamster.root);
    this.highlight = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(C * 0.96, C * 0.96, D * 1.02)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    this.scene.add(this.highlight);
    this.sunbeam = new THREE.Mesh(
      new THREE.CylinderGeometry(C * 0.45, C * 0.8, 3, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
    );
    const top = this.cellCenter(this.exitCell.x, this.exitCell.y);
    this.sunbeam.position.set(top.x, top.y + C / 2 + 1.5, 0);
    this.scene.add(this.sunbeam);
    this.resize(4 / 3);
    this.place();
  }

  /** World centre of grid cell (x, y); row 0 is the roots row just under the grass. */
  cellCenter(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(x * C, -y * C, 0);
  }

  /** Who gives hints down here (the worm or the beetle). */
  get speaker(): THREE.Object3D {
    return (this.worm ?? this.beetle)?.root ?? this.hamster.root;
  }

  get moving(): boolean {
    return this.moveT >= 0;
  }

  hamsterWorld(): THREE.Vector3 {
    return this.hamster.root.position.clone().add(new THREE.Vector3(0, 0.25, 0));
  }

  /** Hamster position on screen (0..1) – the centre of the iris transition. */
  hamsterScreen(): { x: number; y: number } {
    const p = this.hamsterWorld().project(this.camera);
    return { x: p.x * 0.5 + 0.5, y: -p.y * 0.5 + 0.5 };
  }

  /** Arrow at the screen edge towards the exit while it is out of view (null when visible). */
  exitIndicator(): { x: number; y: number; angle: number } | null {
    const p = this.cellCenter(this.exitCell.x, this.exitCell.y).project(this.camera);
    if (Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95) return null;
    const angle = Math.atan2(p.y, p.x);
    const k = 0.9 / Math.max(Math.abs(p.x), Math.abs(p.y));
    return { x: (p.x * k) * 0.5 + 0.5, y: (-p.y * k) * 0.5 + 0.5, angle };
  }

  resize(aspect: number): void {
    this.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const w = this.grid.cols * C + 1.2;
    const h = (this.grid.rows + 2.5) * C;
    const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);
    const needW = w / 2 / (tanV * aspect);
    const needH = h / 2 / tanV;
    const need = Math.max(needW, needH);
    this.pan = need > MAX_DIST;
    this.dist = Math.min(need, MAX_DIST);
  }

  /** Put the hamster on the entry, facing into the maze; the camera shows the exit first if it pans. */
  enter(): void {
    this.grid.pos = { ...this.grid.def.entry };
    this.grid.facing = { x: 1, y: 0 };
    this.yaw = Math.PI / 2;
    this.moveT = -1;
    this.introT = this.pan ? 0 : -1;
    this.needNeutral = true;
    this.place();
    this.camX = this.pan ? this.cellCenter(this.exitCell.x, 0).x : this.centerX();
    this.updateCamera(0, true);
  }

  /** Test helper: teleport onto a cell (made open). */
  debugPlace(x: number, y: number): void {
    const key = `${x},${y}`;
    const b = this.blocks.get(key);
    if (b) {
      b.removeFromParent();
      this.blocks.delete(key);
    }
    (this.grid as unknown as { kinds: string[][] }).kinds[y][x] = 'open';
    this.grid.pos = { x, y };
    this.moveT = -1;
    this.place();
  }

  /** `frozen` (during the iris): no moving or digging, only animations and noticing the stick being let go. */
  update(dt: number, move: { x: number; y: number }, tap: boolean, frozen = false): UndergroundEvent[] {
    const ev: UndergroundEvent[] = [];
    this.t += dt;
    this.bigCooldown = Math.max(0, this.bigCooldown - dt);
    this.blockedCooldown = Math.max(0, this.blockedCooldown - dt);

    if (this.moveT >= 0) {
      this.moveT += dt;
      const k = Math.min(1, this.moveT / MOVE_TIME);
      const p = this.from.clone().lerp(this.to, k);
      this.body.pos.x = p.x;
      this.body.pos.y = p.y;
      this.body.vel.x = 2;
      if (k >= 1) {
        this.moveT = -1;
        // walking into an exit dug earlier also leads out (e.g. coming back to the pen)
        if (this.grid.exited && this.grid.pos.x === this.exitCell.x && this.grid.pos.y === this.exitCell.y) ev.push({ type: 'exit' });
      }
    } else {
      this.body.vel.x = 0;
      let dir = toDir(move);
      if (frozen) {
        if (!dir) this.needNeutral = false;
        dir = null;
        tap = false;
      } else if (this.needNeutral) {
        if (!dir) this.needNeutral = false;
        dir = null;
      }
      if (dir) {
        if (dir.y === -1 && this.grid.atEntry()) ev.push({ type: 'leave' });
        else {
          if (dir.x) this.yaw = dir.x > 0 ? Math.PI / 2 : -Math.PI / 2;
          const r = this.grid.move(dir.x, dir.y);
          if (r === 'moved') {
            this.from.set(this.body.pos.x, this.body.pos.y, 0);
            const c = this.feet(this.grid.pos.x, this.grid.pos.y);
            this.to.copy(c);
            this.moveT = 0;
          } else if (r === 'blocked' && this.blockedCooldown === 0) {
            this.blockedCooldown = BLOCKED_REPEAT;
          }
        }
      }
      if (tap) this.dig(ev);
    }

    this.meetFriends(ev);
    this.hamster.face(this.yaw);
    this.hamster.sync(this.body, dt);
    this.hamster.root.position.set(this.body.pos.x, this.body.pos.y, 0);
    // tilt when facing up/down
    this.hamster.root.rotation.x = this.grid.facing.y === 0 ? 0 : this.grid.facing.y < 0 ? -0.5 : 0.4;

    this.ambient(dt);
    this.updateCamera(dt, false);
    return ev;
  }

  dispose(): void {
    this.hamster.dispose();
    this.fx.dispose();
    this.worm?.dispose();
    this.beetle?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mt = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
      else mt?.dispose();
    });
    this.crumbGeo.dispose();
    this.kit.dispose();
    this.scene.clear();
  }

  // ------------------------------------------------------------------------------------------------

  private feet(x: number, y: number): THREE.Vector3 {
    return this.cellCenter(x, y).add(new THREE.Vector3(0, -C / 2 + 0.02, 0));
  }

  private place(): void {
    const f = this.feet(this.grid.pos.x, this.grid.pos.y);
    this.body.pos.x = f.x;
    this.body.pos.y = f.y;
    this.hamster.root.position.set(f.x, f.y, 0);
  }

  private dig(ev: UndergroundEvent[]): void {
    const r = this.grid.dig();
    const key = `${r.x},${r.y}`;
    if (r.result === 'cracked') {
      ev.push({ type: 'crack' });
      const b = this.blocks.get(key);
      if (b) b.material = this.crackMat;
      this.dirt(r.x, r.y, 0.8);
    } else if (r.result === 'dug' || r.result === 'exit') {
      ev.push({ type: r.result === 'exit' ? 'exit' : 'dig' });
      const b = this.blocks.get(key);
      if (b) {
        b.removeFromParent();
        this.blocks.delete(key);
      }
      this.dirt(r.x, r.y, 1.1);
      if (r.item) {
        ev.push({ type: 'item', item: r.item });
        const t = this.treats.get(key);
        t?.removeFromParent();
        this.treats.delete(key);
        this.hamster.anim.puffCheeks();
      }
    } else if (r.result === 'blocked') {
      ev.push({ type: 'blocked' });
      if (r.bigKind && this.bigCooldown === 0) {
        this.bigCooldown = BIG_REPEAT;
        ev.push({ type: 'big', big: r.bigKind, obj: this.hamster.root });
        if (r.bigKind === 'dino') {
          this.skullT = 0;
          this.beetle?.startle();
        }
      }
    }
  }

  private meetFriends(ev: UndergroundEvent[]): void {
    for (const f of this.grid.def.friends) {
      const key = `${f.kind}`;
      if (this.met.has(key)) continue;
      const d = Math.abs(f.x - this.grid.pos.x) + Math.abs(f.y - this.grid.pos.y);
      if (d <= 1) {
        this.met.add(key);
        const obj = f.kind === 'worm' ? this.worm?.root : this.beetle?.root;
        if (f.kind === 'beetle') this.beetle?.wake();
        ev.push({ type: 'friend', friend: f.kind, obj });
      }
    }
  }

  private centerX(): number {
    return ((this.grid.cols - 1) * C) / 2;
  }

  private updateCamera(dt: number, snap: boolean): void {
    const midY = -((this.grid.rows - 1) * C) / 2 + C * 0.9;
    let want = this.centerX();
    if (this.pan) {
      const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);
      const halfW = this.dist * tanV * this.aspect;
      const min = -C + halfW - 0.3;
      const max = this.grid.cols * C - halfW + 0.3 - C;
      let target = this.hamster.root.position.x;
      if (this.introT >= 0) {
        this.introT += dt;
        target = this.introT < INTRO * 0.6 ? this.cellCenter(this.exitCell.x, 0).x : target;
        if (this.introT >= INTRO) this.introT = -1;
      }
      want = min > max ? this.centerX() : Math.max(min, Math.min(max, target));
    }
    this.camX = snap ? want : this.camX + (want - this.camX) * Math.min(1, dt * 4);
    this.camera.position.set(this.camX, midY + this.dist * 0.18, this.dist);
    this.camera.lookAt(this.camX, midY, 0);
    this.camera.updateMatrixWorld();
  }

  /** Paw scrape at cell (x, y): the hamster leans in, earth flies out behind it and dust rises. */
  private dirt(x: number, y: number, strength: number): void {
    this.hamster.anim.dig();
    const c = this.cellCenter(x, y);
    const feet = this.feet(this.grid.pos.x, this.grid.pos.y);
    // thrown backwards along the tunnel (away from where the hamster faces)
    const back = new THREE.Vector3(this.yaw > 0 ? -1 : 1, 0, 0);
    const at = new THREE.Vector3((c.x + feet.x) / 2, feet.y + 0.1, D / 2 - 0.1);
    this.fx.burst(at, back, feet.y, strength * 0.8);
  }


  private ambient(dt: number): void {
    for (const c of this.crumbs) {
      c.t += dt;
      c.v.y -= 6 * dt;
      c.m.position.addScaledVector(c.v, dt);
    }
    while (this.crumbs.length && this.crumbs[0].t > 0.8) this.crumbs.shift()!.m.removeFromParent();
    this.roots.forEach((r, i) => (r.rotation.z = Math.sin(this.t * 1.3 + i) * 0.08));
    (this.sunbeam.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.15 * Math.sin(this.t * 3) + (this.introT >= 0 ? 0.2 : 0);
    this.fx.update(dt);
    this.worm?.update(dt);
    this.beetle?.update(dt);
    if (this.skull && this.skullT >= 0) {
      this.skullT += dt;
      this.skull.rotation.x = Math.abs(Math.sin(this.skullT * 18)) * 0.35 * (1 - this.skullT / 0.9);
      if (this.skullT > 0.9) {
        this.skullT = -1;
        this.skull.rotation.x = 0;
      }
    }
    // highlight the cell the hamster faces when it can be dug
    const fx = this.grid.pos.x + this.grid.facing.x;
    const fy = this.grid.pos.y + this.grid.facing.y;
    const k = this.grid.kind(fx, fy);
    this.highlight.visible = k === 'soil' || k === 'exit';
    if (this.highlight.visible) this.highlight.position.copy(this.cellCenter(fx, fy));
  }

  private build(def: MazeDef): void {
    const s = this.scene;
    s.background = new THREE.Color(0xbfe6ff);
    s.add(new THREE.HemisphereLight(0xffffff, 0x8a6a4a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(3, 6, 8);
    s.add(sun);

    const cols = this.grid.cols;
    const rows = this.grid.rows;
    const box = new THREE.BoxGeometry(C * 0.94, C * 0.94, D);
    const left = -C / 2 - 0.6;
    const right = cols * C - C / 2 + 0.6;
    const width = right - left;
    const cx = (left + right) / 2;

    // back wall of the tunnels and a soil frame around the maze
    const back = new THREE.Mesh(new THREE.PlaneGeometry(width, rows * C + 0.6), mat(0x5b3a22));
    back.position.set(cx, -((rows - 1) * C) / 2 - 0.3, -D / 2);
    s.add(back);
    const frame = mat(0x9b6a43);
    for (const x of [left + 0.3, right - 0.3]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.6, rows * C + 0.6, D), frame);
      side.position.set(x, -((rows - 1) * C) / 2 - 0.3, 0);
      s.add(side);
    }
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, D), frame);
    bottom.position.set(cx, -rows * C + C / 2 - 0.3, 0);
    s.add(bottom);

    // grass strip, a tree and the sun above
    const grass = new THREE.Mesh(new THREE.BoxGeometry(width + 4, 0.18, D + 0.6), mat(0x86c95e));
    grass.position.set(cx, C / 2 + 0.09, 0);
    s.add(grass);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 10), mat(0x8a5a35));
    trunk.position.set(left + 1.2, C / 2 + 1.1, -0.6);
    s.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), mat(0x5aa845));
    crown.position.set(left + 1.2, C / 2 + 2.6, -0.6);
    s.add(crown);
    for (let i = 0; i < 24; i++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 4), mat(0x5aa845));
      blade.position.set(left + (i / 24) * width, C / 2 + 0.3, D / 2 + 0.1);
      s.add(blade);
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = this.grid.kind(x, y);
        const c = this.cellCenter(x, y);
        const key = `${x},${y}`;
        if (k === 'soil' || k === 'exit') {
          const b = new THREE.Mesh(box, k === 'exit' ? mat(0xb8834f, { emissive: 0xffc54a, emissiveIntensity: 0.35 }) : (x + y) % 2 ? this.soilMat2 : this.soilMat);
          b.position.copy(c);
          b.userData.soil = true;
          s.add(b);
          this.blocks.set(key, b);
        } else if (k === 'stone') {
          const b = new THREE.Mesh(box, this.soilMat);
          b.position.copy(c);
          s.add(b);
          const st = new THREE.Mesh(new THREE.DodecahedronGeometry(C * 0.42), mat(0xb9b2a6, { flatShading: true }));
          st.scale.set(1, 0.8, 0.7);
          st.position.set(c.x, c.y, D / 2 - 0.05);
          s.add(st);
        } else if (k === 'roots') {
          const b = new THREE.Mesh(box, mat(0x7a5131));
          b.position.copy(c);
          s.add(b);
        } else if (k === 'big') {
          const b = new THREE.Mesh(box, this.soilMat);
          b.position.copy(c);
          s.add(b);
        }
        const item = this.grid.itemIn(x, y);
        if (item) {
          const t = makeTreat(item, this.kit);
          t.scale.multiplyScalar(1.6);
          t.position.set(c.x, c.y - 0.1, D / 2 - 0.02);
          s.add(t);
          this.treats.set(key, t);
        }
      }
    }
    // entry shaft through the roots above the entry
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(C * 0.8, C * (def.entry.y + 0.2), 0.02), mat(0x3e2614));
    shaft.position.set(def.entry.x * C, -((def.entry.y - 1) * C) / 2 + 0.05, D / 2 + 0.01);
    s.add(shaft);
    // flower above the exit
    const ex = this.cellCenter(this.exitCell.x, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 6), mat(0x4e9a3a));
    stem.position.set(ex.x, C / 2 + 0.38, D / 2);
    s.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xffd84d));
    bloom.position.set(ex.x, C / 2 + 0.6, D / 2);
    s.add(bloom);

    // network of roots under the grass (not over the entry shaft or the exit), rootlets dangling below
    const band = makeRootBand(left + 0.6, right - 0.6, C / 2, C, [def.entry.x * C, this.exitCell.x * C], 3, D / 2 + 0.04);
    s.add(band);
    this.roots.push(...(band.userData.hanging as THREE.Object3D[]));

    for (const big of def.bigs) this.buildBig(big);

    for (const f of def.friends) {
      const c = this.feet(f.x, f.y);
      if (f.kind === 'worm') {
        this.worm = new Worm();
        this.worm.root.position.set(c.x, c.y, 0.1);
        s.add(this.worm.root);
      } else {
        this.beetle = new Beetle();
        this.beetle.root.position.set(c.x, c.y, 0.05);
        this.beetle.root.rotation.y = -Math.PI / 2;
        s.add(this.beetle.root);
      }
    }
  }

  private buildBig(big: MazeDef['bigs'][number]): void {
    const s = this.scene;
    const c0 = this.cellCenter(big.x, big.y);
    const cx = c0.x + ((big.w - 1) * C) / 2;
    const cy = c0.y - ((big.h - 1) * C) / 2;
    const z = D / 2 - 0.02;
    const g = new THREE.Group();
    g.position.set(cx, cy, z);
    s.add(g);
    if (big.kind === 'chest') {
      g.add(makeChest(big.w * C * 0.92, big.h * C * 0.9));
    } else if (big.kind === 'dino') {
      const dino = makeDino(big.w * C * 0.95, big.h * C);
      g.add(dino);
      this.skull = dino.userData.jaw as THREE.Object3D;
    } else if (big.kind === 'boot') {
      const boot = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 10), mat(0x3f8f4f));
      shaft.position.y = 0.05;
      boot.add(shaft);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.22), mat(0x3f8f4f));
      foot.position.set(0.09, -0.12, 0);
      boot.add(foot);
      boot.rotation.z = 0.5;
      g.add(boot);
    } else if (big.kind === 'can') {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 14), mat(0xc0c6cc, { metalness: 0.6, roughness: 0.4 }));
      can.rotation.z = Math.PI / 2 - 0.3;
      g.add(can);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.14, 14), mat(0xe8384f));
      label.rotation.copy(can.rotation);
      g.add(label);
    } else {
      const bone = mat(0xf3ead6);
      for (const a of [0.5, -0.4]) {
        const b = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), bone);
        shaft.rotation.z = Math.PI / 2;
        b.add(shaft);
        for (const ex of [-0.17, 0.17]) {
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), bone);
          knob.position.x = ex;
          b.add(knob);
        }
        b.rotation.z = a;
        g.add(b);
      }
    }
  }
}
