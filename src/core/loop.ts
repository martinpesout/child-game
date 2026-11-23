/** Fixed-step game loop: physics runs in `step`-sized chunks, frame time is capped to `maxFrame`. */
export class GameLoop {
  private last: number | null = null;
  private acc = 0;
  private raf = 0;

  constructor(
    private readonly step: number,
    private readonly maxFrame: number,
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  tick(nowMs: number): void {
    if (this.last === null) {
      this.last = nowMs;
      this.render(0);
      return;
    }
    const frame = Math.min((nowMs - this.last) / 1000, this.maxFrame);
    this.last = nowMs;
    this.acc += frame;
    // small epsilon so float drift doesn't drop a step
    while (this.acc + 1e-9 >= this.step) {
      this.update(this.step);
      this.acc -= this.step;
    }
    this.render(Math.max(0, this.acc) / this.step);
  }

  start(): void {
    const frame = (t: number) => {
      this.tick(t);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.last = null;
    this.acc = 0;
  }
}
