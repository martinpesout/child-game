import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { Hamster } from './characters/hamster';
import { stepBody, type Body } from './physics/physics';
import { CombinedController, cameraRelative } from './input/combine';
import { KeyboardController } from './input/keyboard';
import { TouchController } from './input/touch';

// TEMP demo (Task 4) – replaced in Task 9
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe7ff);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(3, 6, 4);
sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x7cc35a }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const hamster = new Hamster();
scene.add(hamster.root);
const body: Body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, radius: 0.25, grounded: true };
const input = new CombinedController([new KeyboardController(window), new TouchController(document.body)]);
const world = { colliders: [], bounds: { halfSize: 20 } };

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
    stepBody(body, cameraRelative(s.move, 0), s.action, dt, world);
    hamster.sync(body, dt);
  },
  () => {
    camera.position.set(body.pos.x, 1.2, body.pos.z + 1.6);
    camera.lookAt(body.pos.x, 0.25, body.pos.z);
    renderer.render(scene, camera);
  },
).start();
(window as unknown as { __hamster: Hamster }).__hamster = hamster;
