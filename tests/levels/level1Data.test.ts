import { LEVEL1 } from '../../src/levels/level1Data';
import { PHYS, type Collider } from '../../src/physics/physics';

const JUMP = (PHYS.jumpSpeed * PHYS.jumpSpeed) / (2 * PHYS.gravity);
const horizDist = (x: number, z: number, c: Collider) => {
  if (c.kind === 'cylinder') return Math.hypot(x - c.x, z - c.z) - c.radius;
  const dx = Math.max(0, Math.abs(x - c.x) - c.halfX);
  const dz = Math.max(0, Math.abs(z - c.z) - c.halfZ);
  return Math.hypot(dx, dz);
};

it('má 10 oříšků a 3 různé bonusy', () => {
  expect(LEVEL1.items.filter((i) => i.kind === 'nut')).toHaveLength(10);
  const bonus = LEVEL1.items.filter((i) => i.kind !== 'nut').map((i) => i.kind);
  expect(new Set(bonus)).toEqual(new Set(['strawberry', 'carrot', 'apple']));
});

it('žádná dobrota ani ježek nejsou uvnitř keře/domku/stromu', () => {
  const tall = LEVEL1.colliders.filter((c) => c.height > JUMP);
  for (const p of [...LEVEL1.items, LEVEL1.hedgehog, LEVEL1.spawn])
    for (const c of tall) expect(horizDist(p.x, p.z, c)).toBeGreaterThanOrEqual(0.25 + 0.3);
});

it('právě jedna dobrota leží na nízkém kameni, na který jde vyskočit', () => {
  const onRock = LEVEL1.items.filter((i) => i.y > 0);
  expect(onRock).toHaveLength(1);
  const rock = LEVEL1.colliders.find((c) => horizDist(onRock[0].x, onRock[0].z, c) === 0)!;
  expect(rock.height).toBeLessThanOrEqual(JUMP * 0.8);
  expect(onRock[0].y).toBe(rock.height);
});

it('dobroty na zemi nejsou pod žádným colliderem', () => {
  for (const i of LEVEL1.items.filter((i) => i.y === 0))
    for (const c of LEVEL1.colliders) expect(horizDist(i.x, i.z, c)).toBeGreaterThan(0.3);
});

it('všechno je uvnitř louky s rezervou 1 m', () => {
  for (const p of [...LEVEL1.items, LEVEL1.hedgehog, LEVEL1.spawn, LEVEL1.house]) {
    expect(Math.abs(p.x)).toBeLessThanOrEqual(LEVEL1.halfSize - 1);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(LEVEL1.halfSize - 1);
  }
});

it('keře, domek a strom jsou vyšší než skok, kameny nižší', () => {
  for (const p of LEVEL1.props) {
    if (p.type === 'rock') expect(p.collider.height).toBeLessThan(JUMP);
    else expect(p.collider.height).toBeGreaterThan(JUMP);
  }
  expect(LEVEL1.colliders).toHaveLength(LEVEL1.props.length);
});
