import type { Controller, InputState } from './types';

const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const ACTION = ['Space'];

export class KeyboardController implements Controller {
  private down = new Set<string>();
  private readonly onDown = (e: KeyboardEvent) => {
    this.down.add(e.code);
    if ([...UP, ...DOWN, ...LEFT, ...RIGHT, ...ACTION].includes(e.code)) e.preventDefault();
  };
  private readonly onUp = (e: KeyboardEvent) => this.down.delete(e.code);
  private readonly onBlur = () => this.reset();

  constructor(private readonly target: Window) {
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }

  read(): InputState {
    const any = (codes: string[]) => codes.some((c) => this.down.has(c));
    let x = (any(RIGHT) ? 1 : 0) - (any(LEFT) ? 1 : 0);
    let y = (any(UP) ? 1 : 0) - (any(DOWN) ? 1 : 0);
    const len = Math.hypot(x, y);
    if (len > 0) {
      x /= len;
      y /= len;
    }
    return { move: { x: x + 0, y: y + 0 }, action: any(ACTION) };
  }

  reset(): void {
    this.down.clear();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}
