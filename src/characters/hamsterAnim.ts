export type HamsterMood = 'idle' | 'run' | 'air' | 'celebrate';

const PUFF_TIME = 0.6;
const CELEBRATE_TIME = 1.2;
const BLINK_TIME = 0.15;

/** Pure animation state for the hamster; the mesh reads these values. */
export class HamsterAnim {
  mood: HamsterMood = 'idle';
  cheekPuff = 0;
  gaitPhase = 0;
  blink = 0;
  time = 0;
  celebrateProgress = 0;

  private puffTimer = 0;
  private celebrateTimer = 0;
  private nextBlink = 2 + Math.random() * 3;
  private blinkTimer = 0;

  update(dt: number, speed: number, grounded: boolean): void {
    this.time += dt;

    if (this.celebrateTimer > 0) {
      this.celebrateTimer -= dt;
      this.celebrateProgress = Math.min(1, 1 - this.celebrateTimer / CELEBRATE_TIME);
    }
    if (this.celebrateTimer > 0) this.mood = 'celebrate';
    else if (!grounded) this.mood = 'air';
    else if (speed > 0.2) this.mood = 'run';
    else this.mood = 'idle';

    if (this.mood === 'run') this.gaitPhase += dt * (4 + speed * 4);

    if (this.puffTimer > 0) {
      this.puffTimer -= dt;
      this.cheekPuff = this.puffTimer > 0 ? Math.min(1, this.puffTimer / (PUFF_TIME / 2)) : 0;
    }

    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blinkTimer = BLINK_TIME;
      this.nextBlink = 2 + Math.random() * 3;
    }
    if (this.blinkTimer > 0) {
      this.blinkTimer -= dt;
      this.blink = this.blinkTimer > 0 ? Math.sin((1 - this.blinkTimer / BLINK_TIME) * Math.PI) : 0;
    }
  }

  puffCheeks(): void {
    this.puffTimer = PUFF_TIME;
    this.cheekPuff = 1;
  }

  celebrate(): void {
    this.celebrateTimer = CELEBRATE_TIME;
    this.celebrateProgress = 0;
    this.mood = 'celebrate';
  }
}
