import { Course, placeGates, type Gate } from './course';
import type { Collider } from '../physics/physics';
import type { ItemKind, Prop } from './level1Data';
import type { StepSpot } from './level3Data';
import type { MazeDef } from './maze';

/**
 * Level 5 – home. From the garden in the south (+z) over the brook, under the fence (digging maze),
 * across the yard past the sleeping cat, to the house in the north (−z).
 */

const BROOK_Z = 0;
const STONE_R = 0.48;
const LILY_R = 0.55;
const STONE_TOP = 0.18;
const LILY_TOP = 0.13;

type Cover = { kind: 'pot' | 'can' | 'bush' | 'crate'; x: number; z: number };

/** Steps over the brook along −z at x = 0 (gaps between edges, first from the north bank). */
function brookSteps(): { steps: StepSpot[]; halfWidth: number } {
  const kinds: StepSpot['kind'][] = ['stone', 'stone', 'lily', 'stone', 'stone'];
  const gaps = [0.7, 0.8, 0.8, 0.9, 0.8, 0.7];
  const radius = (k: StepSpot['kind']) => (k === 'lily' ? LILY_R : STONE_R);
  const width = gaps.reduce((a, b) => a + b, 0) + kinds.reduce((a, k) => a + 2 * radius(k), 0);
  const half = width / 2;
  let edge = BROOK_Z + half;
  const steps = kinds.map((k, i) => {
    const r = radius(k);
    const z = edge - gaps[i] - r;
    edge = z - r;
    return { kind: k, x: 0, z, r, top: k === 'lily' ? LILY_TOP : STONE_TOP } as StepSpot;
  });
  return { steps, halfWidth: half };
}

const BROOK = brookSteps();

export const LEVEL5 = {
  halfSize: 20,
  track: [
    { x: 0, z: 18 },
    { x: -1.6, z: 14.5 },
    { x: 1.4, z: 11 },
    { x: 0, z: 7.5 },
    { x: 0, z: BROOK_Z + BROOK.halfWidth + 0.4 },
    { x: 0, z: BROOK_Z - BROOK.halfWidth - 0.4 },
    { x: 1.6, z: -6.0 },
    { x: 2.5, z: -8.4 },
    { x: 1, z: -11 },
    { x: -0.5, z: -13.4 },
    { x: 0, z: -15.2 },
  ],
  /** Hoops as fractions of the track length (all in the garden). */
  hoops: [0.06, 0.15, 0.24],
  brook: { z: BROOK_Z, halfWidth: BROOK.halfWidth, steps: BROOK.steps },
  fenceZ: -7,
  hole: { x: 2.6, z: -5.9 },
  exitSpot: { x: 2.6, z: -8.3 },
  /** Yard between the fence and the house (the cat watches all of it). */
  yardEndZ: -14.6,
  yard: {
    cat: { x: 3.6, z: -11.2, r: 0.7 },
    start: { x: 2.6, z: -8.3 },
    covers: [
      { kind: 'crate', x: -1.2, z: -9.0 },
      { kind: 'pot', x: 1.4, z: -10.4 },
      { kind: 'bush', x: -1.6, z: -12.0 },
      { kind: 'can', x: 1.0, z: -13.3 },
    ] as Cover[],
    shadeR: 1.0,
  },
  house: { x: 0, z: -17.3, facing: { x: 0, z: -12 } },
  door: { x: 0, z: -15.4 },
  bonuses: [
    { kind: 'strawberry', x: 3.2, z: 12, y: 0 },
    { kind: 'carrot', x: 0, z: 0, y: 0 }, // replaced below: in the shade of the bush
  ] as { kind: ItemKind; x: number; z: number; y: number }[],
  maze: {
    rows: ['RRRRRRRRER', 'o..#......', '...#......', '.#...##.#.', '...#......'],
    entry: { x: 0, y: 1 },
    bigs: [{ kind: 'duck', x: 5, y: 1, w: 2, h: 2 }],
    items: [{ kind: 'apple', x: 9, y: 3 }],
    friends: [],
  } as MazeDef,
  props: [
    { type: 'house', collider: { kind: 'cylinder', x: 0, z: -17.3, radius: 1.4, height: 2.2 } },
    { type: 'tree', collider: { kind: 'cylinder', x: -14, z: 10, radius: 0.7, height: 6 } },
    { type: 'tree', collider: { kind: 'cylinder', x: 13, z: -16, radius: 0.7, height: 6 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 12, z: 15, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: -12, z: -12, radius: 1.0, height: 1.3 } },
  ] as Prop[],
};

/** Shade where the hamster is hidden: on the side of the cover away from the cat. */
export function shadeFor(c: { x: number; z: number }): { x: number; z: number; r: number } {
  const cat = LEVEL5.yard.cat;
  const dx = c.x - cat.x;
  const dz = c.z - cat.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: c.x + (dx / l) * 0.95, z: c.z + (dz / l) * 0.95, r: LEVEL5.yard.shadeR };
}

// the yard bonus sits in the bush's shade
{
  const bush = LEVEL5.yard.covers.find((c) => c.kind === 'bush')!;
  const s = shadeFor(bush);
  LEVEL5.bonuses[1] = { kind: 'carrot', x: s.x, z: s.z, y: 0 };
}

export const level5Course = () => new Course(LEVEL5.track);

export function level5Hoops(course: Course): Gate[] {
  return placeGates(course, LEVEL5.hoops.map((f) => ({ s: f * course.length, kind: 'hoop' as const })));
}

export function inBrook5(_x: number, z: number): boolean {
  return Math.abs(z - LEVEL5.brook.z) < LEVEL5.brook.halfWidth;
}

export function level5Ground(): (x: number, z: number) => number {
  return (x, z) => (inBrook5(x, z) ? -1.2 : 0);
}

export function inYard(_x: number, z: number): boolean {
  return z < LEVEL5.fenceZ && z > LEVEL5.yardEndZ;
}

/** The fence across the whole world (boxes 4 m wide, 1.6 m high). */
export function fenceColliders(): Collider[] {
  const out: Collider[] = [];
  for (let x = -LEVEL5.halfSize; x < LEVEL5.halfSize; x += 4) {
    out.push({ kind: 'box', x: x + 2, z: LEVEL5.fenceZ, halfX: 2.05, halfZ: 0.12, height: 1.6 });
  }
  return out;
}
