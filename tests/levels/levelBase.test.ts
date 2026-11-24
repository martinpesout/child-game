import * as THREE from 'three';
import { LevelBase, type LevelLayout } from '../../src/levels/levelBase';
import { buildWorld } from '../../src/world/world';
import { Terrain } from '../../src/world/terrain';

class EmptyLevel extends LevelBase {
  protected layout(scene: THREE.Scene): LevelLayout {
    const view = buildWorld(scene, { halfSize: 10, terrain: Terrain.flat(), colliders: [], props: [], avoid: [] });
    return { view, physics: { colliders: [], bounds: { halfSize: 10 } }, spawn: { x: 0, z: 0, heading: Math.PI }, treats: [] };
  }
  get goal() {
    return { done: 0, total: 0, icon: 'nut' };
  }
  isComplete(): boolean {
    return true;
  }
}

const events = () => ({ onCollect: vi.fn(), onComplete: vi.fn(), onNearNpc: vi.fn() });

it('podtřída bez cílů je hned hotová a po oslavě pošle onComplete s 1 hvězdou', () => {
  const scene = new THREE.Scene();
  const l = new EmptyLevel();
  const e = events();
  l.setup(scene, e);
  for (let i = 0; i < 200; i++) l.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(e.onComplete).toHaveBeenCalledWith(1);
  l.dispose();
  expect(scene.children).toHaveLength(0);
});

it('křeček stojí na terénu při startu', () => {
  class Hilly extends EmptyLevel {
    protected layout(scene: THREE.Scene): LevelLayout {
      const r = super.layout(scene);
      r.physics.ground = () => 0.3;
      return r;
    }
  }
  const scene = new THREE.Scene();
  const l = new Hilly();
  l.setup(scene, events());
  l.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(l.player.position.y).toBeCloseTo(0.3);
  l.dispose();
});

it('onFinished přijde hned při splnění cíle (ještě před oslavou), právě jednou', () => {
  const scene = new THREE.Scene();
  const l = new EmptyLevel();
  const onFinished = vi.fn();
  const e = { ...events(), onFinished };
  l.setup(scene, e);
  l.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(onFinished).toHaveBeenCalledWith(1);
  expect(e.onComplete).not.toHaveBeenCalled();
  for (let i = 0; i < 200; i++) l.update(1 / 60, { move: { x: 0, y: 0 }, action: false }, 0);
  expect(onFinished).toHaveBeenCalledTimes(1);
  l.dispose();
});

it('stín pod křečkem je ve scéně a po dispose zmizí', () => {
  const scene = new THREE.Scene();
  const l = new EmptyLevel();
  l.setup(scene, events());
  expect(scene.getObjectByName('blobShadow')).toBeTruthy();
  l.dispose();
  expect(scene.getObjectByName('blobShadow')).toBeUndefined();
});

class ActionLevel extends EmptyLevel {
  mode: 'jump' | 'dig' | 'enter' = 'dig';
  actions: string[] = [];
  isComplete(): boolean {
    return false;
  }
  protected currentAction() {
    return this.mode;
  }
  protected onAction(m: 'jump' | 'dig' | 'enter') {
    this.actions.push(m);
  }
}
const press = (on: boolean) => ({ move: { x: 0, y: 0 }, action: on });
const bodyY = (l: LevelBase) => (l as unknown as { body: { pos: { y: number } } }).body.pos.y;

it('u hromádky se držené tlačítko počítá jen jednou a křeček neskočí', () => {
  const l = new ActionLevel();
  l.setup(new THREE.Scene(), events());
  for (let i = 0; i < 30; i++) l.update(1 / 60, press(true), 0);
  expect(l.actions).toEqual(['dig']);
  expect(bodyY(l)).toBe(0);
  expect(l.actionMode).toBe('dig');
  l.update(1 / 60, press(false), 0);
  l.update(1 / 60, press(true), 0);
  expect(l.actions).toEqual(['dig', 'dig']);
  l.dispose();
});

it('po odchodu od hromádky s drženým tlačítkem nevyskočí, po novém stisku ano', () => {
  const l = new ActionLevel();
  l.setup(new THREE.Scene(), events());
  l.update(1 / 60, press(true), 0);
  l.mode = 'jump';
  for (let i = 0; i < 20; i++) l.update(1 / 60, press(true), 0);
  expect(bodyY(l)).toBe(0);
  l.update(1 / 60, press(false), 0);
  let peak = 0;
  for (let i = 0; i < 20; i++) {
    l.update(1 / 60, press(true), 0);
    peak = Math.max(peak, bodyY(l));
  }
  expect(peak).toBeGreaterThan(0.3);
  l.dispose();
});
