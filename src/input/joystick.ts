type Vec2 = { x: number; y: number };

/**
 * Converts a drag from `origin` to `current` (screen px, y down) into a stick vector
 * (y up = forward). Clamped to length 1, with a rescaled dead zone.
 */
export function joystickVector(origin: Vec2, current: Vec2, radius: number, deadZone: number): Vec2 {
  const dx = current.x - origin.x;
  const dy = origin.y - current.y;
  const len = Math.hypot(dx, dy);
  const mag = Math.min(len / radius, 1);
  if (mag <= deadZone || len === 0) return { x: 0, y: 0 };
  const scaled = (mag - deadZone) / (1 - deadZone);
  return { x: (dx / len) * scaled + 0, y: (dy / len) * scaled + 0 };
}
