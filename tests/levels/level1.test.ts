import * as THREE from 'three';
import { Level1Meadow } from '../../src/levels/level1';
import { LEVEL1 } from '../../src/levels/level1Data';
import type { LevelEvents } from '../../src/levels/level';

const idle = { move: { x: 0, y: 0 }, action: false };
const events = (): LevelEvents & { collected: string[]; completed: number[] } => {
  const e = {
    collected: [] as string[],
    completed: [] as number[],
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
