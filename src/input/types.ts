/** Abstract input the game reads. `move.x` = right, `move.y` = forward (away from camera); length ≤ 1. */
export interface InputState {
  move: { x: number; y: number };
  action: boolean;
}

/** Source of input: touch, keyboard, later a phone over the network. */
export interface Controller {
  read(): InputState;
  reset(): void;
  dispose(): void;
}

export const idleInput = (): InputState => ({ move: { x: 0, y: 0 }, action: false });
