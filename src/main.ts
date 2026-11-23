import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import './ui/style.css';
import * as THREE from 'three';
import { GameLoop } from './core/loop';
import { storage } from './core/storage';
import { CombinedController } from './input/combine';
import { KeyboardController } from './input/keyboard';
import { TouchController } from './input/touch';
import { idleInput } from './input/types';
import { FollowCamera } from './world/camera';
import { OcclusionFader } from './world/occlusion';
import { Level1Meadow } from './levels/level1';
import { LINES, VoiceLines, bundledClips, type LineId } from './audio/voice';
import { installAudioUnlock, watchBackground } from './core/background';
import { Sfx } from './audio/sfx';
import { Speech } from './audio/speech';
import { Flow, type Screen } from './ui/flow';
import { Screens } from './ui/screens';
import { showBubble, type Bubble } from './ui/bubble';

const INTRO_TIME = 2.4;
const BUBBLE_TIME = 4.5;

// --- rendering -------------------------------------------------------------
const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const follow = new FollowCamera(camera);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// --- services ----------------------------------------------------------------
const touch = new TouchController(canvas);
const input = new CombinedController([new KeyboardController(window), touch]);
const sfx = new Sfx();
const voice = new VoiceLines(new Speech(), bundledClips(), (url) => sfx.playClip(url));

const flow = new Flow();
let muted = storage.get('muted', false);
sfx.setMuted(muted);
const screens = new Screens(document.getElementById('ui')!, {
  onPause: () => flow.pause(),
  onToggleMute: () => {
    muted = !muted;
    sfx.setMuted(muted);
    if (muted) voice.stop();
    storage.set('muted', muted);
    return muted;
  },
});
screens.setMuted(muted);
installAudioUnlock(window, () => sfx.unlock());

// --- camera mode: fixed (joystick = screen directions) or behind the hamster (toy-car steering) ---
let chaseCam = storage.get('camera.chase', true);
follow.setChase(chaseCam);
function toggleCamera(): boolean {
  chaseCam = !chaseCam;
  storage.set('camera.chase', chaseCam);
  level.steering = chaseCam;
  follow.setHeading(level.heading);
  follow.setChase(chaseCam);
  return chaseCam;
}

// --- level -------------------------------------------------------------------
type Phase = 'menu' | 'intro' | 'play' | 'celebrate';
let phase: Phase = 'menu';
let level!: Level1Meadow;
let fader!: OcclusionFader;
let introT = 0;
let bubble: Bubble | null = null;
let bubbleT = 0;
const v = new THREE.Vector3();

function startLevel() {
  bubble?.hide();
  bubble = null;
  level?.dispose();
  level = new Level1Meadow();
  level.setup(scene, {
    onCollect(kind, nuts) {
      if (kind === 'nut') {
        sfx.collectNut(nuts - 1);
        screens.fill('nut', nuts - 1);
      } else {
        sfx.collectBonus();
        screens.fill(kind, 0);
      }
      sfx.munch();
    },
    onComplete(stars) {
      flow.complete(stars);
    },
    onNearNpc() {
      if (phase === 'play') {
        const left = level.nuts.total - level.nuts.collected;
        if (left >= 1 && left <= 9) say(`remaining${left}` as LineId);
      }
    },
    onCritter(kind, obj) {
      // one speaker at a time: never interrupt the hedgehog or another quip
      if (phase !== 'play' || bubble) return;
      if (kind === 'bee') sfx.buzz();
      else sfx.flutter();
      say(pickQuip(kind), obj);
    },
    onJump: () => sfx.jump(),
    onStep: () => sfx.step(),
  });
  fader = new OcclusionFader(level.occluders);
  level.steering = chaseCam;
  follow.setHeading(level.heading);
  screens.resetHud();
  follow.closeup(Math.PI);
  follow.cut(level.player.position);
  phase = 'menu';
}

let lastQuip: LineId | null = null;
function pickQuip(kind: 'bee' | 'butterfly'): LineId {
  const ids = (Object.keys(LINES) as LineId[]).filter((k) => k.startsWith(kind) && k !== lastQuip);
  lastQuip = ids[Math.floor(Math.random() * ids.length)];
  return lastQuip;
}

/** Shows a speech bubble over `speaker` (the hedgehog by default) and reads the line aloud. */
function say(id: LineId, speaker?: THREE.Object3D) {
  const text = LINES[id];
  bubble?.hide();
  if (!speaker) level.npc.wave();
  const who = speaker ?? level.npc.root;
  const lift = speaker ? 0.35 : 1.05;
  bubble = showBubble(
    screens.bubbleLayer,
    text,
    () => {
      v.copy(who.position);
      v.y = speaker ? v.y + lift : lift;
      v.project(camera);
      if (v.z > 1) return null;
      return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
    },
    () => {
      bubbleT = 0;
      if (!muted) void voice.say(id);
    },
  );
  bubbleT = 0;
  if (!speaker) sfx.chatter(text.length / 4);
  if (!muted) void voice.say(id);
}

function beginIntro() {
  screens.playing();
  phase = 'intro';
  introT = 0;
  follow.closeup(Math.PI);
}

function endIntro() {
  if (phase !== 'intro') return;
  phase = 'play';
  follow.follow();
  say('intro');
}
canvas.addEventListener('pointerdown', () => endIntro());

// --- screens -----------------------------------------------------------------
let restartOnResume = false;
let prevScreen: Screen = 'title';

flow.onChange((s) => {
  const from = prevScreen;
  prevScreen = s;
  if (s !== 'playing' && s !== 'paused') input.reset();
  switch (s) {
    case 'title':
      startLevel();
      screens.title(onPlay);
      break;
    case 'story':
      sfx.click();
      screens.story(LINES.story, () => {
        sfx.click();
        voice.stop();
        flow.continue();
      });
      if (!muted) void voice.say('story');
      break;
    case 'playing':
      if (from === 'paused' && !restartOnResume) {
        screens.playing();
        break;
      }
      restartOnResume = false;
      if (from !== 'story') startLevel();
      beginIntro();
      break;
    case 'paused':
      voice.stop();
      screens.paused(
        () => flow.resume(),
        () => {
          restartOnResume = true;
          flow.resume();
        },
        chaseCam,
        toggleCamera,
      );
      break;
    case 'levelEnd': {
      bubble?.hide();
      bubble = null;
      const best = storage.get('stars.level1', 0);
      storage.set('stars.level1', Math.max(best, flow.lastStars));
      screens.levelEnd(flow.lastStars, () => flow.retry(), () => flow.next());
      break;
    }
    case 'comingSoon':
      sfx.click();
      screens.comingSoon(() => flow.home());
      break;
  }
});

function onPlay() {
  sfx.unlock();
  voice.prime();
  sfx.click();
  sfx.startAmbience();
  sfx.startMusic();
  try {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  } catch {
    /* not supported (iPad Safari) */
  }
  flow.start();
}

watchBackground(
  document,
  window,
  () => performance.now(),
  () => {
    input.reset();
    voice.stop();
  },
  () => flow.pause(),
);

// --- main loop ---------------------------------------------------------------
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

startLevel();
screens.title(onPlay);

new GameLoop(
  1 / 60,
  0.1,
  (dt) => {
    if (portrait.matches || flow.screen === 'paused') return;
    const active = flow.screen === 'playing' && phase === 'play';
    const state = active ? input.read() : idleInput();
    level.update(dt, state, follow.yaw);

    if (phase === 'intro') {
      introT += dt;
      if (introT >= INTRO_TIME) endIntro();
    }
    if (phase === 'play' && level.isComplete()) {
      phase = 'celebrate';
      follow.closeup(level.player.rotation.y);
      sfx.fanfare();
      level.npc.hop();
      say('thanks');
    }

    follow.setHeading(level.heading);
    follow.update(level.player.position, dt);
    fader.update(camera.position, level.player.position, dt);
    screens.updateControls(touch.joystickView, active && state.action);

    if (bubble) {
      bubbleT += dt;
      if (bubbleT > BUBBLE_TIME) {
        bubble.hide();
        bubble = null;
      }
    }
  },
  () => {
    renderer.render(scene, camera);
    bubble?.update();
  },
).start();

// dev-only handle for manual testing in the browser console
if (import.meta.env.DEV) Object.assign(window, { __game: { get level() { return level; }, flow, follow } });
