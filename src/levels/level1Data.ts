import type { Collider } from '../physics/physics';

export type ItemKind = 'nut' | 'strawberry' | 'carrot' | 'apple';
export interface ItemSpot { kind: ItemKind; x: number; z: number; y: number }
export type PropType = 'bush' | 'rock' | 'house' | 'tree' | 'flowerbed' | 'fence' | 'can' | 'pot' | 'puddle' | 'tube' | 'wheel';
export interface Prop { type: PropType; collider: Collider }

const bush = (x: number, z: number, radius: number, height = 1.2): Prop => ({ type: 'bush', collider: { kind: 'cylinder', x, z, radius, height } });
const rock = (x: number, z: number, halfX: number, halfZ: number, height: number): Prop => ({ type: 'rock', collider: { kind: 'box', x, z, halfX, halfZ, height } });

const props: Prop[] = [
  { type: 'house', collider: { kind: 'cylinder', x: -7, z: 13, radius: 1.4, height: 2.2 } },
  { type: 'tree', collider: { kind: 'cylinder', x: -12, z: -13, radius: 0.7, height: 6 } },
  bush(-5, 6, 0.9),
  bush(6, 4, 1.0, 1.3),
  bush(-8, -3, 0.8),
  bush(9, -6, 0.9),
  bush(-3, -9, 1.0, 1.3),
  bush(4, -13, 0.8),
  bush(13, 8, 0.9),
  bush(-13, 9, 0.9),
  rock(3, -2, 0.8, 0.7, 0.45),
  rock(-6, 2, 0.6, 0.6, 0.35),
  rock(10, -12, 0.9, 0.9, 0.5),
];

/** Layout of level 1 – Louka u domku. Camera looks towards -Z, the house is near the camera side. */
export const LEVEL1 = {
  halfSize: 20,
  spawn: { x: -1, z: 10.5 },
  hedgehog: { x: 1.4, z: 9.4 },
  house: { x: -7, z: 13 },
  props,
  colliders: props.map((p) => p.collider),
  items: [
    { kind: 'nut', x: 0, z: 7, y: 0 },
    { kind: 'nut', x: -2, z: 4, y: 0 },
    { kind: 'nut', x: 2, z: 1, y: 0 },
    { kind: 'nut', x: -4, z: -1, y: 0 },
    { kind: 'nut', x: 6, z: 0, y: 0 },
    { kind: 'nut', x: 0, z: -5, y: 0 },
    { kind: 'nut', x: -7, z: -6, y: 0 },
    { kind: 'nut', x: 7, z: -9, y: 0 },
    { kind: 'nut', x: -1, z: -14, y: 0 },
    { kind: 'nut', x: 12, z: 2, y: 0 },
    { kind: 'strawberry', x: 10, z: -12, y: 0.5 },
    { kind: 'carrot', x: -5.2, z: 4.3, y: 0 },
    { kind: 'apple', x: -10.5, z: -11, y: 0 },
  ] as ItemSpot[],
};
