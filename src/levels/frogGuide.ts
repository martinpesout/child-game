export type Pt = { x: number; y: number; z: number };

const HOP_HEIGHT = 0.5;
const MAX_HOP = 1.3;

/**
 * Where the frog is: it waits at the start of crossing `leg` until the hamster comes close, hops across
 * (stone by stone) and waits on the far bank; it moves on to the next crossing only once the hamster has done this one.
 * Points are read live, so moving platforms (the log) can be updated in place.
 */
export class FrogGuide {
  readonly pos: Pt;
  hopK = 0;
  heading = -Math.PI / 2;
  leg = 0;
  private queue: Pt[] = [];
  private from: Pt = { x: 0, y: 0, z: 0 };
  private to: Pt | null = null;
  private t = 0;
  private crossed = false;
  private readonly hopTime: number;
  private readonly startNear: number;

  constructor(
    private readonly legs: Pt[][],
    opts: { hopTime?: number; startNear?: number } = {},
  ) {
    this.hopTime = opts.hopTime ?? 0.45;
    this.startNear = opts.startNear ?? 2.5;
    const s = legs[0][0];
    this.pos = { x: s.x, y: s.y, z: s.z };
  }

  get waiting(): boolean {
    return this.to === null;
  }

  update(dt: number, hamster: { x: number; z: number }, crossingsDone: number): void {
    if (this.to) {
      this.t += dt;
      const k = Math.min(1, this.t / this.hopTime);
      const to = this.to;
      this.pos.x = this.from.x + (to.x - this.from.x) * k;
      this.pos.z = this.from.z + (to.z - this.from.z) * k;
      this.pos.y = this.from.y + (to.y - this.from.y) * k + Math.sin(k * Math.PI) * HOP_HEIGHT;
      this.hopK = k;
      if (k >= 1) {
        this.pos.y = to.y;
        this.hopK = 0;
        this.to = null;
        this.nextHop();
      }
      return;
    }
    const leg = this.legs[this.leg];
    if (!this.crossed) {
      const s = leg[0];
      if (Math.hypot(hamster.x - s.x, hamster.z - s.z) < this.startNear) {
        this.crossed = true;
        this.queue = leg.slice(1);
        this.nextHop();
      }
    } else if (crossingsDone > this.leg && this.leg < this.legs.length - 1) {
      this.leg++;
      this.crossed = false;
      this.queue = this.overland(this.pos, this.legs[this.leg][0]);
      this.nextHop();
    }
  }

  /** Short hops in a straight line to `target` (the last one lands exactly on it). */
  private overland(a: Pt, target: Pt): Pt[] {
    const d = Math.hypot(target.x - a.x, target.z - a.z);
    const n = Math.max(1, Math.ceil(d / MAX_HOP));
    const out: Pt[] = [];
    for (let i = 1; i < n; i++) {
      const k = i / n;
      out.push({ x: a.x + (target.x - a.x) * k, y: a.y + (target.y - a.y) * k, z: a.z + (target.z - a.z) * k });
    }
    out.push(target);
    return out;
  }

  private nextHop(): void {
    const next = this.queue.shift();
    if (!next) return;
    this.from = { ...this.pos };
    this.to = next;
    this.t = 0;
    this.heading = Math.atan2(next.x - this.pos.x, next.z - this.pos.z);
  }
}
