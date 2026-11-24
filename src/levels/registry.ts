import type { LineId } from '../audio/lines';
import type { LevelBase } from './levelBase';
import { Level1Meadow } from './level1';
import { Level2Garden } from './level2';
import { Level3Brook } from './level3';
import { Level4Tree } from './level4';

/** A friend in the level who talks and waves (hedgehog, squirrel…). */
export interface Npc {
  root: import('three').Object3D;
  wave(): void;
}

export type PlayableLevel = LevelBase & { readonly npc: Npc };

export interface LevelInfo {
  id: number;
  name: string;
  /** Built and playable (others show "už brzy" on the map). */
  ready: boolean;
  story?: LineId;
  /** What the level's friend says after the intro close-up. */
  intro?: LineId;
  /** Said by the friend when the goal is reached (level 2 says its own line). */
  thanks?: LineId;
  create?: () => PlayableLevel;
}

export const LEVELS: LevelInfo[] = [
  { id: 1, name: 'Louka', ready: true, story: 'story', intro: 'intro', thanks: 'thanks', create: () => new Level1Meadow() },
  { id: 2, name: 'Zahrada', ready: true, story: 'l2story', intro: 'l2intro', create: () => new Level2Garden() },
  { id: 3, name: 'Kamenitá cesta', ready: true, story: 'l3story', intro: 'l3intro', create: () => new Level3Brook() },
  { id: 4, name: 'Pod stromem', ready: true, story: 'l4story', intro: 'l4intro', create: () => new Level4Tree() },
  { id: 5, name: 'Domů', ready: false },
];
