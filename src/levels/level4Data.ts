import type { Collider } from '../physics/physics';
import type { ItemKind, Prop } from './level1Data';

/** Level 4 – under the big tree: mounds on the meadow and two root pens reachable only underground. */

export interface Pen {
  x: number;
  z: number;
  rx: number;
  rz: number;
  /** Hole on the meadow next to the pen: the way into the maze. */
  hole: { x: number; z: number };
  /** Molehill inside the pen where the hamster pops out after the maze. */
  inside: { x: number; z: number };
  /** Molehill inside the pen leading back out to the hole. */
  back: { x: number; z: number };
}

const pen = (x: number, z: number, side: 1 | -1): Pen => ({
  x,
  z,
  rx: 3.4,
  rz: 3.0,
  // `side` points from the pen towards the middle of the meadow: the hole is on that side
  hole: { x: x + side * 4.6, z: z + 1.2 },
  inside: { x: x + side * 1.8, z: z + 1.3 },
  back: { x: x + side * 1.8, z: z - 1.3 },
});

const PENS: Pen[] = [pen(-11, -7, 1), pen(11, -7, -1)];

export const LEVEL4 = {
  halfSize: 20,
  spawn: { x: 0, z: 14 },
  tree: { x: 0, z: -3, r: 1.1 },
  /** The mole's own molehill next to the tree. */
  moleHome: { x: 2.2, z: -1 },
  pens: PENS,
  /** pen: 0 = on the meadow, 1/2 = inside that pen. */
  mounds: [
    { x: -4, z: 6, pen: 0 },
    { x: 4.5, z: 4, pen: 0 },
    { x: -5, z: -2, pen: 0 },
    { x: 3.5, z: -9.5, pen: 0 },
    // inside the pens: on the far side from the molehills
    { x: PENS[0].x - 1.5, z: PENS[0].z - 1.2, pen: 1 },
    { x: PENS[0].x - 1.5, z: PENS[0].z + 1.2, pen: 1 },
    { x: PENS[1].x + 1.5, z: PENS[1].z - 1.2, pen: 2 },
    { x: PENS[1].x + 1.5, z: PENS[1].z + 1.2, pen: 2 },
  ] as { x: number; z: number; pen: 0 | 1 | 2 }[],
  /** Bonus treat on the surface, tucked behind the tree. */
  bonus: { kind: 'strawberry' as ItemKind, x: -0.6, z: -5.2 },
  props: [
    { type: 'bush', collider: { kind: 'cylinder', x: -16, z: 14, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 16, z: 13, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 0, z: -17, radius: 1.1, height: 1.3 } },
    { type: 'rock', collider: { kind: 'box', x: 9, z: 9, halfX: 0.5, halfZ: 0.4, height: 0.4 } },
    { type: 'rock', collider: { kind: 'box', x: -9, z: 10, halfX: 0.5, halfZ: 0.4, height: 0.4 } },
  ] as Prop[],
};

const POST_R = 0.32;
const POST_GAP = 0.5;
const FENCE_H = 1.15;

/** Ring of root posts around a pen: taller than a jump and with no gap the hamster fits through. */
export function penColliders(p: Pen): Collider[] {
  const out: Collider[] = [];
  // ellipse circumference (Ramanujan) → number of posts
  const h = ((p.rx - p.rz) / (p.rx + p.rz)) ** 2;
  const circ = Math.PI * (p.rx + p.rz) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  const n = Math.ceil(circ / POST_GAP);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ kind: 'cylinder', x: p.x + Math.cos(a) * p.rx, z: p.z + Math.sin(a) * p.rz, radius: POST_R, height: FENCE_H });
  }
  return out;
}

export function insidePen(p: Pen, x: number, z: number): boolean {
  return ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < 1;
}
