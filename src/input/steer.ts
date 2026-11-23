/** "Toy car" steering for the camera-behind mode: up = forward, left/right = turn, down = slow reverse. */
export const STEER = { turnRate: 2.6, reverseSpeed: 0.45 };

/**
 * Heading uses the hamster's convention: facing direction is (sin h, cos h).
 * Returns the new heading and the world-space wish direction for physics.
 */
export function steer(move: { x: number; y: number }, heading: number, dt: number): { heading: number; wish: { x: number; z: number }; reverse: boolean } {
  const h = heading - move.x * STEER.turnRate * dt;
  const reverse = move.y < 0;
  const speed = reverse ? move.y * STEER.reverseSpeed : move.y;
  return { heading: h, wish: { x: Math.sin(h) * speed + 0, z: Math.cos(h) * speed + 0 }, reverse };
}
