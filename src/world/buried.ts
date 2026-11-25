import * as THREE from 'three';

/** Buried things in the digging mazes: an old alarm clock and a dinosaur skeleton (side view, facing the camera). */

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });

/**
 * Big old wind-up alarm clock buried in the soil (w × h): round red case, two bells with a hammer between them,
 * a cream face with numbers-dots and hands, little feet and a winding key. `userData.ring(t, k)` animates the ringing
 * (k = 0..1 strength), `userData.hammer` is the hammer.
 */
export function makeClock(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const r = Math.min(w, h) * 0.36;
  const red = mat(0xe2493b, { roughness: 0.45, metalness: 0.15 });
  const brass = mat(0xe8b83a, { roughness: 0.35, metalness: 0.6 });
  const dark = mat(0x2b2220, { roughness: 0.6 });
  // case: a short fat cylinder facing the camera
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.55, 32), red);
  ring.rotation.x = Math.PI / 2;
  body.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.07, 10, 32), brass);
  rim.position.z = r * 0.28;
  body.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 32), mat(0xfff4dc, { roughness: 0.7 }));
  face.position.z = r * 0.281;
  body.add(face);
  // hour dots (12, 3, 6, 9 bigger)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(i % 3 === 0 ? r * 0.07 : r * 0.04, 10), dark);
    dot.position.set(Math.sin(a) * r * 0.72, Math.cos(a) * r * 0.72, r * 0.29);
    body.add(dot);
  }
  // hands showing "too early!" (a funny 6:55)
  const hand = (len: number, wid: number, angle: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.01), dark);
    m.geometry.translate(0, len / 2, 0);
    m.position.z = r * 0.3;
    m.rotation.z = -angle;
    body.add(m);
  };
  hand(r * 0.45, r * 0.09, Math.PI * 2 * (6.9 / 12));
  hand(r * 0.68, r * 0.06, Math.PI * 2 * (55 / 60));
  const pin = new THREE.Mesh(new THREE.CircleGeometry(r * 0.08, 12), brass);
  pin.position.z = r * 0.31;
  body.add(pin);
  // two bells on top, slightly tilted outwards, and the hammer between them
  for (const s of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), brass);
    bell.position.set(s * r * 0.55, r * 0.92, 0);
    bell.rotation.z = -s * 0.5;
    body.add(bell);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.25, 8), brass);
    stem.position.set(s * r * 0.45, r * 0.88, 0);
    stem.rotation.z = -s * 0.5;
    body.add(stem);
    // little feet
    const foot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), dark);
    foot.scale.y = 0.6;
    foot.position.set(s * r * 0.6, -r * 0.98, 0);
    body.add(foot);
  }
  const hammer = new THREE.Group();
  hammer.position.set(0, r * 0.95, 0);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.025, r * 0.025, r * 0.4, 6), dark);
  arm.position.y = r * 0.2;
  hammer.add(arm);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.07, 10, 8), brass);
  knob.position.y = r * 0.4;
  hammer.add(knob);
  body.add(hammer);
  // winding key at the back
  const key = new THREE.Mesh(new THREE.TorusGeometry(r * 0.14, r * 0.035, 8, 16), brass);
  key.position.set(r * 0.75, r * 0.2, -r * 0.3);
  key.rotation.y = Math.PI / 2;
  body.add(key);
  // half buried: tilted a bit, a lump of earth at its feet
  body.rotation.z = 0.14;
  const lump = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a5032));
  lump.scale.set(1.5, 0.35, 0.6);
  lump.position.set(-r * 0.2, -r * 1.05, r * 0.15);
  g.add(lump);
  g.position.y = -r * 0.05;
  g.userData.hammer = hammer;
  g.userData.ring = (t: number, k: number) => {
    hammer.rotation.z = Math.sin(t * 60) * 0.6 * k;
    body.rotation.z = 0.14 + Math.sin(t * 47) * 0.06 * k;
    body.position.x = Math.sin(t * 53) * 0.015 * k;
    body.position.y = Math.abs(Math.sin(t * 31)) * 0.02 * k;
  };
  return g;
}

/** Bone between two points (capsule), with rounded knobs at both ends. */
function bone(a: THREE.Vector2, b: THREE.Vector2, r: number, m: THREE.Material, knobs = true): THREE.Group {
  const g = new THREE.Group();
  const len = a.distanceTo(b);
  const shaft = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 2), 4, 8), m);
  shaft.rotation.z = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
  shaft.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  g.add(shaft);
  if (knobs) {
    for (const p of [a, b]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(r * 1.5, 8, 6), m);
      k.position.set(p.x, p.y, 0);
      g.add(k);
    }
  }
  return g;
}

/**
 * Friendly museum-style dinosaur skeleton in side view (head on the right), fitting a w × h box.
 * `userData.jaw` is the lower jaw that clacks.
 */
export function makeDino(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const ivory = mat(0xf4ecd8, { roughness: 0.7 });
  const joint = mat(0xd9ccb0, { roughness: 0.75 });
  const s = Math.min(w / 3, h / 1.45); // design units: the skeleton is drawn ~3 units long, ~1.4 high
  const P = (x: number, y: number) => new THREE.Vector2(x * s, y * s);

  // spine: tail tip (left) → hips → back → neck → head (right)
  const spine = new THREE.CatmullRomCurve3(
    [
      [-1.5, -0.25], [-1.15, -0.1], [-0.8, 0.02], [-0.45, 0.12], [-0.1, 0.16], [0.25, 0.14], [0.55, 0.12], [0.8, 0.22], [1.0, 0.36],
    ].map(([x, y]) => new THREE.Vector3(x * s, y * s, 0)),
  );
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = spine.getPoint(t);
    // tail thin → back thick → neck medium
    const r = 1.4 * (t < 0.4 ? 0.035 + t * 0.09 : t < 0.75 ? 0.07 : 0.06 - (t - 0.75) * 0.06) * s;
    const v = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), i % 2 ? ivory : joint);
    v.scale.set(1.25, 1, 1);
    v.position.copy(p);
    g.add(v);
    // little spines on top of the back vertebrae
    if (t > 0.35 && t < 0.8 && i % 2 === 0) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, r * 2.2, 6), ivory);
      sp.position.set(p.x, p.y + r * 1.5, 0);
      g.add(sp);
    }
  }

  // rib cage: curved ribs hanging from the back
  for (let i = 0; i < 6; i++) {
    const t = 0.45 + i * 0.045;
    const top = spine.getPoint(t);
    const len = (0.42 - Math.abs(i - 2.5) * 0.05) * s;
    const rib = new THREE.CatmullRomCurve3([
      top.clone(),
      top.clone().add(new THREE.Vector3(0.07 * s, -len * 0.45, 0.06 * s)),
      top.clone().add(new THREE.Vector3(0.02 * s, -len, 0.02 * s)),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(rib, 10, 0.034 * s, 6, false), ivory));
  }

  // hips and legs (thigh, shin, foot with toes)
  const hip = spine.getPoint(0.38);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 10, 8), joint);
  pelvis.scale.set(1.4, 0.8, 0.7);
  pelvis.position.copy(hip).add(new THREE.Vector3(0, -0.05 * s, 0));
  g.add(pelvis);
  const legs: [number, number][] = [[-0.38, 0], [-0.18, 0.04]];
  for (const [lx, lz] of legs) {
    const knee = P(lx + 0.12, -0.42);
    const ankle = P(lx - 0.02, -0.72);
    g.add(bone(P(hip.x / s + (lx + 0.3), hip.y / s - 0.05), knee, 0.05 * s, ivory));
    g.add(bone(knee, ankle, 0.04 * s, ivory));
    for (const dx of [0.1, 0.16]) g.add(bone(ankle, P(lx - 0.02 + dx, -0.8), 0.024 * s, ivory, false));
    g.children[g.children.length - 1].position.z = lz;
  }
  // short arms under the chest
  const shoulder = spine.getPoint(0.66);
  const elbow = P(shoulder.x / s + 0.05, shoulder.y / s - 0.32);
  g.add(bone(P(shoulder.x / s, shoulder.y / s - 0.08), elbow, 0.032 * s, ivory));
  g.add(bone(elbow, P(elbow.x / s + 0.1, elbow.y / s - 0.1), 0.026 * s, ivory));

  // big friendly skull with eye socket, nostril, teeth and a jaw that can clack
  const neckTop = spine.getPoint(1);
  const skull = new THREE.Group();
  skull.position.copy(neckTop).add(new THREE.Vector3(0.12 * s, 0.04 * s, 0));
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 14, 12), ivory);
  cranium.scale.set(1.15, 0.95, 0.85);
  skull.add(cranium);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.22 * s, 4, 10), ivory);
  snout.rotation.z = Math.PI / 2 - 0.12;
  snout.position.set(0.22 * s, -0.02 * s, 0);
  skull.add(snout);
  const socket = new THREE.Mesh(new THREE.SphereGeometry(0.06 * s, 10, 8), mat(0x3b2a1e));
  socket.position.set(0.04 * s, 0.05 * s, 0.11 * s);
  skull.add(socket);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 6, 6), mat(0xffffff));
  shine.position.set(0.06 * s, 0.07 * s, 0.16 * s);
  skull.add(shine);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 6, 6), mat(0x3b2a1e));
  nostril.position.set(0.38 * s, 0.03 * s, 0.07 * s);
  skull.add(nostril);
  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.05 * s, 5), ivory);
    tooth.rotation.z = Math.PI;
    tooth.position.set((0.12 + i * 0.06) * s, -0.09 * s, 0.05 * s);
    skull.add(tooth);
  }
  const jaw = new THREE.Group();
  jaw.position.set(-0.05 * s, -0.08 * s, 0);
  const jawBone = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * s, 0.32 * s, 4, 8), joint);
  jawBone.rotation.z = Math.PI / 2 + 0.08;
  jawBone.position.set(0.2 * s, -0.04 * s, 0);
  jaw.add(jawBone);
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.016 * s, 0.045 * s, 5), ivory);
    tooth.position.set((0.16 + i * 0.07) * s, 0.0, 0.04 * s);
    jaw.add(tooth);
  }
  skull.add(jaw);
  g.add(skull);
  g.userData.jaw = jaw;

  // centre vertically (feet at -0.8, skull top at ~+0.6 design units)
  g.position.y = 0.1 * s;
  return g;
}

/** Giant yellow rubber duck stuck in the soil (w × h). `userData.squeak(t, k)` wobbles it when bumped. */
export function makeDuck(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const duck = new THREE.Group();
  g.add(duck);
  const s = Math.min(w / 1.55, h / 1.25);
  const yellow = mat(0xffd23a, { roughness: 0.35 });
  const orange = mat(0xff8a2b, { roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 22, 16), yellow);
  body.scale.set(1.35, 0.85, 0.9);
  body.position.y = -0.15 * s;
  duck.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14 * s, 0.3 * s, 12), yellow);
  tail.rotation.z = Math.PI / 2 + 0.6;
  tail.position.set(-0.55 * s, 0.02 * s, 0);
  duck.add(tail);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27 * s, 20, 14), yellow);
  head.position.set(0.32 * s, 0.32 * s, 0);
  duck.add(head);
  const beak = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 14, 10), orange);
  beak.scale.set(1.6, 0.55, 1);
  beak.position.set(0.58 * s, 0.26 * s, 0);
  duck.add(beak);
  for (const z of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 10, 8), mat(0x1a1210, { roughness: 0.2 }));
    eye.position.set(0.42 * s, 0.4 * s, z * s + 0.1 * s);
    duck.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.017 * s, 6, 6), mat(0xffffff));
    shine.position.set(0.45 * s, 0.42 * s, z * s + 0.14 * s);
    duck.add(shine);
  }
  const wing = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 14, 10), mat(0xf5c32e, { roughness: 0.4 }));
  wing.scale.set(1.3, 0.7, 0.4);
  wing.position.set(-0.08 * s, -0.08 * s, 0.33 * s);
  duck.add(wing);
  // stuck in the soil: tilted, a lump of earth over its bottom
  duck.rotation.z = -0.18;
  const lump = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a5032));
  lump.scale.set(1.6, 0.35, 0.7);
  lump.position.set(0, -0.48 * s, 0.1 * s);
  g.add(lump);
  g.userData.squeak = (t: number, k: number) => {
    const sq = 1 - Math.abs(Math.sin(t * 22)) * 0.12 * k;
    duck.scale.set(1 / sq, sq, 1);
    duck.rotation.z = -0.18 + Math.sin(t * 17) * 0.12 * k;
  };
  return g;
}
