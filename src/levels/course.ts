import * as THREE from 'three';

type P = { x: number; z: number };

const SAMPLES = 600;
/** Beyond this distance from the path the navigation arrow appears. */
const ARROW_DISTANCE = 4;

/** Smooth race track through control points; positions are addressed by distance `s` (metres) from the start. */
export class Course {
  readonly length: number;
  private readonly pts: P[] = [];
  private readonly cum: number[] = [];

  constructor(points: P[]) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, 'centripetal');
    let acc = 0;
    for (let i = 0; i <= SAMPLES; i++) {
      const v = curve.getPoint(i / SAMPLES);
      const p = { x: v.x, z: v.z };
      if (i > 0) acc += Math.hypot(p.x - this.pts[i - 1].x, p.z - this.pts[i - 1].z);
      this.pts.push(p);
      this.cum.push(acc);
    }
    this.length = acc;
  }

  pointAt(s: number): P {
    const t = Math.max(0, Math.min(this.length, s));
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < t) lo = mid;
      else hi = mid;
    }
    const seg = this.cum[hi] - this.cum[lo] || 1;
    const k = (t - this.cum[lo]) / seg;
    const a = this.pts[lo];
    const b = this.pts[hi];
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k };
  }

  tangentAt(s: number): P {
    const a = this.pointAt(s - 0.25);
    const b = this.pointAt(s + 0.25);
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: (b.x - a.x) / l, z: (b.z - a.z) / l };
  }

  nearestS(x: number, z: number): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.pts.length; i++) {
      const d = (this.pts[i].x - x) ** 2 + (this.pts[i].z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return this.cum[best];
  }

  distanceTo(x: number, z: number): number {
    const p = this.pointAt(this.nearestS(x, z));
    return Math.hypot(p.x - x, p.z - z);
  }
}

export interface Gate {
  s: number;
  x: number;
  z: number;
  /** Direction of travel through the gate (unit). */
  dirX: number;
  dirZ: number;
  /** Max distance from the centre that still counts as "through". */
  radius: number;
  kind: 'hoop' | 'tube';
}

/** How far from a gate's centre a pass still counts (the hoop opening at hamster height is ~±0.6 m). */
export const GATE_RADIUS = { hoop: 0.6, tube: 0.7 };

export function placeGates(course: Course, specs: { s: number; kind: 'hoop' | 'tube' }[]): Gate[] {
  return specs.map(({ s, kind }) => {
    const p = course.pointAt(s);
    const t = course.tangentAt(s);
    return { s, x: p.x, z: p.z, dirX: t.x, dirZ: t.z, radius: GATE_RADIUS[kind], kind };
  });
}

/** Counts gates passed strictly in order; a pass = the step crosses the gate plane inside its radius (either direction). */
export class GateTracker {
  next = 0;

  constructor(private readonly gates: Gate[]) {}

  get passed(): number {
    return this.next;
  }

  isDone(): boolean {
    return this.next >= this.gates.length;
  }

  update(prev: P, cur: P): number | null {
    const g = this.gates[this.next];
    if (!g) return null;
    const d0 = (prev.x - g.x) * g.dirX + (prev.z - g.z) * g.dirZ;
    const d1 = (cur.x - g.x) * g.dirX + (cur.z - g.z) * g.dirZ;
    if (d0 === d1 || (d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) return null;
    const t = d0 / (d0 - d1);
    const hx = prev.x + (cur.x - prev.x) * t;
    const hz = prev.z + (cur.z - prev.z) * t;
    if (Math.hypot(hx - g.x, hz - g.z) > g.radius) return null;
    return this.next++;
  }
}

export function navArrowVisible(distanceToCourse: number, nextGateOnScreen: boolean): boolean {
  return distanceToCourse > ARROW_DISTANCE || !nextGateOnScreen;
}
