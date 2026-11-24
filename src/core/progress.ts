import { storage } from './storage';

interface Store {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Which levels are unlocked and the best stars per level (levels are numbered from 1). */
export class LevelProgress {
  unlocked: number;

  constructor(private readonly levelCount: number, private readonly store: Store = storage) {
    const saved = num(store.get<unknown>('progress.unlocked', null), 0);
    // players from before the level map: finishing level 1 unlocks level 2
    const fromStars = this.best(1) > 0 ? 2 : 1;
    this.unlocked = Math.min(levelCount, Math.max(1, saved, fromStars));
  }

  best(level: number): number {
    return Math.max(0, Math.min(3, num(this.store.get<unknown>(`stars.level${level}`, 0), 0)));
  }

  isUnlocked(level: number): boolean {
    return level >= 1 && level <= this.unlocked;
  }

  complete(level: number, stars: number): void {
    if (stars > this.best(level)) this.store.set(`stars.level${level}`, stars);
    this.unlocked = Math.min(this.levelCount, Math.max(this.unlocked, level + 1));
    this.store.set('progress.unlocked', this.unlocked);
  }

  /** Furthest unlocked level. */
  current(): number {
    return this.unlocked;
  }
}
