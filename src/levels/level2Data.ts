import { Course, placeGates, type Gate } from './course';
import { Terrain } from '../world/terrain';
import type { Prop, ItemKind } from './level1Data';

/** Level 2 – the garden race. The track starts near the camera side (south) and snakes north-west. */
export const LEVEL2 = {
  halfSize: 20,
  track: [
    { x: 0, z: 15 },
    { x: -6, z: 12 },
    { x: -11, z: 6 },
    { x: -7, z: -1 },
    { x: 1, z: -1.5 },
    { x: 9, z: 2.5 },
    { x: 14, z: -4 },
    { x: 10, z: -11 },
    { x: 2, z: -12.5 },
    { x: -5, z: -15 },
    { x: -12, z: -13 },
  ],
  /** Gate positions as a fraction of the track length. */
  gates: [
    { f: 0.08, kind: 'hoop' },
    { f: 0.2, kind: 'hoop' },
    { f: 0.32, kind: 'tube' },
    { f: 0.44, kind: 'hoop' },
    { f: 0.56, kind: 'hoop' },
    { f: 0.67, kind: 'tube' },
    { f: 0.79, kind: 'hoop' },
    { f: 0.9, kind: 'hoop' },
  ] as { f: number; kind: 'hoop' | 'tube' }[],
  tubeLength: 3,
  /** Things beside the track: f = fraction along the track, side = ±1 (left/right), off = metres from the centre line. */
  puddles: [
    { f: 0.14, side: 1, off: 3.6, r: 1.2 },
    { f: 0.5, side: -1, off: 3.4, r: 1.0 },
    { f: 0.74, side: 1, off: 3.8, r: 1.3 },
  ],
  decor: [
    { type: 'flowerbed', f: 0.05, side: -1, off: 2.4, size: 1.0 },
    { type: 'fence', f: 0.25, side: 1, off: 2.3, size: 1.3 },
    { type: 'can', f: 0.28, side: -1, off: 2.2, size: 0.6 },
    { type: 'flowerbed', f: 0.38, side: 1, off: 2.5, size: 1.0 },
    { type: 'pot', f: 0.47, side: 1, off: 2.0, size: 0.4 },
    { type: 'fence', f: 0.6, side: -1, off: 2.3, size: 1.3 },
    { type: 'pot', f: 0.63, side: 1, off: 2.0, size: 0.4 },
    { type: 'flowerbed', f: 0.84, side: -1, off: 2.5, size: 1.0 },
    { type: 'can', f: 0.86, side: 1, off: 2.2, size: 0.6 },
  ] as { type: 'flowerbed' | 'fence' | 'can' | 'pot'; f: number; side: number; off: number; size: number }[],
  bonuses: [
    { kind: 'strawberry', f: 0.3, side: 1, off: 3.0 },
    { kind: 'carrot', f: 0.53, side: 1, off: 3.2 },
    { kind: 'apple', f: 0.82, side: 1, off: 3.0 },
  ] as { kind: ItemKind; f: number; side: number; off: number }[],
  /** Trees and bushes around the garden edge (built by the shared world). */
  props: [
    { type: 'tree', collider: { kind: 'cylinder', x: 16, z: 13, radius: 0.7, height: 6 } },
    { type: 'tree', collider: { kind: 'cylinder', x: -16, z: -4, radius: 0.7, height: 6 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 12, z: 14, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: -15, z: 14, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 16, z: -15, radius: 1.0, height: 1.3 } },
    { type: 'bush', collider: { kind: 'cylinder', x: 4, z: 8, radius: 0.9, height: 1.2 } },
  ] as Prop[],
};

export const level2Course = () => new Course(LEVEL2.track);

export function level2Gates(course: Course): Gate[] {
  return placeGates(
    course,
    LEVEL2.gates.map((g) => ({ s: g.f * course.length, kind: g.kind })),
  );
}

/** Point beside the track. */
function beside(course: Course, f: number, side: number, off: number) {
  const s = f * course.length;
  const p = course.pointAt(s);
  const t = course.tangentAt(s);
  // left normal of the direction of travel = (-t.z, t.x)
  return { x: p.x - t.z * off * side, z: p.z + t.x * off * side, yaw: Math.atan2(-t.z, t.x) };
}

export function level2Placements(course: Course) {
  return {
    puddles: LEVEL2.puddles.map((p) => ({ ...beside(course, p.f, p.side, p.off), r: p.r })),
    decor: LEVEL2.decor.map((d) => ({ ...beside(course, d.f, d.side, d.off), type: d.type, size: d.size })),
    bonuses: LEVEL2.bonuses.map((b) => ({ ...beside(course, b.f, b.side, b.off), kind: b.kind })),
  };
}

/** Gentle hills, flat on and around the track. */
export function level2Terrain(course: Course): Terrain {
  return new Terrain({
    seed: 5,
    amplitude: 0.45,
    flat: (x, z) => {
      const d = course.distanceTo(x, z);
      const k = Math.max(0, Math.min(1, (d - 1.8) / 3.5));
      return k * k * (3 - 2 * k);
    },
  });
}
