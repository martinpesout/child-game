import * as THREE from 'three';
import { Hedgehog } from '../characters/hedgehog';
import { buildWorld } from '../world/world';
import { Terrain } from '../world/terrain';
import { HintSparkle } from '../world/effects';
import { LEVEL1 } from './level1Data';
import { HintTimer, Progress } from './progress';
import { LevelBase, type LevelLayout, type Treat } from './levelBase';

type LevelData = typeof LEVEL1;

const NPC_NEAR = 1.6;
const NPC_REPEAT = 8;
const HEDGEHOG_RADIUS = 0.4;

export { remainingText } from '../audio/lines';

/** Level 1 – the meadow: collect 10 nuts for the hedgehog. */
export class Level1Meadow extends LevelBase {
  private progress!: Progress;
  private hint!: HintTimer;
  private sparkle!: HintSparkle;
  private hedgehog!: Hedgehog;
  private npcCooldown = 0;

  constructor(private readonly data: LevelData = LEVEL1) {
    super();
  }

  get nuts(): { collected: number; total: number } {
    return { collected: this.progress.nuts, total: this.progress.nutsTotal };
  }

  get goal() {
    return { done: this.progress.nuts, total: this.progress.nutsTotal, icon: 'nut' };
  }

  /** Stars earned so far, as if the level were finished now (for the HUD). */
  get starsIfDone(): number {
    const p = this.progress;
    return Math.min(3, 1 + Math.floor((2 * p.bonuses) / Math.max(1, p.bonusTotal)));
  }

  get npc(): Hedgehog {
    return this.hedgehog;
  }

  isComplete(): boolean {
    return this.progress?.isComplete() ?? false;
  }

  stars(): number {
    return this.progress.stars();
  }

  protected layout(scene: THREE.Scene): LevelLayout {
    const d = this.data;
    const view = buildWorld(scene, {
      halfSize: d.halfSize,
      terrain: Terrain.flat(),
      colliders: d.colliders,
      props: d.props,
      avoid: d.items.map((i) => ({ x: i.x, z: i.z, r: 0.5 })),
      house: { x: d.house.x, z: d.house.z, facing: d.spawn },
    });
    const nutsTotal = d.items.filter((i) => i.kind === 'nut').length;
    this.progress = new Progress(nutsTotal, d.items.length - nutsTotal);
    return {
      view,
      physics: {
        colliders: [...d.colliders, { kind: 'cylinder', x: d.hedgehog.x, z: d.hedgehog.z, radius: HEDGEHOG_RADIUS, height: 1 }],
        bounds: { halfSize: d.halfSize },
      },
      spawn: { x: d.spawn.x, z: d.spawn.z, heading: Math.PI },
      treats: d.items,
    };
  }

  protected onSetup(): void {
    const d = this.data;
    this.hedgehog = new Hedgehog();
    this.hedgehog.root.position.set(d.hedgehog.x, 0, d.hedgehog.z);
    this.scene.add(this.hedgehog.root);
    this.npcCooldown = 0;
    this.hint = new HintTimer(20);
    this.sparkle = new HintSparkle();
    this.scene.add(this.sparkle.root);
  }

  protected onTreat(t: Treat): void {
    this.progress.collect(t.spot.kind);
    this.events.onCollect(t.spot.kind, this.progress.nuts, this.progress.nutsTotal);
    if (t.spot.kind === 'nut') this.events.onGoal?.(this.progress.nuts - 1, this.progress.nutsTotal);
  }

  protected onUpdate(dt: number, collected: boolean): void {
    this.updateHint(dt, collected);
    this.updateNpc(dt);
  }

  protected onDispose(): void {
    this.hedgehog.dispose();
    this.sparkle.dispose();
  }

  private updateNpc(dt: number): void {
    const pos = this.hamster.root.position;
    const dist = Math.hypot(pos.x - this.data.hedgehog.x, pos.z - this.data.hedgehog.z);
    const near = dist < NPC_NEAR;
    this.hedgehog.update(dt, dist < 6 ? pos : null);
    this.hamster.lookAt(near ? this.hedgehog.root.position : null);
    this.npcCooldown = Math.max(0, this.npcCooldown - dt);
    if (near && this.npcCooldown === 0 && !this.progress.isComplete()) {
      this.npcCooldown = NPC_REPEAT;
      this.events.onNearNpc();
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
