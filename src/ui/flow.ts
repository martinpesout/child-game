export type Screen = 'title' | 'map' | 'story' | 'playing' | 'paused' | 'levelEnd' | 'comingSoon';

/** Screen state machine; invalid transitions are ignored. `canPlay(n)` says whether level n may be started. */
export class Flow {
  screen: Screen = 'title';
  current = 1;
  lastStars = 0;
  private listeners: ((s: Screen) => void)[] = [];

  constructor(private readonly canPlay: (level: number) => boolean = () => true) {}

  onChange(cb: (s: Screen) => void): void {
    this.listeners.push(cb);
  }

  start(): void { this.go('title', 'map'); }

  pick(level: number): void {
    if (this.screen !== 'map' || !this.canPlay(level)) return;
    this.current = level;
    this.set('story');
  }

  continue(): void { this.go('story', 'playing'); }

  complete(stars: number): void {
    if (this.screen !== 'playing') return;
    this.lastStars = stars;
    this.set('levelEnd');
  }

  retry(): void { this.go('levelEnd', 'playing'); }

  next(): void {
    if (this.screen !== 'levelEnd') return;
    if (this.canPlay(this.current + 1)) {
      this.current++;
      this.set('story');
    } else this.set('comingSoon');
  }

  toMap(): void {
    if (this.screen === 'levelEnd' || this.screen === 'paused' || this.screen === 'comingSoon') this.set('map');
  }

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
