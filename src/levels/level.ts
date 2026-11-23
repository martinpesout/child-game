import type * as THREE from 'three';
import type { InputState } from '../input/types';
import type { ItemKind } from './level1Data';

export interface LevelEvents {
  onCollect(kind: ItemKind, nutsCollected: number, nutsTotal: number): void;
  onComplete(stars: number): void;
  onNearNpc(): void;
  onJump?(): void;
  /** Each footfall while running (for the pitter-patter sound). */
  onStep?(): void;
}

export interface Level {
  setup(scene: THREE.Scene, events: LevelEvents): void;
  update(dt: number, input: InputState, cameraYaw: number): void;
  readonly player: THREE.Object3D;
  isComplete(): boolean;
  stars(): number;
  dispose(): void;
}
