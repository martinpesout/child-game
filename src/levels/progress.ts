import type { ItemKind } from './level1Data';

/** Completion = always ≥ 1 star; all bonuses = 3. */
export function computeStars(complete: boolean, bonuses: number, bonusTotal: number): number {
  if (!complete) return 0;
  if (bonusTotal <= 0) return 1;
  return Math.min(3, 1 + Math.floor((2 * bonuses) / bonusTotal));
}

export class Progress {
  nuts = 0;
  bonuses = 0;
  constructor(readonly nutsTotal: number, readonly bonusTotal: number) {}

  collect(kind: ItemKind): void {
    if (kind === 'nut') this.nuts++;
    else this.bonuses++;
  }

  isComplete(): boolean {
    return this.nuts >= this.nutsTotal;
  }

  stars(): number {
    return computeStars(this.isComplete(), this.bonuses, this.bonusTotal);
  }
}

/** Returns true once `delay` seconds pass without collecting anything. */
export class HintTimer {
  private t = 0;
  constructor(private readonly delay = 20) {}

  update(dt: number, collectedThisFrame: boolean): boolean {
    if (collectedThisFrame) {
      this.t = 0;
      return false;
    }
    this.t += dt;
    return this.t >= this.delay;
  }
}
