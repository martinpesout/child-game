/** Tiny custom physics: a sphere-ish body on flat ground with cylinder/box obstacles standing on y = 0. */

export type Collider =
  | { kind: 'cylinder'; x: number; z: number; radius: number; height: number }
  | { kind: 'box'; x: number; z: number; halfX: number; halfZ: number; height: number };

export interface Body {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  radius: number;
  grounded: boolean;
}

export interface PhysicsWorld {
  colliders: Collider[];
  bounds: { halfSize: number };
}

export const PHYS = { gravity: 18, jumpSpeed: 5.2, maxSpeed: 3.2, accel: 20, stepUp: 0.05 };

const MAX_SUBSTEP = 1 / 120;
/** How far past a collider's edge the body's centre may be and still stand on its top. */
const STAND_MARGIN = 0.5;

/** Highest collider top under the body (centre within footprint + radius*STAND_MARGIN), else 0. */
export function topHeightAt(x: number, z: number, radius: number, world: PhysicsWorld): number {
  let top = 0;
  const m = radius * STAND_MARGIN;
  for (const c of world.colliders) {
    if (c.height <= top) continue;
    const inside =
      c.kind === 'cylinder'
        ? Math.hypot(x - c.x, z - c.z) < c.radius + m
        : Math.abs(x - c.x) < c.halfX + m && Math.abs(z - c.z) < c.halfZ + m;
    if (inside) top = c.height;
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
    if (c.height <= b.pos.y + PHYS.stepUp) continue;
    pushOut(b, c);
  }

  // world bounds
  const lim = world.bounds.halfSize - b.radius;
  if (b.pos.x > lim) { b.pos.x = lim; b.vel.x = Math.min(0, b.vel.x); }
  if (b.pos.x < -lim) { b.pos.x = -lim; b.vel.x = Math.max(0, b.vel.x); }
  if (b.pos.z > lim) { b.pos.z = lim; b.vel.z = Math.min(0, b.vel.z); }
  if (b.pos.z < -lim) { b.pos.z = -lim; b.vel.z = Math.max(0, b.vel.z); }

  // floor
  const floor = topHeightAt(b.pos.x, b.pos.z, b.radius, world);
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
    const lx = b.pos.x - c.x;
    const lz = b.pos.z - c.z;
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
  }
  b.pos.x += nx * pen;
  b.pos.z += nz * pen;
  const vn = b.vel.x * nx + b.vel.z * nz;
  if (vn < 0) {
    b.vel.x -= vn * nx;
    b.vel.z -= vn * nz;
  }
}
