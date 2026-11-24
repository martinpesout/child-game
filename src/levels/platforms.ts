/** Moving platforms of the brook level (pure logic; the level moves colliders and meshes from these). */

/** A lily pad that sinks once the hamster stands on it a while, and surfaces again when left alone. */
export class LilyPad {
  /** How far the top is below its resting height (0..depth). */
  drop = 0;
  sinking = false;
  shaking = false;
  private stood = 0;
  private readonly delay: number;
  private readonly sinkRate: number;
  private readonly riseRate: number;
  private readonly depth: number;

  constructor(opts: { delay?: number; sink?: number; rise?: number; depth?: number } = {}) {
    this.delay = opts.delay ?? 1.5;
    this.depth = opts.depth ?? 0.45;
    this.sinkRate = this.depth / (opts.sink ?? 1.5);
    this.riseRate = this.depth / (opts.rise ?? 2);
  }

  update(dt: number, occupied: boolean): void {
    if (occupied) {
      this.stood += dt;
      if (this.stood >= this.delay) this.sinking = true;
    } else {
      this.stood = 0;
      this.sinking = false;
    }
    this.shaking = occupied && this.stood >= this.delay - 0.6;
    if (this.sinking) this.drop = Math.min(this.depth, this.drop + this.sinkRate * dt);
    else this.drop = Math.max(0, this.drop - this.riseRate * dt);
  }
}

/** Swing of the floating log along the current (±0.5 m, 3 s) and a gentle bob (±5 cm). */
export function logOffset(t: number): { along: number; bob: number } {
  return { along: 0.5 * Math.sin((2 * Math.PI * t) / 3), bob: 0.05 * Math.sin((2 * Math.PI * t) / 1.7) };
}
