import * as THREE from 'three';
import { Level1Meadow } from '../../src/levels/level1';
import { LEVEL1 } from '../../src/levels/level1Data';
import type { LevelEvents } from '../../src/levels/level';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = (): LevelEvents & { collected: string[]; completed: number[]; jumps: number; steps: number } => {
  const e = {
    collected: [] as string[],
    completed: [] as number[],
    jumps: 0,
    steps: 0,
    onJump: () => e.jumps++,
    onStep: () => e.steps++,
    onCollect: (k: string) => e.collected.push(k),
    onComplete: (s: number) => e.completed.push(s),
    onNearNpc: () => {},
  };
  return e;
};

it('dvojí setup/dispose (Znovu) nechá ve scéně stejný počet objektů a 13 dobrot', () => {
  const scene = new THREE.Scene();
  const a = new Level1Meadow();
  a.setup(scene, events());
  const count = scene.children.length;
  expect(a.treatsLeft).toBe(13);
  a.dispose();
  expect(scene.children.length).toBe(0);
  const b = new Level1Meadow();
  b.setup(scene, events());
  expect(scene.children.length).toBe(count);
  expect(b.treatsLeft).toBe(13);
  b.dispose();
});

it('dobrota pod křečkem se sebere právě jednou', () => {
  const scene = new THREE.Scene();
  const data = { ...LEVEL1, items: [{ kind: 'nut' as const, x: LEVEL1.spawn.x, z: LEVEL1.spawn.z, y: 0 }, ...LEVEL1.items.slice(1)] };
  const level = new Level1Meadow(data);
  const e = events();
  level.setup(scene, e);
  for (let i = 0; i < 10; i++) level.update(1 / 60, idle, 0);
  expect(e.collected).toEqual(['nut']);
  expect(level.treatsLeft).toBe(12);
  level.dispose();
});

it('po sebrání všech oříšků je kolo hotové a onComplete přijde jednou po oslavě', () => {
  const scene = new THREE.Scene();
  const nuts = Array.from({ length: 10 }, () => ({ kind: 'nut' as const, x: LEVEL1.spawn.x, z: LEVEL1.spawn.z, y: 0 }));
  const level = new Level1Meadow({ ...LEVEL1, items: nuts });
  const e = events();
  level.setup(scene, e);
  level.update(1 / 60, idle, 0);
  expect(level.isComplete()).toBe(true);
  expect(e.completed).toEqual([]);
  for (let i = 0; i < 180; i++) level.update(1 / 60, idle, 0);
  expect(e.completed).toEqual([1]);
  level.dispose();
});

it('skok a cupitání vyšlou události pro zvuky', () => {
  const scene = new THREE.Scene();
  const level = new Level1Meadow();
  const e = events();
  level.setup(scene, e);
  level.update(1 / 60, { move: { x: 0, y: 0 }, action: true }, 0);
  expect(e.jumps).toBe(1);
  for (let i = 0; i < 120; i++) level.update(1 / 60, { move: { x: 1, y: 0 }, action: false }, 0);
  expect(e.steps).toBeGreaterThan(3);
  level.dispose();
});

import { remainingText } from '../../src/levels/level1';

it('remainingText skloňuje česky', () => {
  expect(remainingText(1)).toBe('Ještě jeden oříšek!');
  expect(remainingText(4)).toBe('Ještě 4 oříšky!');
  expect(remainingText(6)).toBe('Ještě 6 oříšků!');
});

it('u ježka se onNearNpc ozve jednou a znovu nejdřív po 8 s', () => {
  const scene = new THREE.Scene();
  const near = { ...LEVEL1, spawn: { x: LEVEL1.hedgehog.x + 1, z: LEVEL1.hedgehog.z } };
  const level = new Level1Meadow(near);
  let n = 0;
  level.setup(scene, { ...events(), onNearNpc: () => n++ });
  for (let i = 0; i < 60; i++) level.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(n).toBe(1);
  for (let i = 0; i < 8 * 60; i++) level.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(n).toBe(2);
  level.dispose();
});

it('ježek je překážka – křeček jím neprojde', () => {
  const scene = new THREE.Scene();
  const near = { ...LEVEL1, spawn: { x: LEVEL1.hedgehog.x + 1.5, z: LEVEL1.hedgehog.z } };
  const level = new Level1Meadow(near);
  level.setup(scene, events());
  for (let i = 0; i < 120; i++) level.update(1 / 60, { move: { x: -1, y: 0 }, action: false }, 0);
  expect(level.player.position.x).toBeGreaterThan(LEVEL1.hedgehog.x + 0.4);
  level.dispose();
});

it('řízení jako autíčko: nahoru běží tam, kam se dívá, dolů couvá bez otočení', () => {
  const scene = new THREE.Scene();
  const level = new Level1Meadow();
  level.setup(scene, events());
  level.steering = true;
  const z0 = level.player.position.z;
  for (let i = 0; i < 30; i++) level.update(1 / 60, { move: { x: 0, y: 1 }, action: false }, 0);
  expect(level.player.position.z).toBeLessThan(z0 - 0.3); // starts facing -Z (heading π)
  expect(level.heading).toBeCloseTo(Math.PI);
  const z1 = level.player.position.z;
  for (let i = 0; i < 30; i++) level.update(1 / 60, { move: { x: 0, y: -1 }, action: false }, 0);
  expect(level.player.position.z).toBeGreaterThan(z1 + 0.1);
  expect(Math.abs(Math.atan2(Math.sin(level.player.rotation.y - Math.PI), Math.cos(level.player.rotation.y - Math.PI)))).toBeLessThan(0.05);
  level.dispose();
});

it('u včelky nebo motýla se ozve hláška, znovu nejdřív po 10 s', () => {
  const scene = new THREE.Scene();
  const level = new Level1Meadow();
  const seen: string[] = [];
  level.setup(scene, { ...events(), onCritter: (kind) => seen.push(kind) });
  const pin = () => {
    const c = level.critterObjects[0];
    level.player.position.copy(c.position).setY(0);
    (level as unknown as { body: { pos: { x: number; z: number } } }).body.pos.x = c.position.x;
    (level as unknown as { body: { pos: { x: number; z: number } } }).body.pos.z = c.position.z;
  };
  for (let i = 0; i < 60; i++) { pin(); level.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0); }
  expect(seen).toHaveLength(1);
  for (let i = 0; i < 10 * 60; i++) { pin(); level.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0); }
  expect(seen).toHaveLength(2);
  level.dispose();
});
