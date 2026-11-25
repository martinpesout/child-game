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
import { LEVELS, type PlayableLevel } from './levels/registry';
import { LevelProgress } from './core/progress';
import { LINES, VoiceLines, bundledClips, type LineId } from './audio/voice';
import { installAudioUnlock, watchBackground } from './core/background';
import { Sfx, type SfxClip } from './audio/sfx';
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

/** Set by the current level (level 4 sizes its underground view). */
let resizeHook: ((aspect: number) => void) | null = null;
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  resizeHook?.(camera.aspect);
}
window.addEventListener('resize', resize);
resize();

// --- services ----------------------------------------------------------------
const touch = new TouchController(canvas);
const input = new CombinedController([new KeyboardController(window), touch]);
// optional custom background track: drop src/assets/music/theme.mp3 (or .m4a) in, otherwise the generated melody plays
const musicTrack = Object.values(import.meta.glob('./assets/music/theme.{mp3,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)[0];
// recorded sound effects: drop src/assets/sfx/<name>.mp3 in (dig, meow, purr, creak, squeak), otherwise generated sounds play
const sfxFiles = import.meta.glob('./assets/sfx/*.{mp3,m4a,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const sfxClips = Object.fromEntries(Object.entries(sfxFiles).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url])) as Partial<Record<SfxClip, string>>;
const sfx = new Sfx(musicTrack, sfxClips);
const voice = new VoiceLines(new Speech(), bundledClips(), (url) => sfx.playClip(url), (speaking) => sfx.duck(speaking));

const progress = new LevelProgress(LEVELS.length);
const canPlay = (n: number) => !!LEVELS[n - 1]?.ready && progress.isUnlocked(n);
const flow = new Flow(canPlay, LEVELS.length);
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
let level!: PlayableLevel;
let levelId = 1;
let fader!: OcclusionFader;
let introT = 0;
let celebrateShotPending = false;
let bubble: Bubble | null = null;
let bubbleT = 0;
const v = new THREE.Vector3();

function startLevel(id = levelId) {
  bubble?.hide();
  bubble = null;
  level?.dispose();
  levelId = id;
  const info = LEVELS[id - 1];
  level = info.create!();
  level.setup(scene, {
    onCollect(kind, nuts) {
      if (kind === 'nut') sfx.collectNut(nuts - 1);
      else {
        sfx.collectBonus();
        screens.fillBonus(kind);
      }
      sfx.munch();
    },
    onGoal(index) {
      screens.fillGoal(index);
      if (level.goal.icon !== 'nut') sfx.collectNut(index);
    },
    onFinished(stars) {
      // save right away: the child may leave via Pause → Map during the celebration
      progress.complete(levelId, stars);
    },
    onComplete(stars) {
      flow.complete(stars);
    },
    onNearNpc() {
      if (phase === 'play' && levelId === 1) {
        const left = level.goal.total - level.goal.done;
        if (left >= 1 && left <= 9) say(`remaining${left}` as LineId);
      }
    },
    onFriendSay(id, obj) {
      if (phase !== 'play' && phase !== 'celebrate') return;
      if (levelId === 3) sfx.croak();
      if (id === 'l4beetle') sfx.snore();
      else if (levelId === 4 && obj === level.npc.root) sfx.pop();
      say(id, obj, levelId === 3 ? 0.8 : levelId === 4 && obj !== level.npc.root ? 0.55 : 1.0);
    },
    onSplash: () => sfx.splash(),
    onSink: () => sfx.plop(),
    onRing: () => sfx.ring(),
    onMeow: () => sfx.meow(),
    onPurr: () => sfx.purr(),
    onDoor: () => sfx.creak(),
    onSqueak: () => sfx.squeak(),
    onDig: (kind) => (kind === 'blocked' ? sfx.thud() : kind === 'crumble' ? sfx.crumble() : sfx.dig()),
    onRespawn: () => screens.fade(),
    onCritter(kind, obj) {
      // one speaker at a time: never interrupt a friend or another quip
      if (phase !== 'play' || bubble) return;
      if (kind === 'bee') sfx.buzz();
      else sfx.flutter();
      say(pickQuip(kind), obj);
    },
    onJump: () => sfx.jump(),
    onStep: () => sfx.step(),
  });
  fader = new OcclusionFader(level.occluders);
  const lv = level as { resizeUnderground?: (a: number) => void };
  resizeHook = lv.resizeUnderground ? (a) => lv.resizeUnderground!(a) : null;
  resizeHook?.(camera.aspect);
  level.steering = chaseCam;
  follow.setHeading(level.heading);
  const icons = (level as { goalIcons?: string[] }).goalIcons;
  if (icons) screens.setGoalIcons(icons);
  else screens.setGoal(level.goal.icon, level.goal.total);
  screens.resetHud();
  follow.closeup(level.heading);
  follow.cut(level.player.position);
  celebrateShotPending = false;
  phase = 'menu';
}

/** The underground scene of level 4 when the hamster is below the meadow. */
function view3d(): { scene: THREE.Scene; camera: THREE.Camera } | null {
  return (level as { view3d?: { scene: THREE.Scene; camera: THREE.Camera } | null } | undefined)?.view3d ?? null;
}

let shownScene: THREE.Scene | null = null;
let lastQuip: LineId | null = null;
function pickQuip(kind: 'bee' | 'butterfly'): LineId {
  const ids = (Object.keys(LINES) as LineId[]).filter((k) => k.startsWith(kind) && k !== lastQuip);
  lastQuip = ids[Math.floor(Math.random() * ids.length)];
  return lastQuip;
}

/** Shows a speech bubble over `speaker` (the level's friend by default) and reads the line aloud. */
function say(id: LineId, speaker?: THREE.Object3D, speakerLift = 0.35) {
  const text = LINES[id];
  bubble?.hide();
  if (!speaker) level.npc.wave();
  const who = speaker ?? level.npc.root;
  const lift = speaker ? speakerLift : 1.05;
  bubble = showBubble(
    screens.bubbleLayer,
    text,
    () => {
      v.copy(who.position);
      v.y = speaker ? v.y + lift : lift;
      v.project(view3d()?.camera ?? camera);
      if (v.z > 1) return null;
      return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
    },
    () => {
      bubbleT = 0;
      if (!muted) void voice.say(id);
    },
  );
  bubbleT = 0;
  if (!speaker || speaker === level.npc.root) sfx.chatter(text.length / 4);
  if (!muted) void voice.say(id);
}

function beginIntro() {
  screens.playing();
  phase = 'intro';
  introT = 0;
  follow.closeup(level.heading);
}

function endIntro() {
  if (phase !== 'intro') return;
  phase = 'play';
  follow.follow();
  const intro = LEVELS[levelId - 1].intro;
  if (intro) say(intro, level.npc.root, 1.05);
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
    case 'map':
      // the level behind the map goes quiet (no quips or hints while choosing)
      phase = 'menu';
      sfx.click();
      bubble?.hide();
      bubble = null;
      voice.stop();
      screens.map(LEVELS, progress, (id) => flow.pick(id));
      break;
    case 'story': {
      sfx.click();
      // always a fresh level behind the story screen (also when replaying the same one)
      startLevel(flow.current);
      const story = LEVELS[flow.current - 1].story!;
      screens.story(LINES[story], () => {
        sfx.click();
        voice.stop();
        flow.continue();
      });
      if (!muted) void voice.say(story);
      break;
    }
    case 'playing':
      if (from === 'paused' && !restartOnResume) {
        screens.playing();
        break;
      }
      restartOnResume = false;
      // the story screen already built a fresh level; retry / restart need a new one
      if (from !== 'story') startLevel(flow.current);
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
        () => flow.toMap(),
      );
      break;
    case 'levelEnd':
      bubble?.hide();
      bubble = null;
      progress.complete(levelId, flow.lastStars);
      screens.levelEnd(flow.lastStars, () => flow.retry(), () => flow.next(), () => flow.toMap());
      break;
    case 'gameEnd': {
      sfx.fanfare();
      const total = LEVELS.reduce((sum, l) => sum + progress.best(l.id), 0);
      screens.gameEnd(total, LEVELS.length * 3, () => flow.toMap());
      if (!muted) void voice.say('l5end');
      break;
    }
    case 'comingSoon':
      sfx.click();
      screens.comingSoon(() => flow.toMap());
      break;
  }
});

function onPlay() {
  sfx.unlock();
  voice.prime();
  sfx.click();
  sfx.startAmbience();
  void sfx.startMusic();
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

startLevel(Math.min(progress.current(), LEVELS.filter((l) => l.ready).length));
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
      celebrateShotPending = true;
      sfx.fanfare();
      const info = LEVELS[levelId - 1];
      (level.npc as { hop?: () => void }).hop?.();
      if (info.thanks) say(info.thanks);
    }

    // a level may offer its own finish view (the hamster wheel)
    if (celebrateShotPending) {
      const shot = (level as { finishShot?: { from: THREE.Vector3; at: THREE.Vector3 } | null }).finishShot;
      if (shot) {
        follow.shot(shot.from, shot.at);
        celebrateShotPending = false;
      }
    }
    follow.setHeading(level.heading);
    follow.setSideBias((level as { cameraBias?: number }).cameraBias ?? 0);
    follow.update(level.player.position, dt);
    fader.update(camera.position, level.player.position, dt);
    screens.updateControls(touch.joystickView, active && state.action);
    // a speech bubble belongs to one world: hide it when switching between the meadow and the underground
    const shown = view3d()?.scene ?? null;
    if (shown !== shownScene) {
      shownScene = shown;
      bubble?.hide();
      bubble = null;
    }
    screens.setAction(level.actionMode);
    screens.catHint(active && !!(level as { catHint?: boolean }).catHint);
    // bubble over the hamster on the meadow when the button means dig / into the hole
    const am = level.actionMode;
    if (active && am !== 'jump' && !view3d()) {
      v.copy(level.player.position);
      v.y += 0.8;
      v.project(camera);
      screens.actionBadge(am, v.x * 0.5 + 0.5, -v.y * 0.5 + 0.5);
    } else screens.actionBadge(null, 0, 0);
    const ir = (level as { iris?: { k: number; center: { x: number; y: number } | null } | null }).iris;
    if (ir) {
      let c = ir.center;
      if (!c) {
        v.copy(level.player.position);
        v.y += 0.3;
        v.project(camera);
        c = { x: v.x * 0.5 + 0.5, y: -v.y * 0.5 + 0.5 };
      }
      screens.iris(ir.k, c.x, c.y);
    } else screens.iris(null, 0, 0);
    screens.exitArrow((level as { exitIndicator?: { x: number; y: number; angle: number } | null }).exitIndicator ?? null);

    if (bubble) {
      bubbleT += dt;
      if (bubbleT > BUBBLE_TIME) {
        bubble.hide();
        bubble = null;
      }
    }
  },
  () => {
    const v3 = view3d();
    renderer.render(v3?.scene ?? scene, v3?.camera ?? camera);
    bubble?.update();
  },
).start();

// dev-only handle for manual testing in the browser console
if (import.meta.env.DEV) Object.assign(window, { __game: { get level() { return level; }, flow, follow } });
