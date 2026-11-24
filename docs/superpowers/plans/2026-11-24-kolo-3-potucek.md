# Kolo 3 – Potůček se žabkou: implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hratelné 3. kolo – 6 přechodů potůčku po kamenech, pařezech, potápějících se leknínech a houpající se kládě, se žabkou, pádem do vody s návratem a jahodou v cíli.

**Architecture:** Kolo 3 je další potomek `LevelBase` (jako louka a zahrada). Fyzika dostane pohyblivé překážky (`supportOf` + `moveCollider`), voda je čistá funkce nad korytem potůčku (křivka `Course` + poloviční šířka). Přechody se počítají stávajícím `GateTracker` (nový druh brány `'line'`). Vizuály potůčku jsou v `src/world/brook.ts`, žabka v `src/characters/frog.ts`, její pohyb v čisté logice `FrogGuide`.

**Tech Stack:** Vite 6, TypeScript strict, three r170, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-24-kolo-3-potucek-design.md`

## Global Constraints

- Kola 1 a 2 beze změny chování; všech 176 stávajících testů dál prochází (po přejmenování `onSquirrel` → `onFriendSay` upravit jen jejich volání).
- Fyzika: `PHYS = { gravity: 18, jumpSpeed: 5.2, maxSpeed: 3.2 }` se nemění. Dosah skoku s rozběhem ~1,85 m po rovině, ~1,55 m na +0,4 m.
- Mezery (hrana–hrana): přechod 1 ~0,6–0,8 m, 2 ~0,8–1,0, 3 ~1,0–1,2, 4 ~1,0–1,3, ostatní do 1,4 m; k leknínům/kládě a z nich ≤ 1,1 m (v nejhorší poloze klády).
- Vršky kamenů/pařezů mají průměr ≥ 0,9 m; pařez max. +0,4 m nad břehem (na souši do +0,5 m).
- Leknín: klesá po ~1,5 s stání, pod vodou za další ~1,5 s, vynoří se do ~2 s; před klesáním se zachvěje.
- Kláda: 1,8 × 0,6 m, dlouhou osou podél proudu (napříč směrem skoku), houpání podél své osy ±0,5 m s periodou ~3 s, pohupování ±0,05 m.
- Vršek leknínu a klády nikdy není výš než kámen/břeh, ze kterého se na ně skáče, a skok z nich nevede do kopce.
- 6 přechodů, celkem ~30 skoků; 2–3 „skákací schody“ na souši; 3 bonusy (aspoň jeden na kameni stranou trasy).
- Pád do vody: návrat na poslední pevné místo (kámen, pařez, břeh – nikdy leknín/kláda), nic se neztrácí; hláška smíchu max. 1× za 4 s; po 3 pádech na stejném přechodu nápověda.
- Jahodu jde sníst jen po všech 6 přechodech. Ukládání přes `LevelProgress` (kolo 3).
- Texty česky, krátké a veselé. Komentáře v kódu anglicky (jako zbytek projektu).
- Klíč ElevenLabs nikdy do chatu ani do gitu.

## Review Focus

1. **Skok z pohyblivé plošiny ve chvíli, kdy se pohne** – křeček na kládě, která se zrovna obrací, musí vyskočit stejně vysoko jako z kamene (veze se jen vodorovně + výška, rychlost skoku se nemění). Test v Task 1.
2. **Leknín klesne pod křečka, který na něm stojí bez pohybu** – křeček nesmí „viset ve vzduchu“ ani zůstat stát na vodě; musí spadnout a vrátit se na kámen před leknínem. Test v Task 6.
3. **Pád hned po návratu / pád při oslavě** – návrat nesmí křečka postavit na místo, ze kterého hned znovu spadne (poslední pevné místo se zapisuje jen při stání na pevné překážce nebo břehu); po snědení jahody se pád už nevyhodnocuje. Testy v Task 6.
4. **Přeskočení přechodu jinudy** – křeček, který obejde přechod po souši nebo přeskočí kytičku z boku, nesmí rozbít pořadí (jahoda zůstane zavřená). Test v Task 6.
5. **Opakované „Znovu“** – kolo se postaví a zruší 3× bez úniku objektů ve scéně a s čistým stavem pádů/přechodů. Test v Task 6.

---

### Task 1: Pohyblivé překážky ve fyzice

**Files:**
- Modify: `src/physics/physics.ts`
- Test: `tests/physics/physics.test.ts`

**Interfaces:**
- Produces:
  - `supportOf(body: Body, world: PhysicsWorld): Collider | null` – překážka, na jejímž vršku tělo stojí (`body.grounded` a |vršek − `body.pos.y`| < 1e-3 a tělo je nad její plochou podle stejného pravidla jako `topHeightAt`), jinak `null` (stojí na zemi / ve vzduchu).
  - `moveCollider(c: Collider, to: { x: number; z: number; height: number }, bodies: Body[], world: PhysicsWorld): void` – posune překážku; každé tělo, pro které `supportOf(...) === c` (vyhodnoceno **před** posunem), posune o stejné dx, dz a o změnu vršku dy.

- [ ] **Step 1: Write the failing tests** (`describe('pohyblivé překážky')`)
  - `supportOf vrátí kámen, na kterém tělo stojí, a null na zemi` – válec r 0,5 výšky 0,3; tělo položené na vršek a jeden `stepBody` bez pohybu → `supportOf` je ten válec; tělo na zemi vedle → `null`.
  - `tělo se veze s posunutou překážkou` – kvádr 0,9 × 0,3, tělo na něm; 60× `moveCollider(c, {x: c.x + 0.01, ...})` + `stepBody(idle)` → tělo se posunulo o 0,6 ± 0,02 a stále `grounded`, `supportOf === c`.
  - `klesající překážka nese tělo dolů a pod vodou ho pustí` – válec, `height` klesá o 0,01 za krok 40 kroků → `body.pos.y` = nový vršek ± 1e-3 a `grounded`.
  - `skok z jedoucí překážky je stejně vysoký jako z pevné` – výška vrcholu skoku z kvádru, který se pohybuje 0,5 m/s do strany, se liší od skoku z pevného o < 0,02.
  - `tělo na zemi vedle překážky se s ní nepohne` – tělo 2 m od kvádru, `moveCollider` o 0,3 → pozice těla beze změny.

- [ ] **Step 2: Run to verify fail** – `npx vitest run tests/physics/physics.test.ts` → FAIL „supportOf is not exported“.
- [ ] **Step 3: Implement `supportOf` and `moveCollider`** in `src/physics/physics.ts`. Vyčlenit z `topHeightAt` pomocnou funkci `isOver(c, x, z, radius)` a použít ji v obou místech (beze změny chování `topHeightAt`). `moveCollider` mutuje `c.x`, `c.z`, `c.height` na místě (kolo drží referenci uvnitř `world.colliders`).
- [ ] **Step 4: Verify** – `npx vitest run tests/physics` → PASS, i staré testy fyziky a terénu.
- [ ] **Step 5: Commit** – `feat: pohyblivé překážky ve fyzice (veze se s nimi)`

### Task 2: Stín pod křečkem a boční pohled kamery

**Files:**
- Create: `src/world/shadow.ts`
- Modify: `src/levels/levelBase.ts`, `src/world/camera.ts`
- Test: `tests/world/shadow.test.ts`, `tests/world/camera.test.ts`, `tests/levels/levelBase.test.ts`

**Interfaces:**
- Produces:
  - `class BlobShadow { readonly mesh: THREE.Mesh; place(x: number, z: number, groundY: number, bodyY: number): void; dispose(): void }` – kruh (r 0,3) těsně nad `groundY` (+0,01), měřítko `1 / (1 + 0.6 * (bodyY - groundY))`, průhlednost klesá s výškou (min 0,25).
  - `LevelBase` vytvoří `BlobShadow` v `setup`, v `update` volá `place(pos.x, pos.z, topHeightAt(pos.x, pos.z, radius, physics), pos.y)`, uklidí v `dispose`. Platí pro všechna kola.
  - `FollowCamera.setSideBias(rad: number): void` – v režimu za křečkem se cílový úhel kamery posune o `rad` (plynule, stejnou rychlostí jako `CHASE_TURN_RATE`); v pevném režimu se ignoruje (joystick musí dál znamenat směr obrazovky). Getter `yaw` bias nezahrnuje.

- [ ] **Step 1: Failing tests**
  - `stín leží na vršku kamene, ne na zemi pod ním` (`shadow.test.ts`) – `place(0,0, 0.3, 0.3)` → `mesh.position.y ≈ 0.31`.
  - `stín se ve skoku zmenší, ale nezmizí` – `place(0,0,0,0.75)` → `mesh.scale.x < 1`, `material.opacity ≥ 0.25`.
  - `levelBase: stín sleduje křečka` – `Level1Meadow` po `setup` má ve scéně objekt se jménem `'blobShadow'`, po `dispose` už ne.
  - `kamera: boční náklon v režimu za křečkem otočí kameru, v pevném ne` (`camera.test.ts`) – chase, heading 0, `setSideBias(0.6)`, 300× `update` → úhel pozice kamery kolem cíle se liší od bez-biasu o 0,6 ± 0,05; v pevném režimu se pozice nezmění; `yaw` je v obou případech stejný jako bez biasu.
- [ ] **Step 2: Verify fail** – `npx vitest run tests/world/shadow.test.ts tests/world/camera.test.ts tests/levels/levelBase.test.ts` → FAIL.
- [ ] **Step 3: Implement** `BlobShadow` (MeshBasicMaterial černá, `transparent`, `depthWrite: false`, jméno `'blobShadow'`), napojení v `LevelBase`, `setSideBias` v `FollowCamera`.
- [ ] **Step 4: Verify** – `npx vitest run` → vše PASS.
- [ ] **Step 5: Commit** – `feat: stín pod křečkem a boční natočení kamery`

### Task 3: Data potůčku a přechodů

**Files:**
- Create: `src/levels/level3Data.ts`
- Modify: `src/levels/course.ts` (druh brány `'line'`)
- Test: `tests/levels/level3Data.test.ts`, `tests/levels/course.test.ts`

**Interfaces:**
- Consumes: `Course`, `Gate`, `placeGates`, `GATE_RADIUS` z `course.ts`.
- Produces:
  - `course.ts`: `Gate.kind` rozšířen o `'line'`; `GATE_RADIUS.line = 2.0`.
  - `type StepKind = 'stone' | 'stump' | 'lily' | 'log'`
  - `interface StepSpot { kind: StepKind; x: number; z: number; r: number; top: number /* world y vršku */; yaw?: number /* log: směr dlouhé osy */ }`
  - `interface Crossing { steps: StepSpot[]; endS: number /* s na trase, kde je kytička */ }`
  - `LEVEL3 = { halfSize: 20, track: {x,z}[], brook: {x,z}[], brookHalfWidth: number, waterY: number, bankY: 0, bedY: number, crossings: …, landSteps: …, bonuses: …, props: Prop[] }` – tvar dat volí stavitel; hodnoty: `waterY = -0.15` (fyzikální hladina pádu, viz níže), `bedY = -1.2`, vršky kamenů `0.15`, pařezů `0.15 + 0.25…0.4`, leknín `0.05`, kláda `0.15`.
  - `level3Course(): Course`, `level3Brook(): Course`
  - `level3Crossings(course: Course): Crossing[]` (6 položek), `level3LandSteps(course): StepSpot[]`, `level3Bonuses(course): {kind, x, z, y}[]`
  - `inBrook(brook: Course, halfWidth: number, x: number, z: number): boolean`
  - `level3Ground(brook, halfWidth): (x, z) => number` – `bedY` v korytě, jinak `0`.
  - `FALL_Y = -0.25` – tělo v korytě pod touto výškou = pád do vody.
  - `jumpReach(fromTop: number, toTop: number): number` – vodorovný dosah skoku při `maxSpeed` mezi vršky (z `PHYS`, analyticky).

  *Vizuálně leží hladina na y ≈ 0,02 (těsně nad trávou), fyzikálně se pád pozná pod `FALL_Y`; vršky kamenů 0,15 jsou tak vidět nad vodou a skok z kamene na břeh vede mírně dolů.*

- [ ] **Step 1: Failing tests** (`level3Data.test.ts`)
  - `potůček kříží trasu právě 6×` – vzorkovat trasu po 0,1 m, spočítat přechody `inBrook` false→true.
  - `každý přechod začíná na břehu a končí na břehu za potokem` – první/poslední bod skoků je ≤ 1,4 m od břehu; `endS` je mimo koryto.
  - `všechny kameny přechodu leží ve vodě a mají vršek ≥ 0,9 m v průměru` (`r ≥ 0.45`, kláda: šířka ≥ 0,6).
  - `mezery rostou podle návrhu` – pro přechod i spočítat mezery hrana–hrana (vč. břeh→první, poslední→břeh); max mezera přechodu 1 ≤ 0,8, 2 ≤ 1,0, 3 ≤ 1,2, 4 ≤ 1,3, celkově ≤ 1,4; mezery sousedící s `lily`/`log` ≤ 1,1, u klády počítat v nejhorší poloze (±0,5 m podél její osy).
  - `každá mezera je doskočitelná s rezervou` – mezera ≤ `jumpReach(from.top, to.top) - 0.35`.
  - `na přechodu 5 jsou 2 lekníny a na přechodu 6 leknín i kláda; jinde nic pohyblivého`.
  - `skoků je celkem 28–34` (součet kroků všech přechodů + schodů na souši + 6 doskoků na břeh).
  - `bonusy: 3, aspoň jeden leží na kameni stranou trasy, žádný ve vodě mimo kámen`.
  - `jumpReach po rovině ≈ 1,85 a na +0,4 ≈ 1,55` (± 0,05).
  - `course.test.ts`: `brána 'line' se počítá do 2 m od středu`.
- [ ] **Step 2: Verify fail** – `npx vitest run tests/levels/level3Data.test.ts tests/levels/course.test.ts` → FAIL.
- [ ] **Step 3: Implement** `level3Data.ts`. Trasa vede od jihu na sever klikatě, potůček se vine napříč; přechody umístit jako body podél trasy kolem průsečíku (rozložení po trase, mírně do stran u přechodu 4 – skok i do strany). Kytička (`endS`) ~1 m za břehem.
- [ ] **Step 4: Verify** – testy PASS; doladit souřadnice, dokud neprojdou.
- [ ] **Step 5: Commit** – `feat: data 3. kola – potůček, přechody a doskočitelné mezery`

### Task 4: Vizuály potůčku

**Files:**
- Create: `src/world/brook.ts`
- Test: `tests/world/brook.test.ts`

**Interfaces:**
- Consumes: `Course`, `StepSpot` (Task 3), `PartKit`/`mat` vzory z `garden.ts`.
- Produces:
  - `makeWater(brook: Course, halfWidth: number): THREE.Mesh` – pás vody podél křivky (y 0,02), jméno `'water'`, `update(t)` není třeba – jemné vlnění přes `userData.tick(t)`.
  - `makeStone(r, top, seed)`, `makeStump(r, top)`, `makeLily(r)` (s kytičkou, `userData.pad` pro náklon/chvění), `makeLog(len, radius, yaw)` – kořen každého v `y = 0` místa, vršek ve výšce `top`.
  - `makeFlowerMarker(): { root; bloom(t: number): void; open: boolean }` – zavřené poupě na břehu, `bloom` ho rozvine.
  - `makeBud(): { root; open(): void; update(dt): void }` – velký květ na cílovém pařezu, ve kterém je jahoda.
  - `makeRipples(): { root; spawn(x, z): void; update(dt): void }` – kruhy na hladině po pádu.
  - `setStepGlow(obj, on: boolean, t: number)` – jemné svícení dalšího kamene.
  - `makeReeds(seed)`, `makeBankStone(seed)` dekorace.
- [ ] **Step 1: Failing tests** – každý `make*` vrátí objekt s vrškem ve správné výšce (bounding box `max.y ≈ top ± 0.05`); `makeLog` má delší rozměr podél `yaw`; `makeFlowerMarker().bloom(1)` nastaví `open = true` a zvětší okvětí; `makeRipples` po `update(2)` nemá viditelné kruhy; `setStepGlow` mění `emissiveIntensity`.
- [ ] **Step 2: Verify fail** – `npx vitest run tests/world/brook.test.ts` → FAIL.
- [ ] **Step 3: Implement** ve stylu `garden.ts` (sdílené materiály, low-poly, plochý vršek kamene).
- [ ] **Step 4: Verify** – PASS.
- [ ] **Step 5: Commit** – `feat: vizuály potůčku – voda, kameny, pařezy, leknín, kláda, kytičky`

### Task 5: Žabka a její vedení

**Files:**
- Create: `src/characters/frog.ts`, `src/levels/frogGuide.ts`
- Test: `tests/characters/frog.test.ts`, `tests/levels/frogGuide.test.ts`

**Interfaces:**
- Produces:
  - `class Frog { readonly root: THREE.Group; wave(): void; laugh(): void; cheer(): void; hop(): void /* radostné poskakování v cíli */; update(dt: number, look: THREE.Vector3 | null, hopK: number /* 0..1 fáze skoku */): void; dispose(): void }` – zelená, oči nahoře, světlé bříško, růžové tvářičky, kvákací vak (`userData.sac`) dýchá. Splňuje `Npc` (`root`, `wave`).
  - `class FrogGuide { constructor(legs: {x: number; z: number; y: number}[][], opts?: { hopTime?: number /* 0.45 */; startNear?: number /* 2.5 */ }); update(dt: number, hamster: {x: number; z: number}, crossingsDone: number): void; readonly pos: {x,y,z}; readonly hopK: number; readonly heading: number; readonly leg: number; readonly waiting: boolean }` – `legs[i]` = body přechodu i (start na břehu, vršky kamenů, cíl na druhém břehu u kytičky). Žabka čeká na začátku úseku `i`, dokud není křeček do `startNear` m, pak přeskáče body po obloucích (výška oblouku 0,5 m) a čeká na konci. Na úsek `i+1` přejde po souši, až když `crossingsDone > i`. Nikdy nepředběhne o víc než jeden úsek.
- [ ] **Step 1: Failing tests**
  - `frog.test.ts`: postava má hlavu, oči, vak; `dispose` uvolní geometrie; `laugh()` rozkmitá `root` (pozice v čase se mění).
  - `frogGuide.test.ts`: `čeká na začátku, dokud křeček nepřijde` (křeček daleko 5 s → `pos` = start úseku 0); `přeskáče úsek po bodech a čeká na konci`; `na další úsek jde až po splnění přechodu`; `ve skoku je výš než body (oblouk)`; `heading míří k dalšímu bodu`.
- [ ] **Step 2: Verify fail** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** – PASS.
- [ ] **Step 5: Commit** – `feat: žabka a její vedení přes potůček`

### Task 6: Kolo 3 – `Level3Brook`

**Files:**
- Create: `src/levels/level3.ts`, `src/levels/platforms.ts`
- Modify: `src/levels/level.ts` (`onSquirrel` → `onFriendSay`, nové `onRespawn?()`), `src/levels/level2.ts` (volá `onFriendSay`), `tests/levels/level2.test.ts` (přejmenování)
- Test: `tests/levels/platforms.test.ts`, `tests/levels/level3.test.ts`

**Interfaces:**
- Consumes: Task 1 (`supportOf`, `moveCollider`), Task 2 (stín v kostře, `cameraBias` pro kameru), Task 3 (data), Task 4 (vizuály), Task 5 (`Frog`, `FrogGuide`).
- Produces:
  - `platforms.ts`: `class LilyPad { constructor(opts?: { delay?: 1.5; sink?: 1.5; rise?: 2; depth?: 0.45 }); update(dt: number, occupied: boolean): void; readonly drop: number /* 0..depth, o kolik je vršek níž */; readonly shaking: boolean }` a `logOffset(t: number): { along: number; bob: number }` (`along = 0.5 * sin(2πt/3)`, `bob = 0.05 * sin(2πt/1.7)`).
  - `LevelEvents.onFriendSay?(id: LineId, obj: THREE.Object3D)` (nahrazuje `onSquirrel`), `onRespawn?()` (krátké zatmění), `onSink?()` (leknín se začal potápět – žbluňk), stávající `onSplash` pro pád do vody.
  - `class Level3Brook extends LevelBase` – `goal = { done, total: 6, icon: 'flower' }`, `npc: Frog`, `celebrationTime = 3.5`, `get cameraBias(): number` (±0,55 rad na přechodu podle strany, jinak 0), `get finishShot()` (pohled z boku na žabku a křečka u pařezu), `falls: number` (pro testy).
  - Chování:
    - Fyzika: statické kameny/pařezy = válce, kláda = otočený kvádr, lekníny = válce; vše v `physics.colliders` s `height = top − ground(x,z)`; svět s `ground = level3Ground(...)`.
    - Každý krok: posun klády (`logOffset`) a leknínů (`LilyPad`, `occupied = supportOf(body) === collider`) přes `moveCollider` **před** `super.update` → implementovat přepsáním `update()`: nejdřív plošiny, pak `super.update(...)`.
    - Poslední pevné místo: zapsat `{x, y, z, heading}`, když je tělo `grounded` a `supportOf` je statický kámen/pařez, nebo stojí na zemi mimo koryto.
    - Pád: tělo v korytě pod `FALL_Y` a kolo není dokončené → `onSplash`, ripples, smích žabky (`l3laugh1..3`, max. 1× za 4 s), po 0,8 s `onRespawn` + návrat (vel = 0, `grounded`), `falls++`; 3 pády na stejném přechodu → `l3hint` (jednou na přechod).
    - Přechody: `GateTracker` s branami `'line'` v `endS`; průchod → `onGoal(i)`, kytička rozkvete, žabka `cheer` + občas `l3cheer1..2` (cooldown 8 s); před 5. přechodem jednou `l3lily`.
    - Leknín: při přechodu do stavu klesání jednou `onSink`.
    - Svícení dalšího kamene: nejbližší ještě nesešlápnutý krok aktuálního přechodu.
    - Cíl: po 6 přechodech se květ na pařezu otevře; dotyk jahody (vodorovně < 0,6, svisle < 0,5) → dokončeno (`isComplete`), žabka `hop` + `l3finish`, jahoda „sněta“ (`puffCheeks`).
- [ ] **Step 1: Failing tests**
  - `platforms.test.ts`: `leknín bez křečka neklesá`; `po 1,5 s stání se chvěje a začne klesat`; `za další 1,5 s je vršek ≥ 0,4 pod původní výškou`; `po seskočení se do 2 s vynoří`; `logOffset má amplitudu 0,5 a periodu 3 s`.
  - `level3.test.ts` (pomocník `hopAlong(level)` – staví tělo postupně na vršky kroků všech přechodů a mezi nimi na trasu, jako `driveTo` v kole 2):
    - `projetí všech přechodů a snědení jahody dokončí kolo; onGoal 0..5; onComplete po oslavě`.
    - `jahodu nejde sníst před dokončením všech přechodů` (tělo položené na jahodu po 3 přechodech → `isComplete() === false`).
    - `pád do vody vrátí křečka na poslední kámen, ne na leknín` – stát na kameni před leknínem, pak na leknínu, pak tělo pod `FALL_Y` v korytě → po 1 s je tělo na kameni (± 0,3), `onSplash` a `onRespawn` jednou, `falls === 1`.
    - `křeček stojící na leknínu spadne a vrátí se` (Review Focus 2) – položit na leknín, 4 s `update(idle)` → `falls === 1`, tělo zpět na kameni před leknínem.
    - `křeček na kládě se veze a z klády jde vyskočit` – 1,5 s na kládě → x/z se změnilo, `grounded`; skok (`action`) → vrchol ≥ vršek + 0,6.
    - `po třech pádech na stejném přechodu žabka poradí jednou` – 4 pády → `l3hint` v řečech právě 1×.
    - `smích nejvýš jednou za 4 s`.
    - `obejití přechodu po souši nespustí kytičku dalšího přechodu mimo pořadí` (Review Focus 4).
    - `po dokončení se pády nevyhodnocují` (Review Focus 3).
    - `návrat nikdy na místo ve vodě` – po sérii náhodných pádů je každé místo návratu mimo koryto nebo na statickém kroku.
    - `3× setup/dispose nenechá ve scéně nic navíc` (Review Focus 5).
  - `level2.test.ts`: přejmenovat `onSquirrel` → `onFriendSay` (žádná změna očekávání).
- [ ] **Step 2: Verify fail** – `npx vitest run tests/levels` → FAIL (level3 chybí).
- [ ] **Step 3: Implement** `platforms.ts`, `level3.ts`; přejmenovat událost v `level.ts` a `level2.ts`.
- [ ] **Step 4: Verify** – `npx vitest run` → vše PASS.
- [ ] **Step 5: Commit** – `feat: 3. kolo – potůček se žabkou, pády do vody, lekníny a kláda`

### Task 7: Napojení do hry – mapa, hlášky, zvuky, lišta

**Files:**
- Modify: `src/levels/registry.ts`, `src/audio/lines.ts`, `scripts/elevenlabs.ts`, `.env.example`, `src/audio/sfx.ts`, `src/ui/icons.ts`, `src/ui/screens.ts`, `src/ui/style.css`, `src/main.ts`
- Test: `tests/levels/registry.test.ts`, `tests/scripts/elevenlabs.test.ts`, `tests/audio/sfx.test.ts`, `tests/ui/flow.test.ts`

**Interfaces:**
- Consumes: `Level3Brook` (Task 6), `onFriendSay`, `onRespawn`, `cameraBias`, `finishShot`.
- Produces:
  - `LEVELS[2] = { id: 3, name: 'Kamenitá cesta', ready: true, story: 'l3story', intro: 'l3intro', create: () => new Level3Brook() }`.
  - `LINES`: `l3story: 'Cestu přehradil potůček. Na druhém břehu roste jahoda!'`, `l3intro: 'Kvák! Skákej po kamenech za mnou!'`, `l3laugh1: 'Kvák-kvák, to studí!'`, `l3laugh2: 'Žbluňk! Nevadí, zkus to znovu!'`, `l3laugh3: 'Hihi, kvák! Ještě jednou!'`, `l3cheer1: 'Hop! Výborný skok!'`, `l3cheer2: 'Kvák! Jsi skokan!'`, `l3hint: 'Rozběhni se a skoč dřív!'`, `l3lily: 'Pozor, lekníny se potápí! Skákej rychle!'`, `l3finish: 'Kvák! Jsi skokan jako já! Tady je tvoje jahoda.'`.
  - `Speaker` + `'frog'`; `speakerFor`: `l3story` → narrator, ostatní `l3*` → frog; `.env.example` řádek `ELEVENLABS_VOICE_FROG=`.
  - `Sfx.croak(): void` (krátké dvojité „kvák“ – pila s rychlým poklesem výšky přes lowpass), `Sfx.plop(): void` (žbluňk – sinus s poklesem 600→150 Hz, 0,15 s).
  - `ICONS.flower` (obrys kytičky pro lištu).
  - `Screens.fade(): void` – krátké zatmění přes overlay (0,15 s do černa 50 %, 0,3 s zpět), CSS třída `.fade`.
  - `main.ts`: `onFriendSay(id, obj)` (dříve `onSquirrel`; v `play`/`celebrate`), `onRespawn: () => screens.fade()`, `follow.setSideBias(level.cameraBias ?? 0)` každý krok, croak při řeči žabky (`levelId === 3`), `onSink: () => sfx.plop()`.
- [ ] **Step 1: Failing tests**
  - `registry.test.ts`: `kolo 3 je hratelné, kola 4–5 ne`; `kolo 3 vytvoří Level3Brook s npc`.
  - `elevenlabs.test.ts`: `l3story čte vypravěč, l3intro žabka`; `ELEVENLABS_VOICE_FROG se použije pro žabku`.
  - `sfx.test.ts`: `croak a plop nespadnou bez AudioContextu a při ztlumení nic nehrají` (stejný vzor jako existující testy splash/buzz).
  - `flow.test.ts`: `po kole 2 „Dál“ vede na příběh kola 3, když je odemčené; po kole 3 na „už brzy“`.
- [ ] **Step 2: Verify fail** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** – `npx vitest run` a `npx tsc --noEmit` → vše PASS.
- [ ] **Step 5: Commit** – `feat: 3. kolo v mapě, hlášky žabky, kvákání a zatmění po pádu`

### Task 8: Ruční ověření v prohlížeči

**Files:** žádné nové (opravy podle nálezů, každá s testem, pokud jde o logiku).

- [ ] **Step 1:** `npm run dev`, v prohlížeči: mapa (kolo 3 odemčené po zahradě – nastavit přes `localStorage progress.unlocked = 3`), příběh, úvod, žabka.
- [ ] **Step 2:** Přes `window.__game` projít přechody 1–6: stín je vidět ve skoku, další kámen svítí, kamera se na přechodu natočí z boku, leknín se zachvěje a potopí, kláda se houpe a veze, pád → cáknutí, smích, zatmění, návrat na kámen.
- [ ] **Step 3:** Cíl: květ se otevře, jahoda, konfety, `l3finish`, hvězdy; „Mapa“ během oslavy neztratí postup; „Dál“ → „už brzy“.
- [ ] **Step 4:** Regrese: kolo 1 a 2 (stín, kamera beze změny mimo kolo 3).
- [ ] **Step 5:** Commit oprav (pokud nějaké) – `fix: …`
