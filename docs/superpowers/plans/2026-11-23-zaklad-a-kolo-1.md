# Křečkova cesta – základ hry a kolo 1: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hratelný základ 3D hry s křečkem pro iPad Air a kolo 1 „Louka u domku“ (ježek, 10 oříšků, 3 bonusy) od úvodní obrazovky po konec kola.

**Architecture:** Vite + TypeScript projekt. Čistá herní logika (vstup, fyzika, počítání, stavový automat obrazovek) je oddělená od Three.js a DOM, aby šla testovat ve Vitestu. Three.js vrstva (postavy z primitiv, svět, kamera) a HTML/CSS překryv (UI) jen čtou/řídí tuto logiku. Vstup jde přes rozhraní `Controller`, aby šel později přidat telefon jako ovladač.

**Tech Stack:** Vite 5, TypeScript 5 (strict), three (r160+), Vitest + jsdom, vite-plugin-pwa, @fontsource/baloo-2.

**Spec:** `docs/superpowers/specs/2026-11-23-krecek-design.md`

## Global Constraints

- Jeden hráč, žádná prohra, žádný časový limit, nic strašidelného ani hlasitého.
- Cílové zařízení iPad Air (Safari), cíl 60 fps; pixel ratio max 2.
- Žádná fyzikální knihovna, žádné externí 3D modely ani zvukové soubory – postavy z primitiv, zvuky Web Audio, předčítání Web Speech (`cs`).
- Herní logika nesmí číst DOM události přímo – jen `InputState { move: {x, y}, action: boolean }` z `Controller`.
- Texty česky, krátké věty; dotykové cíle min. 64 px; písmo Baloo 2 přibalené (offline).
- localStorage jen přes try/catch obal.
- `npm run dev` poslouchá i v síti (`--host`), aby šlo testovat z iPadu.

## Review Focus

1. **Dva prsty najednou** (joystick vlevo + skok vpravo, nebo druhý prst na levé půlce) – joystick sleduje jen svůj `pointerId`, skok funguje současně. → test v Task 2.
2. **Ztracený dotyk** (`pointercancel`, přepnutí aplikace, `blur`) – joystick se vynuluje, křeček nesmí běžet dál sám. → test v Task 2.
3. **Obří `dt` po návratu z pozadí** – křeček nesmí proletět keřem ani propadnout zemí; dt se omezí a fyzika krokuje po malých krocích. → test v Task 1 a Task 3.
4. **Zvuk a hlas na iOS** – AudioContext je po návratu z pozadí `suspended`; `speechSynthesis.getVoices()` je zpočátku prázdné. Zvuk se obnoví při dalším dotyku, hlas se vybere po `voiceschanged`. → testy v Task 7 a Task 8.
5. **Opakované „Znovu“** – kolo se postaví znovu bez zdvojení oříšků, posluchačů nebo zbytků geometrie. → test v Task 6.

---

## Struktura souborů

```
index.html                 – canvas #game + div #ui
vite.config.ts             – server.host, PWA plugin, vitest (jsdom)
public/icons/              – ikony PWA (192, 512)
src/main.ts                – sestavení: renderer, smyčka, flow, napojení vrstev
src/core/loop.ts           – GameLoop (pevný krok fyziky)
src/core/storage.ts        – bezpečný localStorage
src/input/types.ts         – InputState, Controller
src/input/joystick.ts      – čistá matematika joysticku
src/input/touch.ts         – TouchController (plovoucí joystick + tlačítko skoku)
src/input/keyboard.ts      – KeyboardController
src/input/combine.ts       – sloučení více ovladačů, cameraRelative()
src/physics/physics.ts     – Collider, Body, stepBody()
src/characters/parts.ts    – sdílené materiály/tvary (měkké koule, oči s odleskem)
src/characters/hamster.ts  – Hamster (mesh + animace)
src/characters/hamsterAnim.ts – čistý animační stav
src/characters/hedgehog.ts – Hedgehog (mesh + animace)
src/world/meadow.ts        – terén, tráva (InstancedMesh), keře, kameny, strom, domek, okraj, nebe, světla
src/world/camera.ts        – FollowCamera
src/levels/level.ts        – rozhraní Level
src/levels/level1Data.ts   – rozmístění kola 1 (čistá data)
src/levels/level1.ts       – Level1Meadow
src/levels/progress.ts     – počítání, hvězdy, nápověda
src/audio/sfx.ts           – Sfx (Web Audio)
src/audio/speech.ts        – Speech (Web Speech)
src/ui/flow.ts             – čistý stavový automat obrazovek
src/ui/screens.ts          – HTML/CSS obrazovky, HUD, bubliny
src/ui/style.css
tests/…                    – zrcadlí src/
```

---

### Task 1: Kostra projektu a herní smyčka

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/core/loop.ts`, `src/core/storage.ts`, `.gitignore`
- Test: `tests/core/loop.test.ts`, `tests/core/storage.test.ts`

**Interfaces:**
- Produces:
  - `class GameLoop { constructor(step: number, maxFrame: number, update: (dt: number) => void, render: (alpha: number) => void); tick(nowMs: number): void; start(): void; stop(): void }` – `step = 1/60`, `maxFrame = 0.1` s
  - `storage.get<T>(key: string, fallback: T): T`, `storage.set(key: string, value: unknown): void` – nikdy nevyhodí výjimku

- [ ] **Step 1:** `npm create vite@latest . -- --template vanilla-ts`, pak `npm i three` a `npm i -D @types/three vitest jsdom`. Skripty: `dev: "vite --host"`, `build: "tsc && vite build"`, `test: "vitest run"`. `vite.config.ts`: `test.environment = 'jsdom'`. `.gitignore`: `node_modules`, `dist`.
- [ ] **Step 2: Failing testy**

```ts
// tests/core/loop.test.ts
it('volá update v pevných krocích a zbytek předá jako alpha', () => {
  const steps: number[] = []; let alpha = -1;
  const loop = new GameLoop(1/60, 0.1, dt => steps.push(dt), a => alpha = a);
  loop.tick(0); loop.tick(1000 * 2.5 / 60);
  expect(steps).toEqual([1/60, 1/60]);
  expect(alpha).toBeCloseTo(0.5);
});
it('po dlouhé pauze (návrat z pozadí) udělá max 0.1 s simulace', () => {
  const steps: number[] = [];
  const loop = new GameLoop(1/60, 0.1, dt => steps.push(dt), () => {});
  loop.tick(0); loop.tick(30_000);
  expect(steps.length).toBe(6);
});
// tests/core/storage.test.ts
it('vrátí fallback, když localStorage vyhodí', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
  expect(storage.get('stars', 0)).toBe(0);
});
it('set nevyhodí, když localStorage vyhodí', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
  expect(() => storage.set('a', 1)).not.toThrow();
});
```

- [ ] **Step 3:** `npm test` → FAIL (moduly neexistují).
- [ ] **Step 4:** Implementovat `loop.ts` (akumulátor, ořez na `maxFrame`, `requestAnimationFrame`), `storage.ts` (JSON + try/catch). `index.html`: `<canvas id="game">`, `<div id="ui">`, viewport meta `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no`, `touch-action: none` na body. `main.ts`: WebGLRenderer (antialias, `setPixelRatio(Math.min(devicePixelRatio, 2))`, stíny zapnuté), scéna se zelenou rovinou a krychlí, resize handler, spuštěný GameLoop.
- [ ] **Step 5:** `npm test` → PASS. `npm run dev` → v prohlížeči je vidět zelená rovina s krychlí, okno reaguje na změnu velikosti.
- [ ] **Step 6: Commit** – `git add -A && git commit -m "feat: kostra projektu a herní smyčka"` (spolu se specem a plánem v `docs/`).

---

### Task 2: Vstup – joystick, dotyk, klávesnice

**Files:**
- Create: `src/input/types.ts`, `src/input/joystick.ts`, `src/input/touch.ts`, `src/input/keyboard.ts`, `src/input/combine.ts`
- Test: `tests/input/joystick.test.ts`, `tests/input/touch.test.ts`, `tests/input/keyboard.test.ts`, `tests/input/combine.test.ts`

**Interfaces:**
- Produces:
  - `interface InputState { move: { x: number; y: number }; action: boolean }` – `x` doprava, `y` dopředu (od kamery), délka `move` ≤ 1
  - `interface Controller { read(): InputState; reset(): void; dispose(): void }`
  - `joystickVector(origin: {x,y}, current: {x,y}, radius: number, deadZone: number): {x: number; y: number}` – obrazovkové y dolů ⇒ výsledné `y` kladné při tahu nahoru; `radius = 60` px, `deadZone = 0.15`
  - `class TouchController implements Controller { constructor(el: HTMLElement) ; readonly joystickView: { active: boolean; origin: {x,y}; knob: {x,y} } }` – levá polovina = plovoucí joystick, pravá polovina = akce
  - `class KeyboardController implements Controller { constructor(target: Window) }` – šipky/WASD, mezerník
  - `class CombinedController implements Controller { constructor(list: Controller[]) }` – `move` = součet ořezaný na délku 1, `action` = OR
  - `cameraRelative(move: {x,y}, cameraYaw: number): { x: number; z: number }` – světový směr v rovině XZ

- [ ] **Step 1: Failing testy**

```ts
// joystick
expect(joystickVector({x:100,y:100},{x:100,y:40},60,0.15)).toEqual({x:0,y:1});
expect(joystickVector({x:100,y:100},{x:100,y:-200},60,0.15)).toEqual({x:0,y:1}); // ořez
expect(joystickVector({x:100,y:100},{x:105,y:100},60,0.15)).toEqual({x:0,y:0}); // mrtvá zóna
// touch (jsdom, el 1000×600, PointerEvent přes dispatchEvent)
it('levý prst řídí joystick, pravý prst současně skok');           // pointerId 1 vlevo + 2 vpravo → move.y>0 && action
it('druhý prst na levé půlce joystick nepřebere');                  // pointerId 3 vlevo se ignoruje
it('pointercancel i window blur vynulují pohyb i akci');            // → {move:{x:0,y:0}, action:false}
// keyboard
it('šipka nahoru + D = diagonála délky 1');                         // |move| ≈ 1
it('blur uvolní všechny klávesy');
// combine
expect(cameraRelative({x:0,y:1}, 0)).toEqual({x:0, z:-1});          // kamera míří po -Z
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat. Touch používá Pointer Events s `setPointerCapture`, joystick si pamatuje vlastní `pointerId`. Klávesnice normalizuje diagonálu.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** – `feat: vstup – joystick, dotyk, klávesnice`

---

### Task 3: Jednoduchá fyzika

**Files:**
- Create: `src/physics/physics.ts`
- Test: `tests/physics/physics.test.ts`

**Interfaces:**
- Produces:
  - `type Collider = { kind: 'cylinder'; x: number; z: number; radius: number; height: number } | { kind: 'box'; x: number; z: number; halfX: number; halfZ: number; height: number }` – vše stojí na zemi (y = 0)
  - `interface Body { pos: {x,y,z}; vel: {x,y,z}; radius: number; grounded: boolean }`
  - `interface PhysicsWorld { colliders: Collider[]; bounds: { halfSize: number } }`
  - `const PHYS = { gravity: 18, jumpSpeed: 5.2, maxSpeed: 3.2, accel: 20, stepUp: 0.05 }` – výška skoku ≈ `jumpSpeed²/(2g)` ≈ 0,75 m
  - `stepBody(body: Body, wish: {x: number; z: number}, jump: boolean, dt: number, world: PhysicsWorld): void` – interně dělí `dt` na podkroky ≤ 1/120 s
  - `topHeightAt(x: number, z: number, radius: number, world: PhysicsWorld): number` – nejvyšší vršek collideru pod tělem, jinak 0

Měřítko: křeček poloměr 0,25 m, louka `halfSize = 20` (40×40 m), přeběhnutí ≈ 40/3,2 ≈ 12,5 s + zatáčení ≈ 15–20 s dle specu.

- [ ] **Step 1: Failing testy**

```ts
it('bez vstupu stojí, gravitace ho drží na zemi');                     // y = 0, grounded
it('neprojde keřem (válec výšky 1,2) ani s dt = 0.1');                 // vzdálenost středů ≥ r1 + r2 - 1e-3
it('vyskočí na nízký kámen (box výšky 0.5) a zůstane na něm stát');   // y ≈ 0.5, grounded
it('na keř vysoký 1.2 nevyskočí');                                      // y nikdy ≥ 1.2 nad keřem
it('neopustí louku přes okraj');                                       // |x|,|z| ≤ halfSize - radius
it('z hrany kamene sklouzne dolů, nezasekne se');                      // po 2 s chůze z kamene y = 0
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat: zrychlení k `wish * maxSpeed`, gravitace, vodorovné vytlačení z colliderů, jejichž vršek je nad `pos.y + stepUp` (válec: kruh vs kruh; box: nejbližší bod obdélníku), přistání na vršek, když je tělo shora, ořez na hranice.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** – `feat: jednoduchá fyzika s kolizemi a skokem`

---

### Task 4: Křeček – model a animace

**Files:**
- Create: `src/characters/parts.ts`, `src/characters/hamsterAnim.ts`, `src/characters/hamster.ts`
- Test: `tests/characters/hamsterAnim.test.ts`, `tests/characters/hamster.test.ts`

**Interfaces:**
- Consumes: `Body` (Task 3)
- Produces:
  - `type HamsterMood = 'idle' | 'run' | 'air' | 'celebrate'`
  - `class HamsterAnim { mood: HamsterMood; cheekPuff: number /*0..1*/; gaitPhase: number; blink: number /*0..1*/; update(dt: number, speed: number, grounded: boolean): void; puffCheeks(): void; celebrate(): void }` – `run` při `speed > 0.2`; `puffCheeks` → `cheekPuff` 1 a za 0,6 s zpět na 0; `celebrate` trvá 1,2 s, pak `idle`
  - `class Hamster { readonly root: THREE.Group; readonly anim: HamsterAnim; sync(body: Body, dt: number): void; lookAt(target: THREE.Vector3 | null): void; dispose(): void }` – `sync` natočí plynule do směru rychlosti a aplikuje animační stav na části těla
  - `parts.ts`: `softMaterial(color: number): THREE.MeshStandardMaterial` (roughness 0,9), `eye(radius: number): THREE.Group` (černá koule + bílý odlesk)

Vzhled podle specu 4.3: zlatohnědá `0xd99a4e`, krémová `0xfff1dc` (bříško, tváře, čumák okolí), růžová `0xf4a6b0` (ouška vnitřek, čumáček, tlapky). Hlava ≈ 0,8× velikost těla, tváře viditelně vystupují.

- [ ] **Step 1: Failing testy**

```ts
it('rychlost 1 a na zemi → run; ve vzduchu → air'); 
it('puffCheeks: hned 1, po 0.6 s 0');
it('celebrate po 1.2 s přejde do idle');
it('Hamster.dispose uvolní všechny geometrie');   // spy na BufferGeometry.prototype.dispose, počet = počet meshí
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat. Animace procedurální: dýchání (škála těla ±2 %), mrkání každé 2–5 s, při běhu houpání těla a kmitání tlapek podle `gaitPhase`, tváře škálované `1 + 0.5 * cheekPuff`, při oslavě poskok a otočka.
- [ ] **Step 4:** `npm test` → PASS. Dočasně v `main.ts` napojit `CombinedController` + `stepBody` + `Hamster` na rovině; `npm run dev` → křeček běhá klávesnicí i joystickem a vypadá roztomile (vizuální kontrola, screenshot).
- [ ] **Step 5: Commit** – `feat: křeček z primitiv s animacemi`

---

### Task 5: Louka a kamera

**Files:**
- Create: `src/levels/level1Data.ts`, `src/world/meadow.ts`, `src/world/camera.ts`
- Test: `tests/levels/level1Data.test.ts`, `tests/world/camera.test.ts`

**Interfaces:**
- Consumes: `Collider`, `PhysicsWorld`, `PHYS` (Task 3)
- Produces:
  - `type ItemKind = 'nut' | 'strawberry' | 'carrot' | 'apple'`
  - `interface ItemSpot { kind: ItemKind; x: number; z: number; y: number }` – `y` = výška podložky (0 nebo vršek kamene)
  - `const LEVEL1: { spawn: {x,z}; hedgehog: {x,z}; house: {x,z}; colliders: Collider[]; items: ItemSpot[]; halfSize: 20 }` – 10× `nut`, po 1× `strawberry`, `carrot`, `apple`; právě jeden bonus leží na kameni
  - `buildMeadow(scene: THREE.Scene, data: typeof LEVEL1): { dispose(): void }` – vizuál všech colliderů + tráva, kytičky, strom v pozadí, domek, okrajový plot/keře, nebe (gradient), HemisphereLight + DirectionalLight se stíny (stínová mapa 1024, stíny jen od postav, keřů, domku)
  - `class FollowCamera { constructor(cam: THREE.PerspectiveCamera); update(target: THREE.Vector3, dt: number): void; get yaw(): number }` – za křečkem a nad ním (vzdálenost 4,5 m, výška 3 m), plynulé dohánění, yaw se k pohybu natáčí jen pomalu (aby „nahoru“ nevířilo)

- [ ] **Step 1: Failing testy**

```ts
it('má 10 oříšků a 3 různé bonusy');
it('žádná dobrota není uvnitř keře/domku/stromu');      // vodorovná vzdálenost od colliderů s height > 0.75 ≥ radius + 0.3
it('dobrota na kameni je na kameni nízkém na vyskočení'); // height ≤ 0.75 * 0.8 a item.y === height
it('všechny dobroty i ježek jsou uvnitř louky s rezervou 1 m');
it('keře, domek, strom a okraj jsou vyšší než skok');    // height > 0.75
it('FollowCamera po 2 s stojí za cílem ve vzdálenosti ~4.5 m');
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat. Tráva: 2–4 tisíce trsů v jednom `InstancedMesh` (3 zkřížené zúžené roviny, dvě odstíny zelené), bez stínů. Domek: kulatá chaloupka/ořechová skořápka s kulatými dvířky. Dobroty: oříšek (lískový – hnědá koule se světlou čepičkou), jahoda, mrkev, jablíčko; jemné vznášení a otáčení (vizuál je součástí Task 6).
- [ ] **Step 4:** `npm test` → PASS. `npm run dev` → křeček běhá po louce, nedostane se do keřů ani za okraj, vyskočí na nízký kámen. V Safari na iPadu (nebo Web Inspector) ≥ 55 fps.
- [ ] **Step 5: Commit** – `feat: louka kola 1 a sledovací kamera`

---

### Task 6: Kolo 1 – sbírání, hvězdy, nápověda

**Files:**
- Create: `src/levels/level.ts`, `src/levels/progress.ts`, `src/levels/level1.ts`
- Test: `tests/levels/progress.test.ts`, `tests/levels/level1.test.ts`

**Interfaces:**
- Consumes: `LEVEL1`, `buildMeadow`, `Hamster`, `stepBody`, `InputState`, `cameraRelative`
- Produces:
  - `interface LevelEvents { onCollect(kind: ItemKind, nutsCollected: number, nutsTotal: number): void; onComplete(stars: number): void; onNearNpc(): void }`
  - `interface Level { setup(scene: THREE.Scene, events: LevelEvents): void; update(dt: number, input: InputState, cameraYaw: number): void; readonly player: THREE.Object3D; isComplete(): boolean; stars(): number; dispose(): void }`
  - `class Progress { constructor(nutsTotal: number, bonusTotal: number); collect(kind: ItemKind): void; readonly nuts: number; readonly bonuses: number; isComplete(): boolean; stars(): number }`
  - `computeStars(complete: boolean, bonuses: number, bonusTotal: number): number` – nedokončeno 0; dokončeno `1 + Math.floor(2 * bonuses / bonusTotal)` (3 bonusy → 3, 2 → 2, 1 → 1, 0 → 1)
  - `class HintTimer { constructor(delay = 20); update(dt: number, collectedThisFrame: boolean): boolean /* true = ukázat nápovědu */ }`
  - `class Level1Meadow implements Level` – sebrání při vodorovné vzdálenosti < 0,5 m a rozdílu výšky < 0,5 m; po sebrání `hamster.anim.puffCheeks()`; po dokončení `hamster.anim.celebrate()`; nápověda = pulzující třpyt nad nejbližším oříškem

- [ ] **Step 1: Failing testy**

```ts
expect(computeStars(true, 0, 3)).toBe(1);
expect(computeStars(true, 3, 3)).toBe(3);
expect(computeStars(false, 3, 3)).toBe(0);
it('Progress je hotový po 10 oříšcích, bonusy nejsou potřeba');
it('HintTimer: po 20 s bez sběru true, sběr ho vynuluje');
it('Level1Meadow: dvojí setup/dispose (Znovu) nechá ve scéně stejný počet objektů a 13 dobrot'); // scene.children.length shodné, onCollect se volá jen jednou za dobrotu
it('Level1Meadow: dobrota se nesebere dvakrát');
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat. `dispose` odstraní z scény vše, co `setup` přidal, a uvolní geometrie/materiály.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** – `feat: kolo 1 – sbírání, hvězdy a nápověda`

---

### Task 7: Zvuky

**Files:**
- Create: `src/audio/sfx.ts`
- Test: `tests/audio/sfx.test.ts`

**Interfaces:**
- Produces:
  - `class Sfx { unlock(): void; setMuted(m: boolean): void; readonly muted: boolean; step(): void; collectNut(index: number): void; collectBonus(): void; jump(): void; chatter(syllables: number): void; fanfare(): void; click(): void; startAmbience(): void; stopAmbience(): void }`
  - `nutPitch(index: number): number` – frekvence v Hz, roste po půltónech od C5 (523,25 Hz): `523.25 * 2 ** (index / 12)`
- Hlasitost: master gain 0,4; všechny tóny s náběhem/doběhem obálky (žádné cvaknutí), bez ostrých vln (sine/triangle). Ambience: tiché ptačí cvrlikání (náhodné krátké sine chirpy) – zapínatelné, s ztlumením.
- `unlock()` se volá při každém `pointerdown` – když je AudioContext `suspended` (iOS po návratu z pozadí), zavolá `resume()`.

- [ ] **Step 1: Failing testy**

```ts
expect(nutPitch(0)).toBeCloseTo(523.25); expect(nutPitch(12)).toBeCloseTo(1046.5);
it('unlock obnoví pozastavený AudioContext');   // mock AudioContext se state 'suspended', resume spy
it('ztlumeno → žádný oscilátor se nevytvoří');
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat; napojit kroky na `gaitPhase` křečka (cupitání), sběr a skok na události kola.
- [ ] **Step 4:** `npm test` → PASS; poslechem ověřit, že nic neřeže a není hlasité.
- [ ] **Step 5: Commit** – `feat: zvuky přes Web Audio`

---

### Task 8: Ježek, bubliny a předčítání

**Files:**
- Create: `src/characters/hedgehog.ts`, `src/audio/speech.ts`
- Modify: `src/levels/level1.ts` (ježek, reakce na blízkost), `src/ui/screens.ts` (bublina – vytvořit zde, pokud ještě neexistuje)
- Test: `tests/audio/speech.test.ts`, `tests/characters/hedgehog.test.ts`

**Interfaces:**
- Consumes: `parts.ts`, `LevelEvents.onNearNpc`
- Produces:
  - `class Hedgehog { readonly root: THREE.Group; update(dt: number, lookTarget: THREE.Vector3 | null): void; wave(): void; hop(): void; dispose(): void }` – tělo hnědé `0x8a5a3c`, ostny = instancované kužely `0x5b3a26`, světlá tvář `0xf3d9b8`
  - `class Speech { constructor(synth?: SpeechSynthesis); say(text: string): void; readonly available: boolean }` – hlas: první s `lang.toLowerCase().startsWith('cs')`; pokud `getVoices()` vrátí `[]`, čeká na `voiceschanged`; bez českého hlasu `say` nic neudělá (bez chyby)
  - `showBubble(text: string, anchor: () => {x: number; y: number}, onReplay: () => void): { hide(): void }` – HTML bublina nad ježkem s tlačítkem reproduktoru
- Texty (přesně): začátek „Ahoj! Pomůžeš mi najít 10 oříšků?“; u ježka během kola „Ještě N oříšků!“ (N=1: „Ještě jeden oříšek!“), znovu nejdřív po 8 s; konec „Hurá, děkuju!“. Při každé bubline `sfx.chatter(počet slabik ≈ délka/3)`.

- [ ] **Step 1: Failing testy**

```ts
it('vybere český hlas i když přijde až po voiceschanged');
it('bez českého hlasu say nevyhodí a nic nepřečte');
it('bez speechSynthesis je available false');
it('remainingText(1) = "Ještě jeden oříšek!", remainingText(4) = "Ještě 4 oříšky!", remainingText(6) = "Ještě 6 oříšků!"'); // export z level1.ts
it('Hedgehog.dispose uvolní geometrie');
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat; `remainingText(n: number): string` s českým skloňováním (1 / 2–4 / 5+) exportovat z `level1.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** – `feat: ježek, bubliny a předčítání`

---

### Task 9: Obrazovky a průběh hry

**Files:**
- Create: `src/ui/flow.ts`, `src/ui/screens.ts` (doplnit), `src/ui/style.css`
- Modify: `src/main.ts` (vše propojit, odstranit dočasné demo z Task 4)
- Test: `tests/ui/flow.test.ts`

**Interfaces:**
- Consumes: `Level1Meadow`, `Sfx`, `Speech`, `storage`, `TouchController.joystickView`
- Produces:
  - `type Screen = 'title' | 'story' | 'playing' | 'paused' | 'levelEnd' | 'comingSoon'`
  - `class Flow { screen: Screen; start(): void /*title→story*/; continue(): void /*story→playing*/; complete(stars: number): void /*playing→levelEnd*/; retry(): void /*levelEnd→playing*/; next(): void /*levelEnd→comingSoon*/; pause(): void; resume(): void; onChange(cb: (s: Screen) => void): void }` – neplatné přechody ignoruje
- Obrazovky (texty přesně):
  - title: „Křečkova cesta“, tlačítko „Hrát“ (zároveň `sfx.unlock()`, pokus o fullscreen kde je API)
  - story: „Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu!“ – předčíst, pokračovat ťuknutím
  - HUD: ikona oříšku + „N / 10“, 3 obrysy hvězd (vyplňují se bonusy dle `computeStars` průběžně), vpravo nahoře ztlumit + pauza
  - joystick kreslený podle `joystickView`, vpravo dole velké kulaté tlačítko skoku (≥ 96 px)
  - levelEnd: hvězdy (animovaně naskočí), „Znovu“, „Dál“; uloží nejlepší počet hvězd (`storage`, klíč `stars.level1`)
  - comingSoon: „Další dobrodružství už brzy!“, „Zpět na začátek“
  - na výšku: překryv „Otoč tablet“ s ikonou (CSS `@media (orientation: portrait)`), hra se mezitím pozastaví
- Při `visibilitychange` → hidden: `flow.pause()`, `controller.reset()`.

- [ ] **Step 1: Failing testy**

```ts
it('title → story → playing → levelEnd → comingSoon');
it('retry z levelEnd vrátí playing');
it('complete z title se ignoruje');
it('pause/resume jen v playing');
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementovat flow, obrazovky (Baloo 2 zatím z `@fontsource/baloo-2`: `npm i @fontsource/baloo-2`, import v `main.ts`), propojení v `main.ts`.
- [ ] **Step 4:** `npm test` → PASS. `npm run dev` → projít celou hru od „Hrát“ po „Další dobrodružství už brzy!“ klávesnicí i (v DevTools dotykovém režimu) prstem; „Znovu“ funguje opakovaně.
- [ ] **Step 5: Commit** – `feat: obrazovky a průběh hry`

---

### Task 10: Instalovatelná webová aplikace a offline

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png` (180), `scripts/make-icons.ts` (vykreslí hlavičku křečka do PNG – nebo ruční SVG převedené na PNG)

**Interfaces:**
- Produces: manifest `{ name: "Křečkova cesta", short_name: "Křeček", display: "fullscreen", orientation: "landscape", background_color: "#bfe7a5", theme_color: "#bfe7a5" }`; service worker precachuje všechny assety (`vite-plugin-pwa`, `registerType: 'autoUpdate'`); v `index.html` `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-touch-icon`.

- [ ] **Step 1:** `npm i -D vite-plugin-pwa`, konfigurace dle Interfaces, ikony.
- [ ] **Step 2:** `npm run build && npx vite preview --host` → v DevTools Application: manifest bez chyb, service worker aktivní; po přepnutí do offline režimu se hra načte znovu i s písmem.
- [ ] **Step 3: Commit** – `feat: instalovatelná aplikace a offline`

---

### Task 11: Ověření na iPadu Air

- [ ] **Step 1:** `npm run dev` a otevřít adresu z výpisu (`http://<ip-macu>:5173`) v Safari na iPadu.
- [ ] **Step 2:** Projít checklist a výsledky zapsat do `docs/superpowers/plans/2026-11-23-zaklad-a-kolo-1.md` pod tento task:
  - zvuk hraje po „Hrát“; po přepnutí aplikace a návratu hraje dál po dalším dotyku
  - ježek mluví česky
  - joystick + skok současně dvěma prsty; po přepnutí aplikace křeček neběží sám
  - žádné zaseknutí o keře, kámen, okraj; na kámen s bonusem jde vyskočit
  - plynulost (Web Inspector → Timelines, cíl ≥ 55 fps); případně snížit počet trsů trávy
  - na výšku se ukáže „Otoč tablet“
  - „Znovu“ 3× za sebou bez chyb
- [ ] **Step 3:** Build + „Přidat na plochu“ → spustí se na celou obrazovku, funguje offline.
- [ ] **Step 4: Commit** – `docs: výsledky ověření na iPadu`
