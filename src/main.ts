import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { CombinedController } from './input/combine';
import { KeyboardController } from './input/keyboard';
import { TouchController } from './input/touch';
import { FollowCamera } from './world/camera';
import { Level1Meadow } from './levels/level1';
import { OcclusionFader } from './world/occlusion';
import './ui/style.css';
import { showBubble } from './ui/bubble';
import { remainingText } from './levels/level1';

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
  onNearNpc: () => say(remainingText(level.nuts.total - level.nuts.collected)),
});
follow.snap(level.player.position);
const fader = new OcclusionFader(level.occluders);
const ui = document.getElementById('ui')!;
const v = new THREE.Vector3();
let bubble: ReturnType<typeof showBubble> | null = null;
function say(text: string) {
  bubble?.hide();
  level.npc.wave();
  bubble = showBubble(ui, text, () => {
    v.copy(level.npc.root.position).setY(1.0).project(camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }, () => {});
}
say('Ahoj! Pomůžeš mi najít 10 oříšků?');

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
  () => {
    renderer.render(scene, camera);
    bubble?.update();
  },
).start();
