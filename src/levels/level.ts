import type * as THREE from 'three';
import type { InputState } from '../input/types';
import type { ItemKind } from './level1Data';
import type { LineId } from '../audio/lines';

export interface LevelEvents {
  onCollect(kind: ItemKind, nutsCollected: number, nutsTotal: number): void;
  /** Shown after the celebration: time for the end screen. */
  onComplete(stars: number): void;
  /** The goal was just reached (before the celebration) – save progress here so leaving early never loses it. */
  onFinished?(stars: number): void;
  onNearNpc(): void;
  /** A level goal item was reached (nut collected, gate passed): index 0-based. */
  onGoal?(index: number, total: number): void;
  onJump?(): void;
  /** Each footfall while running (for the pitter-patter sound). */
  onStep?(): void;
  /** The hamster came close to a bee or butterfly (decorative chatter). */
  onCritter?(kind: 'bee' | 'butterfly', obj: THREE.Object3D): void;
  /** The level's friend (squirrel, frog) says a line. */
  onFriendSay?(id: LineId, obj: THREE.Object3D): void;
  /** The hamster is put back after falling into water (short fade). */
  onRespawn?(): void;
  /** A lily pad started to sink. */
  onSink?(): void;
  /** The hamster bumped into a puddle. */
  onSplash?(): void;
}

export interface Level {
  setup(scene: THREE.Scene, events: LevelEvents): void;
  update(dt: number, input: InputState, cameraYaw: number): void;
  readonly player: THREE.Object3D;
  isComplete(): boolean;
  stars(): number;
  dispose(): void;
}
