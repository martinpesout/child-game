import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { Hamster } from './characters/hamster';
import { stepBody, type Body } from './physics/physics';
import { CombinedController, cameraRelative } from './input/combine';
import { KeyboardController } from './input/keyboard';
import { TouchController } from './input/touch';
import { LEVEL1 } from './levels/level1Data';
import { buildMeadow } from './world/meadow';
import { FollowCamera } from './world/camera';

// TEMP demo (Task 5) – replaced in Task 9
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const meadow = buildMeadow(scene, LEVEL1);
const follow = new FollowCamera(camera);

const hamster = new Hamster();
scene.add(hamster.root);
hamster.face(Math.PI);
const body: Body = { pos: { x: LEVEL1.spawn.x, y: 0, z: LEVEL1.spawn.z }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
const input = new CombinedController([new KeyboardController(window), new TouchController(document.body)]);
const world = { colliders: LEVEL1.colliders, bounds: { halfSize: LEVEL1.halfSize } };
follow.snap(hamster.root.position.set(body.pos.x, 0, body.pos.z));

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
    const s = input.read();
    stepBody(body, cameraRelative(s.move, follow.yaw), s.action, dt, world);
    hamster.sync(body, dt);
    follow.update(hamster.root.position, dt);
    meadow.update(hamster.root.position);
  },
  () => {
    if (location.search.includes('closeup')) {
      hamster.face(0);
      camera.position.set(body.pos.x + 0.25, 0.7, body.pos.z + 1.1);
      camera.lookAt(body.pos.x, 0.4, body.pos.z);
    }
    renderer.render(scene, camera);
  },
).start();
Object.assign(window, { __body: body });
