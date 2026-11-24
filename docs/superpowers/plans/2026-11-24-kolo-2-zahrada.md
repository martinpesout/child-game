# Kolo 2 – Zahrada a mapa kol: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Druhé kolo (zahrada, závod s veverkou přes 8 bran včetně rour, mírný terén, kaluže, křeččí kolo v cíli) a mapa kol s odemykáním, postavené na společném základu kol.

**Architecture:** Fyzika dostane výškovou funkci terénu a otočené kvádry (stěny rour). Ze `Level1Meadow` se vyčlení `LevelBase` (křeček, fyzika, bonusové dobroty, motýli/včelky, oslava, řízení, zprůhledňování); kolo 1 a 2 z něj dědí. Svět se staví obecným `buildWorld` podle dat kola. Dráha kola 2 je jedna CatmullRom křivka, z níž se odvozuje cestička, brány i trasa veverky. `main.ts` řídí seznam kol, mapu a obrazovky.

**Tech Stack:** stávající – Vite 6, TypeScript strict, three r170, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-24-kolo-2-zahrada-design.md` (navazuje na `docs/superpowers/specs/2026-11-23-krecek-design.md`)

## Global Constraints

- Žádná prohra, žádný časový limit; veverka nikdy nevyhraje.
- Kolo 1 se chová beze změny – všechny jeho stávající testy musí procházet po každém tasku.
- Terén: amplituda ≤ 0,5 m, sklon takový, že kopec jde vyběhnout; u cestičky a bran rovina.
- localStorage jen přes `storage` (try/catch). Klíče: `progress.unlocked` (číslo nejvyššího odemčeného kola, 1-based), `stars.level<N>`.
- Texty česky, krátké; nové věty do `src/audio/lines.ts`; mluvčí veverka = `squirrel` (`ELEVENLABS_VOICE_SQUIRREL`).
- Výkon pro iPad: instancování opakujících se prvků, žádné nové stínové mapy.
- Výchozí kamera za křečkem + řízení jako autíčko; pevná kamera přepínatelná v pauze – obojí musí fungovat i v kole 2.

## Review Focus

1. **Brána objetá zvenku / průchod pozpátku** – neplatí jen průchod uvnitř obrysu; průchod oběma směry se počítá (dítě se může otočit), ale jen jednou a jen v pořadí. → testy v Task 5.
2. **Skok v rouře** – v rouře se neskáče (žádný strop ve fyzice), křeček nesmí uvíznout na střeše roury. → test v Task 6.
3. **Křeček stojí na svahu a na kvádru na svahu** – nesmí propadat ani klouzat bez vstupu. → test v Task 1.
4. **Stará data hráče** – existuje jen `stars.level1` ⇒ zahrada odemčená. → test v Task 2.
5. **„Znovu“ v kole 2 opakovaně** – brány, veverka, kolo se vrátí na start, žádné zdvojení objektů. → test v Task 9.

---

## Struktura souborů

```
src/physics/physics.ts        – + groundHeight, otočené boxy (yaw)
src/core/progress.ts          – LevelProgress (odemykání, nejlepší hvězdy, migrace)
src/world/terrain.ts          – Terrain (výškové pole, vyhlazení u cesty), mesh terénu
src/world/meadow.ts → world.ts – buildWorld(scene, WorldSpec) obecný (louka i zahrada)
src/world/garden.ts           – dekorace zahrady (záhony, konev, květináče, plůtky, kaluže, roury, obruče, křeččí kolo)
src/levels/levelBase.ts       – LevelBase (sdílená kostra kola)
src/levels/level1.ts          – Level1Meadow extends LevelBase (oříšky + ježek)
src/levels/course.ts          – Course (křivka, brány), GateTracker
src/levels/squirrelRunner.ts  – logika veverky podél křivky
src/levels/level2Data.ts      – data zahrady
src/levels/level2.ts          – Level2Garden extends LevelBase
src/levels/registry.ts        – LEVELS: popis 5 kol (název, ikona cíle, hotové/už brzy, factory)
src/characters/squirrel.ts    – Squirrel (model + animace)
src/ui/flow.ts                – + 'map'
src/ui/screens.ts             – mapa kol, obecný HUD (ikona cíle × N), tlačítka Mapa
src/audio/lines.ts            – věty kola 2
scripts/elevenlabs.ts         – mluvčí squirrel
```

---

### Task 1: Terén ve fyzice a otočené kvádry

**Files:** Modify `src/physics/physics.ts`; Test `tests/physics/terrain.test.ts`

**Interfaces:**
- Produces:
  - `PhysicsWorld` gains `ground?: (x: number, z: number) => number` (chybí ⇒ 0)
  - box collider gains `yaw?: number` (rotace kolem Y, radiány; chybí ⇒ 0)
  - collider `height` je **výška nad terénem v jeho středu**; vršek = `ground(c.x, c.z) + c.height`
  - `groundAt(x: number, z: number, world: PhysicsWorld): number`
  - `topHeightAt(...)` vrací max(ground, vršky colliderů pod tělem)

- [ ] **Step 1: Failing testy**
```ts
it('stojí na svahu bez klouzání')                 // ground = 0.3*sin(x*0.3); 2 s bez vstupu: |Δx|,|Δz| < 0.02, y ≈ ground
it('vyběhne kopec do svahu')                      // ground = 0.05*x; běh +x 3 s → x > 5, y ≈ ground(x)
it('nepropadne terénem ani s dt 0.1')             // pád z y=2 na ground=0.4 → y ≈ 0.4
it('kvádr na kopci: vršek = ground(střed)+height') // stání na kvádru na ground=0.3 → y ≈ 0.3+0.5
it('otočený kvádr (yaw π/4) blokuje po úhlopříčce') // tenká stěna 0.1×2 otočená; běh skrz → zastaví se
it('kolo 1: bez ground se nic nemění')             // stávající physics testy dál zelené
```
- [ ] **Step 2:** `npx vitest run tests/physics` → FAIL
- [ ] **Step 3:** Implementovat: floor = `topHeightAt`; pushOut boxu v lokálních souřadnicích (rotace o −yaw); vršky colliderů + ground.
- [ ] **Step 4:** `npx vitest run` → PASS (vše)
- [ ] **Step 5: Commit** `feat: terén a otočené překážky ve fyzice`

---

### Task 2: Pokrok hráče (mapa kol)

**Files:** Create `src/core/progress.ts`; Test `tests/core/progress.test.ts`

**Interfaces:**
- Produces: `class LevelProgress { constructor(levelCount: number, store = storage); unlocked: number; best(level: number): number; isUnlocked(level: number): boolean; complete(level: number, stars: number): void; current(): number /* nejvyšší odemčené, ≤ levelCount */ }` – kola číslována od 1

- [ ] **Step 1: Failing testy**
```ts
it('nový hráč: odemčené jen kolo 1')
it('dokončení kola 1 odemkne kolo 2 a uloží nejlepší hvězdy (nepřepíše lepší horším)')
it('staré stars.level1 > 0 bez progress.unlocked ⇒ odemčené kolo 2')
it('nikdy neodemkne víc než levelCount')
it('vadné úložiště nevyhodí')
```
- [ ] **Step 2–4:** RED → implementovat → `npx vitest run` GREEN
- [ ] **Step 5: Commit** `feat: pokrok hráče pro mapu kol`

---

### Task 3: Obecný svět a terén

**Files:** Create `src/world/terrain.ts`; Rename+Modify `src/world/meadow.ts` → `src/world/world.ts`; Modify `src/levels/level1Data.ts`, `src/levels/level1.ts`; Tests `tests/world/terrain.test.ts`, `tests/world/meadow.test.ts` (přejmenovat import)

**Interfaces:**
- Produces:
  - `class Terrain { constructor(opts: { seed: number; amplitude: number; flatten: { x: number; z: number; r: number }[] | ((x: number, z: number) => number) }); height(x: number, z: number): number; maxSlope(halfSize: number): number }` – plochý terén: `Terrain.flat()`
  - `interface WorldSpec { halfSize: number; terrain: Terrain; colliders: Collider[]; props: Prop[]; avoid: { x: number; z: number; r: number }[]; palette?: 'meadow' | 'garden'; houseFacing?: { x: number; z: number } }`
  - `buildWorld(scene, spec): World` kde `World = { sun; occluders: THREE.Object3D[]; update(focus); dispose() }` – terén jako mesh (PlaneGeometry s výškami), tráva/kytičky/props položené na `terrain.height`
  - `PropType` rozšířen o `'flowerbed' | 'fence' | 'can' | 'pot' | 'puddle' | 'tube' | 'wheel'` (vizuály v Task 6/8; zde jen typ)
  - `LEVEL1` přidá `terrain: Terrain.flat()`; `buildMeadow` nahrazeno `buildWorld`

- [ ] **Step 1: Failing testy**
```ts
it('Terrain.amplitude 0.5 ⇒ |height| ≤ 0.5 všude')
it('maxSlope zahrady ≤ 0.35 (kopec jde vyběhnout)')
it('flatten oblast je rovná (rozdíl výšek v kruhu < 0.02)')
it('buildWorld položí trávu na terén (žádný trs pod zemí)') // instanceMatrix y ≈ height(x,z)
// stávající meadow.test (zprůhlednění plotu) přejmenovat na world a dál zelené
```
- [ ] **Step 2–4:** RED → implementovat → `npx vitest run` GREEN (včetně všech testů kola 1)
- [ ] **Step 5: Commit** `refactor: obecný svět s terénem`

---

### Task 4: Společná kostra kola (LevelBase)

**Files:** Create `src/levels/levelBase.ts`; Modify `src/levels/level1.ts`, `src/levels/level.ts`; Test `tests/levels/levelBase.test.ts`

**Interfaces:**
- Produces:
  - `LevelEvents` + `onGoal?(index: number, total: number): void` (obecná náhrada pro HUD); kolo 1 volá vedle `onCollect` i `onGoal` pro oříšky
  - `abstract class LevelBase implements Level` s protected: `scene, events, body, world (PhysicsWorld), hamster, kit, treats (bonusy i cílové předměty), critters, worldView (World)`; veřejné: `player, steering, heading, occluders, critterObjects, treatsLeft, bonuses, goal: { done: number; total: number; icon: string }, isComplete(), stars(), dispose()`; abstraktní/háčky: `protected buildLevel(): void`, `protected updateLevel(dt, input): void`, `protected get spawn(): { x: number; z: number; heading: number }`, `protected celebrate(): void` (výchozí: konfety + celebrate křečka)
  - `Level1Meadow extends LevelBase` – veřejné API beze změny (`nuts`, `npc`, `remainingText` export)

- [ ] **Step 1: Failing test**
```ts
it('LevelBase: podtřída s 0 cíli je hned hotová, dispose uklidí scénu')
// + všechny tests/levels/level1.test.ts beze změny zelené
```
- [ ] **Step 2–4:** RED → přesunout sdílený kód → `npx vitest run` GREEN
- [ ] **Step 5: Commit** `refactor: společná kostra kola`

---

### Task 5: Dráha a brány

**Files:** Create `src/levels/course.ts`; Test `tests/levels/course.test.ts`

**Interfaces:**
- Produces:
  - `class Course { constructor(points: { x: number; z: number }[]); length: number; pointAt(s: number): { x: number; z: number }; tangentAt(s: number): { x: number; z: number }; nearestS(x: number, z: number): number; distanceTo(x: number, z: number): number }` – s v metrech od startu
  - `interface Gate { s: number; x: number; z: number; dirX: number; dirZ: number; radius: number; kind: 'hoop' | 'tube' }`
  - `placeGates(course: Course, specs: { s: number; kind: 'hoop' | 'tube' }[]): Gate[]`
  - `class GateTracker { constructor(gates: Gate[]); next: number; passed: number; update(prev: {x,z}, cur: {x,z}): number | null /* index právě projeté brány */ ; isDone(): boolean }` – průchod = segment prev→cur protne rovinu brány (kolmou na dir) ve vzdálenosti < radius od středu; jen brána `next`; oba směry
  - `navArrowVisible(distanceToCourse: number, nextGateOnScreen: boolean): boolean` – true když > 4 m nebo brána mimo záběr

- [ ] **Step 1: Failing testy**
```ts
it('Course: length ≈ součet úseků, pointAt(0)=start, pointAt(length)=cíl, nearestS vrátí správné s')
it('brána platí jen v pořadí')                 // průchod brankou 2 před 1 → null, next zůstane 0
it('obejití brány zvenku nic nezapočte')        // segment protne rovinu 2 m od středu (radius 0.9)
it('průchod pozpátku se počítá jednou')         // tam a zpět → passed 1
it('rychlý průchod (velký krok) se nezmešká')   // prev a cur 1 m před/za
it('isDone po všech branách')
it('navArrowVisible: 5 m → true; 2 m a brána vidět → false; 2 m mimo záběr → true')
```
- [ ] **Step 2–4:** RED → implementovat (CatmullRom přes THREE.CatmullRomCurve3 + tabulka délek) → GREEN
- [ ] **Step 5: Commit** `feat: dráha a brány v pořadí`

---

### Task 6: Prvky zahrady (obruče, roury, kaluže, dekorace, křeččí kolo)

**Files:** Create `src/world/garden.ts`; Modify `src/world/world.ts`, `src/audio/sfx.ts`; Tests `tests/world/garden.test.ts`, `tests/audio/sfx.test.ts`

**Interfaces:**
- Produces:
  - `tubeColliders(gate: Gate, length: number): Collider[]` – 2 otočené stěny (box yaw podle směru, výška 1.0) – mezera uvnitř ≥ 0.7 m
  - `tubeZone(gate, length): (x: number, z: number) => boolean` – uvnitř roury (zákaz skoku)
  - `puddleCollider(x, z, r): Collider` (cylinder výška 1.0, neviditelná stěna)
  - vizuály: `makeHoop(gate)`, `makeTube(gate, length)`, `makePuddle(r)`, `makeFlowerbed(...)`, `makeFence(...)`, `makeCan()`, `makePot()`, `makeWheel(): { root; spin(dt: number, speed: number): void; seat: THREE.Vector3 }`, `makePath(course): THREE.Mesh` (páska po terénu)
  - `setGateState(hoop: THREE.Object3D, state: 'next' | 'done' | 'waiting', t: number): void`
  - `Sfx.splash(): void` (cáknutí + „brr“)

- [ ] **Step 1: Failing testy**
```ts
it('roura jde proběhnout podél osy bez zaseknutí')       // stepBody přes tubeColliders → projde, y ≈ 0
it('do roury nejde vstoupit bokem')                      // běh kolmo → zastaví se u stěny
it('v rouře se neskáče a na střechu nevyleze')           // jump uvnitř tubeZone ignorován (testováno přes LevelBase háček v Task 9) – zde: tubeZone uvnitř true, venku false
it('do kaluže nejde vstoupit')                           // vzdálenost od středu ≥ r + 0.25
it('makeWheel.spin otáčí kolo')                          // rotace se mění
it('splash ztlumeno → žádný oscilátor')
```
- [ ] **Step 2–4:** RED → implementovat → GREEN
- [ ] **Step 5: Commit** `feat: obruče, roury, kaluže a dekorace zahrady`

---

### Task 7: Veverka

**Files:** Create `src/characters/squirrel.ts`, `src/levels/squirrelRunner.ts`; Tests `tests/levels/squirrelRunner.test.ts`, `tests/characters/squirrel.test.ts`

**Interfaces:**
- Produces:
  - `class SquirrelRunner { constructor(courseLength: number, opts = { lead: 3, wait: 7, finishMargin: 1.5, speed: 3.6 }); s: number; waiting: boolean; update(dt: number, playerS: number, playerDone: boolean): void }` – cíl `playerS + lead`, nikdy nad `courseLength − finishMargin` dokud `!playerDone`; když `s − playerS > wait` → stojí a `waiting = true`; po `playerDone` doběhne do cíle
  - `class Squirrel { root; update(dt: number, speed: number, lookTarget: THREE.Vector3 | null): void; wave(): void; cheer(): void; dispose(): void }` – oranžovohnědá `0xc8743a`, bříško `0xfbe3c4`, huňatý ocas (řetěz koulí) se vlní

- [ ] **Step 1: Failing testy**
```ts
it('drží se před křečkem (lead)')
it('čeká, když je křeček daleko (waiting)')
it('před cílem zastaví, dokud křeček nedokončí')   // playerS = length → s ≤ length − margin dokud !playerDone
it('po dokončení doběhne do cíle')
it('Squirrel.dispose uvolní geometrie')
```
- [ ] **Step 2–4:** RED → implementovat → GREEN
- [ ] **Step 5: Commit** `feat: veverka – model a závodní logika`

---

### Task 8: Data a kolo 2

**Files:** Create `src/levels/level2Data.ts`, `src/levels/level2.ts`; Modify `src/audio/lines.ts`, `scripts/elevenlabs.ts`; Tests `tests/levels/level2Data.test.ts`, `tests/levels/level2.test.ts`, `tests/scripts/elevenlabs.test.ts`

**Interfaces:**
- Consumes: Task 1–7
- Produces:
  - `LEVEL2 = { halfSize: 20, terrainSeed, courseLeft: points[], gates: { s, kind }[] /* 8, 2–3 tube */, puddles, props, bonuses: ItemSpot[] /* 3 */, wheel: { x, z } }`
  - `class Level2Garden extends LevelBase` – `goal = { done: passed, total: 8, icon: 'hoop' }`; veřejné `squirrel: Squirrel`, `navArrow: boolean`, `courseS: number`; events: `onGoal`, `onCollect` (bonusy), `onSquirrel?(line: LineId)` pro hlášky (start, povzbuzení max 1×/8 s, „Šup do roury!“ před rourou, cíl), `onSplash?()`; v cíli křeček přejde do `wheel.seat`, kolo se točí, `celebrate`
  - lines: `l2story`, `l2intro`, `l2cheer1..3`, `l2tube`, `l2finish`; `speakerFor` → `squirrel` pro `l2*` kromě `l2story` (narrator)

- [ ] **Step 1: Failing testy**
```ts
// data
it('8 bran v rostoucím s, 2–3 roury, první brána ≥ 4 m od startu')
it('kaluže, dobroty i dekorace jsou mimo cestičku (≥ 1.2 m od křivky)')
it('terén zahrady má maxSlope ≤ 0.35 a u cestičky je rovný')
// kolo
it('projetí všech bran po křivce dokončí kolo a onComplete přijde po oslavě')   // simulace: body posouvat po course.pointAt
it('veverka nikdy nedoběhne do cíle dřív než křeček')
it('v rouře nejde skočit')
it('naražení do kaluže vyšle onSplash')
it('dvojí setup/dispose (Znovu) nechá stejný počet objektů ve scéně a brány od nuly')
// elevenlabs
it("speakerFor('l2intro') === 'squirrel', speakerFor('l2story') === 'narrator'")
```
- [ ] **Step 2–4:** RED → implementovat → GREEN
- [ ] **Step 5: Commit** `feat: kolo 2 – zahrada a závod s veverkou`

---

### Task 9: Seznam kol, mapa a obrazovky

**Files:** Create `src/levels/registry.ts`; Modify `src/ui/flow.ts`, `src/ui/screens.ts`, `src/ui/icons.ts`, `src/ui/style.css`, `src/main.ts`; Tests `tests/ui/flow.test.ts`, `tests/levels/registry.test.ts`

**Interfaces:**
- Produces:
  - `LEVELS: { id: number; name: string; ready: boolean; story?: LineId; create?: () => LevelBase; goalIcon?: string }[]` – 1 louka, 2 zahrada (ready), 3 kamenitá cesta, 4 pod stromem, 5 domů (ready: false)
  - `Screen` + `'map'`; Flow: `title → map` (`start`), `map → story` (`pick(level)`), `levelEnd → story` (`next()` když další kolo ready, jinak `comingSoon`), `levelEnd/paused/comingSoon → map` (`toMap()`), `current: number`
  - Screens: `map(levels, progress, onPick)`, HUD `setGoal(icon: string, total: number)` + `fillGoal(i)`, `fillBonus(kind)`; `levelEnd(stars, onRetry, onNext, onMap)`; pauza + „Mapa“; navigační šipka `setArrow(visible: boolean, angle: number)`
  - icons: `hoop`

- [ ] **Step 1: Failing testy**
```ts
it('title → map → story(2) → playing → levelEnd → next → comingSoon')
it('levelEnd kola 1 → next → story kola 2')
it('toMap z pauzy, konce kola i comingSoon')
it('pick zamčeného nebo neready kola se ignoruje')     // registry + LevelProgress
it('registry: 5 kol, ready jsou jen 1 a 2, každé ready má create a story')
```
- [ ] **Step 2–4:** RED → implementovat → `npx vitest run` GREEN
- [ ] **Step 5:** `npm run dev` → projít: mapa → louka → Dál → zahrada → závod (obě kamery) → kolo v cíli → hvězdy → Mapa → zahrada odemčená i po reloadu; v rouře kamera vidí křečka
- [ ] **Step 6: Commit** `feat: mapa kol a propojení kola 2`

---

### Task 10: Ověření

- [ ] `npx tsc && npx vitest run && npm run build` – vše zelené
- [ ] Prohlížeč: obě kola, mapa, „Znovu“ 3× v kole 2, kaluž, roura, šipka
- [ ] Nezávislá kontrola celé větve (opus), opravy Critical/Important s testem
- [ ] Uživatel: `npm run voice` (nové věty, hlas veverky), iPad/telefon
