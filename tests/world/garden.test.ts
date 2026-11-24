import * as THREE from 'three';
import { tubeColliders, tubeZone, puddleCollider, makeWheel, makeHoop, setGateState, TUBE_INNER } from '../../src/world/garden';
import { stepBody, type Body, type PhysicsWorld } from '../../src/physics/physics';
import type { Gate } from '../../src/levels/course';

const gate = (dirX: number, dirZ: number): Gate => ({ s: 0, x: 0, z: 0, dirX, dirZ, radius: 0.7, kind: 'tube' });
const body = (x: number, z: number): Body => ({ pos: { x, y: 0, z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true });
const run = (b: Body, w: PhysicsWorld, s: number, wish: { x: number; z: number }) => {
  for (let t = 0; t < s; t += 1 / 60) stepBody(b, wish, false, 1 / 60, w);
};

it('roura jde proběhnout podél osy bez zaseknutí (i šikmo položená)', () => {
  const d = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
  const w: PhysicsWorld = { colliders: tubeColliders(gate(d.x, d.z), 3), bounds: { halfSize: 20 } };
  const b = body(-2 * d.x, -2 * d.z);
  run(b, w, 2, d);
  expect(b.pos.x * d.x + b.pos.z * d.z).toBeGreaterThan(2);
  expect(b.pos.y).toBeCloseTo(0);
});

it('do roury nejde vstoupit bokem', () => {
  const w: PhysicsWorld = { colliders: tubeColliders(gate(0, -1), 3), bounds: { halfSize: 20 } };
  const b = body(-2, 0);
  run(b, w, 2, { x: 1, z: 0 });
  expect(b.pos.x).toBeLessThan(-TUBE_INNER);
});

it('zóna roury: uvnitř ano, vedle ne', () => {
  const inside = tubeZone(gate(0, -1), 3);
  expect(inside(0, 1)).toBe(true);
  expect(inside(2, 0)).toBe(false);
  expect(inside(0, 3)).toBe(false);
});

it('do kaluže nejde vstoupit', () => {
  const w: PhysicsWorld = { colliders: [puddleCollider(0, -3, 1.2)], bounds: { halfSize: 20 } };
  const b = body(0, 0);
  run(b, w, 3, { x: 0, z: -1 });
  expect(Math.hypot(b.pos.x, b.pos.z + 3)).toBeGreaterThanOrEqual(1.2 + 0.25 - 1e-3);
});

it('křeččí kolo se točí', () => {
  const w = makeWheel();
  const before = w.rotor.rotation.x;
  w.spin(0.5, 3);
  expect(w.rotor.rotation.x).not.toBe(before);
  expect(w.seat.y).toBeLessThan(0.3);
});

it('stav brány mění barvu', () => {
  const h = makeHoop(gate(0, -1));
  setGateState(h, 'done', 0);
  const green = (h.userData.ring as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.getHex();
  setGateState(h, 'next', 0);
  const gold = (h.userData.ring as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.getHex();
  expect(green).not.toBe(gold);
});

it('obruč má u nožek překážky, kolem nich se neproběhne', async () => {
  const { hoopColliders } = await import('../../src/world/garden');
  const w: PhysicsWorld = { colliders: hoopColliders(gate(0, -1)), bounds: { halfSize: 20 } };
  const b = body(0.71, 2);
  let minD = Infinity;
  for (let t = 0; t < 2; t += 1 / 60) {
    stepBody(b, { x: 0, z: -1 }, false, 1 / 60, w);
    minD = Math.min(minD, Math.hypot(b.pos.x - 0.7125, b.pos.z));
  }
  expect(minD).toBeGreaterThanOrEqual(0.1 + 0.25 - 1e-3); // never runs through the foot
});
