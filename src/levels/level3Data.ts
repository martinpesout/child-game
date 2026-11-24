import { Course } from './course';
import { PHYS } from '../physics/physics';
import type { ItemKind, Prop } from './level1Data';

/**
 * Level 3 – the brook. The brook runs north–south through the middle (x ≈ 0); the track zig-zags
 * east–west over it in 6 straight legs, so every leg crosses the water once.
 * The brook is analytic (centre line + width by z) so ground queries stay O(1) for the physics.
 */

export type StepKind = 'stone' | 'stump' | 'lily' | 'log';

export interface StepSpot {
  kind: StepKind;
  x: number;
  z: number;
  /** Radius (stone, stump, lily) or half-width along the jump (log). */
  r: number;
  /** World y of the top. */
  top: number;
  /** Log only: length along the current (z). */
  len?: number;
}

export interface Crossing {
  steps: StepSpot[];
  /** Track distance of the flower on the far bank (crossing done when passed). */
  endS: number;
}

/** Leg rows (z) from the start (south) to the finish (north). */
const LEGS = [15, 9, 3, -3, -9, -15];
const LEG_X = 11;
const TURN_X = 14;

const STONE_TOP = 0.18;
const LILY_TOP = 0.13;
const LOG_TOP = 0.2;

type StepDef = { kind: StepKind; top?: number; side?: number };
/** Per crossing: steps in order of travel and the gaps (edge to edge) before each step and to the far bank. */
const CROSSINGS: { steps: StepDef[]; gaps: number[] }[] = [
  { steps: [{ kind: 'stone' }, { kind: 'stone' }], gaps: [0.6, 0.7, 0.6] },
  { steps: [{ kind: 'stone' }, { kind: 'stone', top: 0.3 }, { kind: 'stone' }], gaps: [0.8, 0.9, 1.0, 0.8] },
  { steps: [{ kind: 'stone' }, { kind: 'stump', top: 0.55 }, { kind: 'stone' }, { kind: 'stone' }], gaps: [1.0, 1.1, 1.0, 1.2, 1.0] },
  {
    steps: [{ kind: 'stone' }, { kind: 'stump', top: 0.45, side: 0.6 }, { kind: 'stone' }, { kind: 'stone', side: -0.6 }, { kind: 'stone' }],
    gaps: [1.0, 1.1, 1.2, 1.3, 1.1, 1.0],
  },
  { steps: [{ kind: 'stone' }, { kind: 'lily' }, { kind: 'stone' }, { kind: 'lily' }, { kind: 'stone' }], gaps: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
  { steps: [{ kind: 'stone' }, { kind: 'lily' }, { kind: 'stone' }, { kind: 'log' }, { kind: 'stone' }], gaps: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
];

const RADIUS: Record<StepKind, number> = { stone: 0.5, stump: 0.5, lily: 0.55, log: 0.3 };
const DEFAULT_TOP: Record<StepKind, number> = { stone: STONE_TOP, stump: 0.45, lily: LILY_TOP, log: LOG_TOP };
const LOG_LEN = 1.8;

/** Crossing layout relative to its entry bank: along = distance from the bank along the travel direction. */
function layoutCrossing(def: (typeof CROSSINGS)[number]) {
  const out: { def: StepDef; along: number; side: number }[] = [];
  let edge = 0; // far edge of the previous step (or the bank), along the travel direction
  let prevSide = 0;
  def.steps.forEach((st, i) => {
    const r = RADIUS[st.kind];
    const side = st.side ?? 0;
    const prevR = i === 0 ? 0 : RADIUS[def.steps[i - 1].kind];
    const prevCentre = i === 0 ? 0 : edge - prevR;
    // centre-to-centre distance must be gap + both radii; part of it may go sideways
    const cc = def.gaps[i] + r + prevR;
    const dSide = side - prevSide;
    const along = i === 0 ? def.gaps[0] + r : prevCentre + Math.sqrt(Math.max(0, cc * cc - dSide * dSide));
    out.push({ def: st, along, side });
    edge = along + r;
    prevSide = side;
  });
  const width = edge + def.gaps[def.gaps.length - 1];
  return { steps: out, width };
}

const LAYOUTS = CROSSINGS.map(layoutCrossing);
const HALF_WIDTHS = LAYOUTS.map((l) => l.width / 2);

/** Brook centre line x at row z (a gentle meander). */
export function brookCenterX(z: number): number {
  return 0.8 * Math.sin(z * 0.25);
}

/** Brook half-width at row z: exactly what each crossing needs at its leg, blended in between. */
export function brookHalfWidth(z: number): number {
  if (z >= LEGS[0]) return HALF_WIDTHS[0];
  if (z <= LEGS[LEGS.length - 1]) return HALF_WIDTHS[HALF_WIDTHS.length - 1];
  for (let i = 0; i < LEGS.length - 1; i++) {
    if (z <= LEGS[i] && z >= LEGS[i + 1]) {
      const k = (LEGS[i] - z) / (LEGS[i] - LEGS[i + 1]);
      return HALF_WIDTHS[i] + (HALF_WIDTHS[i + 1] - HALF_WIDTHS[i]) * k;
    }
  }
  return HALF_WIDTHS[0];
}

export function inBrook(x: number, z: number): boolean {
  return Math.abs(x - brookCenterX(z)) < brookHalfWidth(z);
}

export const LEVEL3 = {
  halfSize: 20,
  legs: LEGS,
  /** World y of the water surface as drawn (just above the grass). */
  waterY: 0.08,
  bankY: 0,
  bedY: -1.2,
  props: [
    { type: 'tree', collider: { kind: 'cylinder', x: -17, z: 17, radius: 0.7, height: 6 } },
    { type: 'tree', collider: { kind: 'cylinder', x: 17, z: -18, radius: 0.7, height: 6 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 17, z: 17, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: -17.5, z: -6, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 17.5, z: 1, radius: 0.9, height: 1.2 } },
  ] as Prop[],
};

/** A body in the brook below this height has fallen into the water. */
export const FALL_Y = -0.2;

/** Physics ground: deep brook bed, flat banks. */
export function level3Ground(): (x: number, z: number) => number {
  return (x, z) => (inBrook(x, z) ? LEVEL3.bedY : LEVEL3.bankY);
}

/** Track: start in the south-east, 6 legs over the brook, finish in the north-east. */
export function level3Course(): Course {
  const pts: { x: number; z: number }[] = [];
  LEGS.forEach((z, i) => {
    const dir = i % 2 === 0 ? -1 : 1; // even legs go west
    const from = -dir * LEG_X;
    for (const k of [0, 0.3, 0.5, 0.7, 1]) pts.push({ x: from + dir * 2 * LEG_X * k, z });
    if (i < LEGS.length - 1) pts.push({ x: dir * TURN_X, z: z - 3 });
  });
  return new Course(pts);
}

/** Travel direction along x on leg i (+1 east, -1 west). */
const legDir = (i: number) => (i % 2 === 0 ? -1 : 1);

export function level3Crossings(course: Course): Crossing[] {
  return LAYOUTS.map((lay, i) => {
    const z = LEGS[i];
    const dir = legDir(i);
    const hw = HALF_WIDTHS[i];
    const entry = brookCenterX(z) - dir * hw;
    const steps: StepSpot[] = lay.steps.map(({ def, along, side }) => {
      const s: StepSpot = { kind: def.kind, x: entry + dir * along, z: z + side, r: RADIUS[def.kind], top: def.top ?? DEFAULT_TOP[def.kind] };
      if (def.kind === 'log') s.len = LOG_LEN;
      return s;
    });
    const exitX = brookCenterX(z) + dir * hw;
    return { steps, endS: course.nearestS(exitX + dir * 1.0, z) };
  });
}

/** "Jump stairs" on dry land: two pairs of stumps on legs 2 and 5 (before the brook). */
export function level3LandSteps(_course: Course): StepSpot[] {
  const pair = (leg: number, x0: number): StepSpot[] => {
    const dir = legDir(leg);
    const z = LEGS[leg];
    return [
      { kind: 'stump', x: x0, z, r: 0.5, top: 0.3 },
      { kind: 'stump', x: x0 + dir * 1.8, z, r: 0.5, top: 0.5 },
    ];
  };
  return [...pair(1, -9.2), ...pair(4, 9.2)];
}

/** Off-track stone carrying a bonus (beside the stump of crossing 3). */
export function level3SideStones(): StepSpot[] {
  const c3 = level3Crossings(level3Course())[2];
  const stump = c3.steps[1];
  return [{ kind: 'stone', x: stump.x, z: stump.z - 1.6, r: 0.5, top: STONE_TOP }];
}

export function level3Bonuses(course: Course): { kind: ItemKind; x: number; z: number; y: number }[] {
  const side = level3SideStones()[0];
  const land = level3LandSteps(course)[3];
  return [
    { kind: 'carrot', x: side.x, z: side.z, y: side.top },
    { kind: 'apple', x: land.x, z: land.z, y: land.top },
    // hidden in the reeds beside leg 4, away from the water
    { kind: 'strawberry', x: -8.5, z: LEGS[3] + 1.6, y: 0 },
  ];
}

/** Horizontal reach of a running jump from a top at `fromTop` landing on a top at `toTop`. */
export function jumpReach(fromTop: number, toTop: number): number {
  const v = PHYS.jumpSpeed;
  const g = PHYS.gravity;
  const dy = toTop - fromTop;
  const disc = v * v - 2 * g * dy;
  if (disc < 0) return 0;
  return PHYS.maxSpeed * ((v + Math.sqrt(disc)) / g);
}
