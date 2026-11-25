/** The sleeping cat's "statues" game (pure logic): sleep → warning → looking → sleep… Moving while it looks gets you caught. */

export type CatState = 'sleep' | 'warn' | 'look';

const CAUGHT_SPEED = 0.25;
const GRACE = 1;

export class CatWatch {
  state: CatState = 'sleep';
  /** Time spent in the current state. */
  t = 0;
  /** Seconds of quiet after being caught (no checks). */
  grace = 0;
  /** Finished sleep–warn–look cycles. */
  cycles = 0;
  private readonly firstSleep: number;
  private readonly laterSleep: number;
  private readonly warn: number;
  private readonly look: number;
  private readonly easyAfter: number;
  private sleepFor: number;
  private caughtThisLook = false;
  private strikes = 0;
  private deepNext = false;

  constructor(opts: { firstSleep?: number; laterSleep?: number; warn?: number; look?: number; easyAfter?: number } = {}) {
    this.firstSleep = opts.firstSleep ?? 4.5;
    this.laterSleep = opts.laterSleep ?? 2.8;
    this.warn = opts.warn ?? 1.5;
    this.look = opts.look ?? 2;
    this.easyAfter = opts.easyAfter ?? 2;
    this.sleepFor = this.firstSleep;
  }

  /** Seconds of sleep left (only meaningful while sleeping). */
  get sleepLeft(): number {
    return this.state === 'sleep' ? this.sleepFor - this.t : 0;
  }

  /** 0..1 progress through the current state (eye opening during the warning, etc.). */
  get progress(): number {
    const len = this.state === 'sleep' ? this.sleepFor : this.state === 'warn' ? this.warn : this.look;
    return Math.min(1, this.t / len);
  }

  update(dt: number, hamster: { speed: number; hidden: boolean }): 'caught' | null {
    this.t += dt;
    this.grace = Math.max(0, this.grace - dt);
    let result: 'caught' | null = null;
    if (this.state === 'look' && !this.caughtThisLook && this.grace === 0 && hamster.speed > CAUGHT_SPEED && !hamster.hidden) {
      this.caughtThisLook = true;
      this.strikes++;
      this.grace = GRACE;
      result = 'caught';
    }
    if (this.state === 'sleep' && this.t >= this.sleepFor) this.enter('warn');
    else if (this.state === 'warn' && this.t >= this.warn) this.enter('look');
    else if (this.state === 'look' && this.t >= this.look) {
      if (!this.caughtThisLook) this.strikes = 0;
      if (this.strikes >= 2) {
        this.deepNext = true;
        this.strikes = 0;
      }
      this.cycles++;
      this.sleepFor = (this.cycles < this.easyAfter ? this.firstSleep : this.laterSleep) * (this.deepNext ? 2 : 1);
      this.deepNext = false;
      this.enter('sleep');
    }
    return result;
  }

  private enter(s: CatState): void {
    this.state = s;
    this.t = 0;
    if (s === 'look') this.caughtThisLook = false;
  }
}
