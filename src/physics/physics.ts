/** Tiny custom physics: a sphere-ish body on flat ground with cylinder/box obstacles standing on y = 0. */

export type Collider =
  | { kind: 'cylinder'; x: number; z: number; radius: number; height: number }
  | { kind: 'box'; x: number; z: number; halfX: number; halfZ: number; height: number; yaw?: number };

export interface Body {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  radius: number;
  grounded: boolean;
}

export interface PhysicsWorld {
  colliders: Collider[];
  bounds: { halfSize: number };
  /** Terrain height; missing = flat ground at y = 0. Collider heights are measured from the ground at their centre. */
  ground?: (x: number, z: number) => number;
}

export function groundAt(x: number, z: number, world: PhysicsWorld): number {
  return world.ground ? world.ground(x, z) : 0;
}

/** World-space top of a collider (ground at its centre + its height). */
export function colliderTop(c: Collider, world: PhysicsWorld): number {
  return groundAt(c.x, c.z, world) + c.height;
}

/** Offset (dx, dz) from a box centre expressed in the box's local axes. */
function toLocal(c: Extract<Collider, { kind: 'box' }>, dx: number, dz: number): [number, number] {
  const yaw = c.yaw ?? 0;
  if (!yaw) return [dx, dz];
  const co = Math.cos(yaw);
  const si = Math.sin(yaw);
  return [dx * co - dz * si, dx * si + dz * co];
}

function toWorld(c: Extract<Collider, { kind: 'box' }>, lx: number, lz: number): [number, number] {
  const yaw = c.yaw ?? 0;
  if (!yaw) return [lx, lz];
  const co = Math.cos(yaw);
  const si = Math.sin(yaw);
  return [lx * co + lz * si, -lx * si + lz * co];
}

export const PHYS = { gravity: 18, jumpSpeed: 5.2, maxSpeed: 3.2, accel: 20, stepUp: 0.05 };

const MAX_SUBSTEP = 1 / 120;
/** How far past a collider's edge the body's centre may be and still stand on its top. */
const STAND_MARGIN = 0.5;
/** Max drop per substep that still counts as walking on the ground (downhill). */
const GROUND_SNAP = 0.06;

/** Highest surface under the body: terrain, or a collider top (centre within footprint + radius*STAND_MARGIN). */
export function topHeightAt(x: number, z: number, radius: number, world: PhysicsWorld): number {
  let top = groundAt(x, z, world);
  const m = radius * STAND_MARGIN;
  for (const c of world.colliders) {
    const cTop = colliderTop(c, world);
    if (cTop <= top) continue;
    let inside: boolean;
    if (c.kind === 'cylinder') inside = Math.hypot(x - c.x, z - c.z) < c.radius + m;
    else {
      const [lx, lz] = toLocal(c, x - c.x, z - c.z);
      inside = Math.abs(lx) < c.halfX + m && Math.abs(lz) < c.halfZ + m;
    }
    if (inside) top = cTop;
  }
  return top;
}

export function stepBody(body: Body, wish: { x: number; z: number }, jump: boolean, dt: number, world: PhysicsWorld): void {
  const n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP - 1e-9));
  const h = dt / n;
  for (let i = 0; i < n; i++) substep(body, wish, jump && i === 0, h, world);
}

function substep(b: Body, wish: { x: number; z: number }, jump: boolean, h: number, world: PhysicsWorld): void {
  // horizontal velocity approaches the wished velocity
  const wl = Math.hypot(wish.x, wish.z);
  const k = wl > 1 ? 1 / wl : 1;
  const tx = wish.x * k * PHYS.maxSpeed;
  const tz = wish.z * k * PHYS.maxSpeed;
  const dx = tx - b.vel.x;
  const dz = tz - b.vel.z;
  const dl = Math.hypot(dx, dz);
  const maxDv = PHYS.accel * h;
  if (dl <= maxDv) {
    b.vel.x = tx;
    b.vel.z = tz;
  } else {
    b.vel.x += (dx / dl) * maxDv;
    b.vel.z += (dz / dl) * maxDv;
  }

  if (jump && b.grounded) {
    b.vel.y = PHYS.jumpSpeed;
    b.grounded = false;
  }
  b.vel.y -= PHYS.gravity * h;

  b.pos.x += b.vel.x * h;
  b.pos.z += b.vel.z * h;
  b.pos.y += b.vel.y * h;

  // push out of obstacles taller than we can step onto
  for (const c of world.colliders) {
    if (colliderTop(c, world) <= b.pos.y + PHYS.stepUp) continue;
    pushOut(b, c);
  }

  // world bounds
  const lim = world.bounds.halfSize - b.radius;
  if (b.pos.x > lim) { b.pos.x = lim; b.vel.x = Math.min(0, b.vel.x); }
  if (b.pos.x < -lim) { b.pos.x = -lim; b.vel.x = Math.max(0, b.vel.x); }
  if (b.pos.z > lim) { b.pos.z = lim; b.vel.z = Math.min(0, b.vel.z); }
  if (b.pos.z < -lim) { b.pos.z = -lim; b.vel.z = Math.max(0, b.vel.z); }

  // floor (stick to the ground when walking downhill instead of hopping)
  const floor = topHeightAt(b.pos.x, b.pos.z, b.radius, world);
  const wasGrounded = b.grounded;
  if (wasGrounded && b.vel.y <= 0 && b.pos.y - floor < GROUND_SNAP) b.pos.y = floor;
  if (b.pos.y <= floor && b.vel.y <= 0) {
    b.pos.y = floor;
    b.vel.y = 0;
    b.grounded = true;
  } else {
    b.grounded = false;
  }
}

function pushOut(b: Body, c: Collider): void {
  let nx: number;
  let nz: number;
  let pen: number;
  if (c.kind === 'cylinder') {
    const dx = b.pos.x - c.x;
    const dz = b.pos.z - c.z;
    const d = Math.hypot(dx, dz);
    const min = c.radius + b.radius;
    if (d >= min) return;
    if (d < 1e-6) { nx = 1; nz = 0; } else { nx = dx / d; nz = dz / d; }
    pen = min - d;
  } else {
    const [lx, lz] = toLocal(c, b.pos.x - c.x, b.pos.z - c.z);
    const cx = Math.max(-c.halfX, Math.min(c.halfX, lx));
    const cz = Math.max(-c.halfZ, Math.min(c.halfZ, lz));
    const dx = lx - cx;
    const dz = lz - cz;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) {
      if (d >= b.radius) return;
      nx = dx / d; nz = dz / d; pen = b.radius - d;
    } else {
      // centre inside the box: leave along the shallowest axis
      const px = c.halfX - Math.abs(lx);
      const pz = c.halfZ - Math.abs(lz);
      if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + b.radius; }
      else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + b.radius; }
    }
    [nx, nz] = toWorld(c, nx, nz);
  }
  b.pos.x += nx * pen;
  b.pos.z += nz * pen;
  const vn = b.vel.x * nx + b.vel.z * nz;
  if (vn < 0) {
    b.vel.x -= vn * nx;
    b.vel.z -= vn * nz;
  }
}
