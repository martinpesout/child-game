import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { CombinedController } from './input/combine';
import { KeyboardController } from './input/keyboard';
import { TouchController } from './input/touch';
import { FollowCamera } from './world/camera';
import { Level1Meadow } from './levels/level1';
import { OcclusionFader } from './world/occlusion';

// TEMP demo (Task 6) – replaced in Task 9
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const follow = new FollowCamera(camera);
const input = new CombinedController([new KeyboardController(window), new TouchController(document.body)]);
const level = new Level1Meadow();
level.setup(scene, {
  onCollect: (k, n, t) => console.log('collect', k, n, t),
  onComplete: (s) => console.log('complete', s),
  onNearNpc: () => {},
});
follow.snap(level.player.position);
const fader = new OcclusionFader(level.occluders);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

new GameLoop(
  1 / 60,
  0.1,
  (dt) => {
    level.update(dt, input.read(), follow.yaw);
    follow.update(level.player.position, dt);
    fader.update(camera.position, level.player.position, dt);
  },
  () => renderer.render(scene, camera),
).start();
