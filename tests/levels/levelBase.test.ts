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
