import type { Controller, InputState } from './types';

export class CombinedController implements Controller {
  constructor(private readonly list: Controller[]) {}

  read(): InputState {
    let x = 0;
    let y = 0;
    let action = false;
    for (const c of this.list) {
      const s = c.read();
      x += s.move.x;
      y += s.move.y;
      action ||= s.action;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { move: { x, y }, action };
  }

  reset(): void {
    this.list.forEach((c) => c.reset());
  }

  dispose(): void {
    this.list.forEach((c) => c.dispose());
  }
}

/** Maps stick input to a world XZ direction for a camera with the given yaw (three.js rotation.y). */
export function cameraRelative(move: { x: number; y: number }, cameraYaw: number): { x: number; z: number } {
  const s = Math.sin(cameraYaw);
  const c = Math.cos(cameraYaw);
  // right = (cos, -sin), forward = (-sin, -cos)
  return { x: move.x * c - move.y * s, z: -move.x * s - move.y * c };
}
