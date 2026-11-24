/** Race logic of the squirrel along the course: stays a little ahead, waits, never wins. */
export class SquirrelRunner {
  s = 0;
  waiting = false;
  /** Current speed (m/s) for the running animation. */
  speed = 0;

  constructor(
    private readonly courseLength: number,
    private readonly opts = { lead: 3, wait: 7, finishMargin: 1.5, speed: 3.6 },
  ) {}

  update(dt: number, playerS: number, playerDone: boolean): void {
    const o = this.opts;
    const target = playerDone ? this.courseLength : Math.min(playerS + o.lead, this.courseLength - o.finishMargin);
    this.waiting = !playerDone && this.s - playerS > o.wait;
    const before = this.s;
    if (!this.waiting && this.s < target) this.s = Math.min(target, this.s + o.speed * dt);
    this.speed = dt > 0 ? (this.s - before) / dt : 0;
  }
}
