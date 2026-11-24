import * as THREE from 'three';
import { LEVEL4, penColliders, insidePen } from '../../src/levels/level4Data';
import { stepBody, type Body, type PhysicsWorld } from '../../src/physics/physics';
import { makeMound } from '../../src/world/burrow';

it('8 hromádek: 4 venku, 2 v každé ohradě; žádná ve stromu ani v plotu', () => {
  const m = LEVEL4.mounds;
  expect(m).toHaveLength(8);
  expect(m.filter((x) => x.pen === 0)).toHaveLength(4);
  expect(m.filter((x) => x.pen === 1)).toHaveLength(2);
  expect(m.filter((x) => x.pen === 2)).toHaveLength(2);
  for (const x of m) {
    expect(Math.hypot(x.x - LEVEL4.tree.x, x.z - LEVEL4.tree.z)).toBeGreaterThan(LEVEL4.tree.r + 1);
    LEVEL4.pens.forEach((p, i) => expect(insidePen(p, x.x, x.z)).toBe(x.pen === i + 1));
    for (const p of LEVEL4.pens) for (const c of penColliders(p)) {
      if (c.kind === 'cylinder') expect(Math.hypot(x.x - c.x, x.z - c.z)).toBeGreaterThan(c.radius + 0.8);
    }
  }
});

it('plot ohrady je vyšší než skok a bez mezer', () => {
  for (const p of LEVEL4.pens) {
    const cs = penColliders(p);
    for (const c of cs) expect(c.height).toBeGreaterThan(1.0);
    // walking straight out of the pen in 36 directions never passes
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
      const b: Body = { pos: { x: p.x, y: 0, z: p.z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
      const w: PhysicsWorld = { colliders: cs, bounds: { halfSize: 20 } };
      for (let i = 0; i < 240; i++) stepBody(b, { x: Math.cos(a), z: Math.sin(a) }, i % 30 === 0, 1 / 60, w);
      expect(insidePen(p, b.pos.x, b.pos.z)).toBe(true);
    }
  }
});

it('díra je venku u ohrady, výstupní a zpáteční krtinec uvnitř', () => {
  for (const p of LEVEL4.pens) {
    expect(insidePen(p, p.hole.x, p.hole.z)).toBe(false);
    expect(Math.hypot(p.hole.x - p.x, p.hole.z - p.z)).toBeLessThan(Math.max(p.rx, p.rz) + 2);
    expect(insidePen(p, p.inside.x, p.inside.z)).toBe(true);
    expect(insidePen(p, p.back.x, p.back.z)).toBe(true);
  }
});

it('bonus na povrchu je mimo ohrady a strom', () => {
  const b = LEVEL4.bonus;
  for (const p of LEVEL4.pens) expect(insidePen(p, b.x, b.z)).toBe(false);
  expect(Math.hypot(b.x - LEVEL4.tree.x, b.z - LEVEL4.tree.z)).toBeGreaterThan(LEVEL4.tree.r + 0.4);
});

it('hromádka se po vyhrabání zmenší na plocho', () => {
  const m = makeMound(1);
  const h = () => new THREE.Box3().setFromObject(m.root).max.y;
  const full = h();
  m.setLeft(1);
  expect(h()).toBeLessThan(full);
  m.setLeft(0);
  expect(h()).toBeLessThan(0.08);
});
