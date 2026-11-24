import * as THREE from 'three';

/** Buried things in the digging mazes: a pirate chest and a dinosaur skeleton (side view, facing the camera). */

const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });

/** Pirate chest of planks with an arched lid, iron bands, corner brackets, a lock and spilling gold. Size w × h (x, y). */
export function makeChest(w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const d = 0.42;
  const wood = mat(0x8a4f26);
  const wood2 = mat(0x9c5b2e);
  const iron = mat(0x4a4a52, { metalness: 0.6, roughness: 0.45 });
  const gold = mat(0xffcf3f, { metalness: 0.7, roughness: 0.3, emissive: 0x5a3c00, emissiveIntensity: 0.25 });
  const bodyH = h * 0.5;
  const lidR = Math.min(d / 2, h * 0.28);
  const baseY = -h / 2 + 0.04;

  // box of horizontal planks
  const planks = 4;
  for (let i = 0; i < planks; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH / planks - 0.012, d), i % 2 ? wood : wood2);
    p.position.y = baseY + (i + 0.5) * (bodyH / planks);
    g.add(p);
  }
  // dark inside, visible under the open lid
  const inside = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.02, d * 0.9), mat(0x2a160a));
  inside.position.y = baseY + bodyH - 0.005;
  g.add(inside);

  // heap of gold coins and a gem peeking out
  const coinGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.014, 14);
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Mesh(coinGeo, gold);
    const t = i / 15;
    c.position.set((t - 0.5) * w * 0.8, baseY + bodyH + 0.02 + Math.sin(t * Math.PI) * 0.08 + (i % 3) * 0.012, ((i * 37) % 7) / 7 * 0.16 - 0.08);
    c.rotation.set(0.4 + (i % 4) * 0.3, i, 0.2 * (i % 3));
    g.add(c);
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), mat(0xe8384f, { metalness: 0.2, roughness: 0.15, emissive: 0x500010, emissiveIntensity: 0.4 }));
  gem.position.set(w * 0.12, baseY + bodyH + 0.1, 0.05);
  g.add(gem);

  // arched lid, hinged at the back and propped open a little
  const lid = new THREE.Group();
  lid.position.set(0, baseY + bodyH, -d / 2);
  const lidShell = new THREE.Mesh(new THREE.CylinderGeometry(lidR, lidR, w, 20, 1, false, 0, Math.PI), wood2);
  lidShell.rotation.z = Math.PI / 2;
  lidShell.rotation.y = Math.PI / 2;
  lidShell.position.set(0, 0, d / 2);
  lidShell.scale.set(1, 1, d / 2 / lidR);
  lid.add(lidShell);
  for (const x of [-w / 2 + 0.07, 0, w / 2 - 0.07]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(lidR + 0.005, 0.016, 6, 16, Math.PI), iron);
    band.rotation.y = Math.PI / 2;
    band.position.set(x, 0, d / 2);
    band.scale.set(1, 1, d / 2 / lidR);
    lid.add(band);
  }
  lid.rotation.x = -0.5;
  g.add(lid);

  // iron bands and corner brackets on the box
  for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.05, bodyH + 0.01, d + 0.02), iron);
    band.position.set(x, baseY + bodyH / 2, 0);
    g.add(band);
  }
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), iron);
      br.position.set(sx * (w / 2 - 0.05), baseY + 0.05 + sy * (bodyH - 0.1), d / 2 + 0.01);
      g.add(br);
    }
  }
  // lock plate with a keyhole
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.02), gold);
  plate.position.set(0, baseY + bodyH - 0.08, d / 2 + 0.012);
  g.add(plate);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.02, 10), mat(0x1a1208));
  hole.position.set(0, baseY + bodyH - 0.075, d / 2 + 0.024);
  g.add(hole);

  // a few coins spilled into the soil in front
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(coinGeo, gold);
    c.position.set(-w * 0.35 + i * 0.13, baseY + 0.02, d / 2 + 0.06);
    c.rotation.set(Math.PI / 2 - 0.3, 0, i * 0.7);
    g.add(c);
  }
  // half buried: tilted a bit
  g.rotation.z = -0.07;
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
