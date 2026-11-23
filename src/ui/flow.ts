export type Screen = 'title' | 'story' | 'playing' | 'paused' | 'levelEnd' | 'comingSoon';

/** Screen state machine; invalid transitions are ignored. */
export class Flow {
  screen: Screen = 'title';
  lastStars = 0;
  private listeners: ((s: Screen) => void)[] = [];

  onChange(cb: (s: Screen) => void): void {
    this.listeners.push(cb);
  }

  start(): void { this.go('title', 'story'); }
  continue(): void { this.go('story', 'playing'); }
  complete(stars: number): void {
    if (this.screen !== 'playing') return;
    this.lastStars = stars;
    this.set('levelEnd');
  }
  retry(): void { this.go('levelEnd', 'playing'); }
  next(): void { this.go('levelEnd', 'comingSoon'); }
  home(): void { this.go('comingSoon', 'title'); }
  pause(): void { this.go('playing', 'paused'); }
  resume(): void { this.go('paused', 'playing'); }

  private go(from: Screen, to: Screen): void {
    if (this.screen === from) this.set(to);
  }

  private set(s: Screen): void {
    this.screen = s;
    this.listeners.forEach((cb) => cb(s));
  }
}
