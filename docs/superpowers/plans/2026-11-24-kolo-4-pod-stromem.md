# Kolo 4 – Pod stromem: implementační plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hratelné 4. kolo – krtek, 8 hromádek k vyhrabání (tlapka, 3 ťuknutí), 2 ohrady z kořenů dosažitelné jen přes podzemní hrabací bludiště (diorama scéna, pohyb po políčkách, 2 ťuknutí na políčko, kamínky, truhla, kostra dinosaura, žížala, brouček), kolečkový přechod.

**Architecture:** `Level4Tree extends LevelBase` řídí povrch (fyzika jako dřív) a stavový automat `surface → irisIn → underground → irisOut → surface`. Podzemí je samostatná 3D scéna `Underground` (vlastní `THREE.Scene` + kamera) nad čistou logikou `MazeGrid` (mřížka, hrabání, pohyb, řešitelnost). `main.ts` renderuje scénu a kameru, kterou kolo nabídne (`level.view3d`), a kreslí kolečkový přechod v UI vrstvě. Akční tlačítko je obecné: kolo řekne `actionMode` (`'jump' | 'dig' | 'enter'`) a LevelBase na náběžnou hranu volá `onAction`.

**Tech Stack:** Vite 6, TypeScript strict, three r170, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-24-kolo-4-pod-stromem-design.md`

## Global Constraints

- Kola 1–3 beze změny chování; všech 240 stávajících testů dál prochází.
- Hromádka: 3 ťuknutí, poloměr dosahu ~0,8 m, hromádka není překážka. 8 hromádek: 4 na louce, 2 v ohradě 1, 2 v ohradě 2.
- Políčko hlíny pod zemí: 2 ťuknutí. Bludiště 1 ~14×7, bludiště 2 ~16×8, obě ručně navržená a řešitelná; kamínky, truhla (2×2, bludiště 1), kostra dinosaura (~5×2, bludiště 2) neprohrabatelné; řada kořenů nahoře pevná kromě jediného východu.
- Pod zemí: pohyb po políčkách 4 směry (dominantní osa joysticku), přechod ~0,2 s, bez padání; odchod zpět vstupní šachtou kdykoli, stav bludiště zůstává.
- Kolečkový přechod: stažení ~0,5 s + rozevření ~0,5 s; během něj se nedá ovládat.
- Ohrady vyšší než skok, nedají se přeskočit; z ohrady se nedá uvíznout (druhý krtinec „zpět na louku“).
- Obě díry otevřené od začátku, libovolné pořadí.
- Bonusy: jahoda, mrkev, jablko (stejné sloty lišty) – 1 na povrchu, 1 v každém bludišti.
- Hlasy: `l4story` vypravěč; krtek `ELEVENLABS_VOICE_MOLE` → jinak `ELEVENLABS_VOICE_HEDGEHOG`; žížala `ELEVENLABS_VOICE_WORM` → jinak `…_BUTTERFLY`; brouček `ELEVENLABS_VOICE_BEETLE` → jinak `…_BEE`.
- Animace jen posun/natočení/měřítko dílů; nic se nehýbe přes cestu křečka ani přes hrabané políčko.
- Texty česky, krátké a veselé; komentáře v kódu anglicky. Klíč ElevenLabs nikdy do chatu ani gitu.

## Review Focus

1. **Ťukání vs. držení tlačítka** – akce u hromádky/políčka se počítá jen na náběžnou hranu (držení ≠ 10 hrabnutí za sekundu), a když křeček od hromádky odejde s drženým tlačítkem, nesmí vyskočit hned jako „zbytek“ hrabání. Test v Task 2.
2. **Pauza / Znovu / Mapa uprostřed kolečka nebo pod zemí** – po „Znovu“ je kolo čisté na povrchu (žádná podzemní scéna v renderu, kolečko zmizí); po „Mapa“ se podzemí uklidí. Testy v Task 6 a 7.
3. **Joystick šikmo pod zemí** – šikmý směr se převede na jednu osu (dominantní), nikdy diagonální krok skrz roh mezi dvěma kamínky. Test v Task 1.
4. **Návrat ven a znovu dovnitř** – vyhrabané políčka a sebrané dobroty zůstanou, dobrota se nezapočítá dvakrát; vstup po vyhrabání východu jde rovnou znovu projít. Test v Task 6.
5. **Uvíznutí v ohradě** – po vyhrabání hromádek v ohradě i bez nich se z ohrady vždy dá dostat krtincem zpět. Test v Task 6.

---

### Task 1: Logika bludiště `MazeGrid` a data dvou bludišť

**Files:**
- Create: `src/levels/maze.ts`, `src/levels/level4Mazes.ts`
- Test: `tests/levels/maze.test.ts`, `tests/levels/level4Mazes.test.ts`

**Interfaces:**
- Produces:
  - `type CellKind = 'soil' | 'stone' | 'roots' | 'open' | 'exit' | 'big'` (big = část velké věci).
  - `interface MazeDef { rows: string[]; entry: { x: number; y: number }; bigs: { kind: 'chest' | 'dino' | 'boot' | 'can' | 'bones'; x: number; y: number; w: number; h: number }[]; items: { kind: ItemKind; x: number; y: number }[]; friends: { kind: 'worm' | 'beetle'; x: number; y: number }[] }` – znaky řádků: `.` hlína, `#` kamínek, `R` kořeny, `E` východ, `o` volné (kapsa/vstup), velké věci se zapisují v `bigs` přes políčka `.`/`o`.
  - `class MazeGrid { constructor(def: MazeDef); readonly cols; readonly rows; kind(x, y): CellKind; hp(x, y): number; pos: {x, y}; facing: {x, y}; move(dx: number, dy: number): 'moved' | 'turned' | 'blocked'; dig(): { result: 'cracked' | 'dug' | 'exit' | 'blocked' | 'nothing'; x: number; y: number; item?: ItemKind; bigKind?: string }; atEntry(): boolean; readonly exited: boolean; solvable(): boolean; snapshot(): string }`.
  - `toDir(move: {x: number; y: number}, dead = 0.35): {x: number; y: number} | null` – dominantní osa, `y` joysticku nahoru = −1 v mřížce.
  - `LEVEL4_MAZES: [MazeDef, MazeDef]`.
- [ ] **Step 1: Failing tests** (`maze.test.ts`)
  - `hlína potřebuje 2 ťuknutí, pak je políčko volné` (`cracked` → `dug`, `kind === 'open'`).
  - `kamínek, velká věc i kořeny nejdou prohrabat ani projít` (`dig().result === 'blocked'`, `move` → `blocked`).
  - `východ jde prohrabat jen ve svém políčku a nastaví exited` (2 ťuknutí → `exit`, `exited === true`).
  - `pohyb do hlíny jen natočí, do volného přejde`.
  - `toDir: šikmý joystick vybere dominantní osu, malý výchylka nic` (`{x: 0.6, y: 0.5}` → `{1,0}`, `{0.2,0.1}` → null, y nahoru → −1).
  - `dobrota v políčku se vrátí jen jednou` (dig přes políčko s `item` → `item` jednou, podruhé `nothing`).
  - `snapshot zachová vyhrabaný stav` (nový `MazeGrid` + obnovení ze snapshot – nebo grid instance přežije; zvolit: kolo drží instanci).
  - `level4Mazes.test.ts`: `obě bludiště jsou řešitelná ze vstupu k východu (BFS přes hlínu)`; `velikosti ~14×7 a ~16×8`; `řada 0 jsou kořeny kromě jednoho E`; `truhla 2×2 v bludišti 1, dinosaurus ≥5×2 v bludišti 2`; `každé má 1 bonus a 1 kamaráda (žížala / brouček)`; `velké věci nepřekrývají vstup, východ, dobroty ani kamarády`.
- [ ] **Step 2: Verify fail** – `npx vitest run tests/levels/maze.test.ts tests/levels/level4Mazes.test.ts` → FAIL.
- [ ] **Step 3: Implement** `maze.ts` (velké věci se při konstrukci zapíší jako `big` do mřížky) a `level4Mazes.ts`.
- [ ] **Step 4: Verify** → PASS.
- [ ] **Step 5: Commit** – `feat: logika hrabacího bludiště a dvě bludiště 4. kola`

### Task 2: Akční tlačítko podle situace (skok / hrabání / zalézt)

**Files:**
- Modify: `src/levels/levelBase.ts`, `src/ui/screens.ts`, `src/ui/icons.ts`, `src/ui/style.css`
- Test: `tests/levels/levelBase.test.ts`, `tests/ui/screens.test.ts` (nový, jsdom)

**Interfaces:**
- Produces:
  - `type ActionMode = 'jump' | 'dig' | 'enter'`.
  - `LevelBase`: `get actionMode(): ActionMode` (veřejný; volá chráněný `protected currentAction(): ActionMode`, výchozí `'jump'`), `protected onAction(mode: ActionMode): void {}`. V `update`: když `currentAction() !== 'jump'`, skok se nepředá fyzice a `onAction(mode)` se volá jen na náběžnou hranu `input.action`; po přepnutí z `dig/enter` na `jump` se skok povolí až po uvolnění tlačítka.
  - `ICONS.paw`, `ICONS.enter` (šipka dolů do díry), `ICONS.mound` (lišta).
  - `Screens.setAction(mode: ActionMode): void` – vymění ikonu tlačítka (jen při změně).
- [ ] **Step 1: Failing tests**
  - `levelBase: u hromádky se drží tlačítko → onAction jen jednou a žádný skok` (testovací podtřída s `currentAction = 'dig'`).
  - `levelBase: po odchodu od hromádky s drženým tlačítkem nevyskočí, po uvolnění a novém stisku ano`.
  - `levelBase: výchozí kolo skáče jako dřív` (kolo 1 – stávající testy).
  - `screens: setAction('dig') vloží ikonu tlapky, setAction('jump') vrátí šipku`.
- [ ] **Step 2: Verify fail** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify** – `npx vitest run` → vše PASS.
- [ ] **Step 5: Commit** – `feat: akční tlačítko se mění podle situace (skok, hrabání, zalézt)`

### Task 3: Postavy – krtek, žížala, brouček

**Files:**
- Create: `src/characters/mole.ts`, `src/characters/critters4.ts`
- Test: `tests/characters/mole.test.ts`, `tests/characters/critters4.test.ts`

**Interfaces:**
- Produces:
  - `class Mole { root; wave(); peek(up: boolean): void /* vykouknutí z krtince */; dance(): void; update(dt, look: THREE.Vector3 | null): void; dispose() }` – tmavě šedá, růžový čumák, lopatkové tlapky, malá očka; `peek(false)` schová pod zem (root.y klesne), `peek(true)` vykoukne. Splňuje `Npc`.
  - `class Worm { root; update(dt): void; dispose() }` – vlnění článků, občas se schová a vykoukne.
  - `class Beetle { root; awake: boolean; wake(): void; startle(): void; update(dt): void; dispose() }` – spí (oddychování, „Zzz“ bublinka jako sprite/mesh), cuká tykadly; po `wake` se protáhne a mává.
- [ ] **Step 1: Failing tests** – každá postava má `dispose`, které uvolní geometrie; `Mole.peek(false)` → po 1 s je `root.position.y < -0.2`, `peek(true)` → zpět ≥ 0; `Worm.update` mění tvar v čase; `Beetle` spí (`awake === false`, objekt `'zzz'` viditelný), po `wake()` `awake` a `'zzz'` skrytý.
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** – `feat: krtek, žížala a brouček`

### Task 4: Podzemní diorama `Underground`

**Files:**
- Create: `src/world/underground.ts`
- Test: `tests/world/underground.test.ts`

**Interfaces:**
- Consumes: `MazeGrid`, `MazeDef`, `toDir` (Task 1), `Hamster` (stávající), `Worm`, `Beetle` (Task 3), `makeTreat`.
- Produces:
  - `class Underground { readonly scene: THREE.Scene; readonly camera: THREE.PerspectiveCamera; readonly grid: MazeGrid; constructor(def: MazeDef, hamster: Hamster /* vlastní instance pro podzemí */); enter(): void /* křeček na vstup */; update(dt: number, move: {x: number; y: number}, tap: boolean): UndergroundEvent[]; hamsterScreen(): {x: number; y: number} /* 0..1 pro kolečko */; resize(aspect: number): void; dispose(): void }`
  - `type UndergroundEvent = { type: 'dig' | 'crack' | 'blocked' | 'item' | 'friend' | 'big' | 'exit' | 'leave'; item?: ItemKind; friend?: 'worm' | 'beetle'; big?: string }`
  - Scéna: bloky hlíny (InstancedMesh, hloubka ~0,6 m), kamínky, kořeny, truhla (víko pootevřené, zlaťáky), kostra dinosaura (kulaté kosti, lebka s čelistí, která cvakne po `big` události), drobnosti (holínka, plechovka, kosti), pruh trávy se stromem a nebem nahoře, paprsek slunce + kytička nad východem (pulzuje), vstupní šachta; pevná kamera mírně zepředu a shora, celé bludiště v záběru (`resize` přepočítá vzdálenost podle poměru stran).
  - Pohyb: `move` → `toDir` → `grid.move` s tweenem 0,2 s (během tweenu se další krok nebere); `tap` (náběžná hrana) → `grid.dig()` + drobky + praskliny; zvýraznění políčka, kam křeček kouká; ambient: kořínky se kývají, tráva vlní, občas drobek.
  - `leave`: křeček stojí na vstupu a joystick míří nahoru (do šachty).
- [ ] **Step 1: Failing tests**
  - `celé bludiště je v záběru kamery` (projekce rohů mřížky do NDC v rozsahu ±0,95 pro poměr 4:3 i 16:9).
  - `hrabání vyhrabe políčko a vrátí události crack → dig`; `do kamínku blocked`.
  - `pohyb trvá ~0,2 s a během něj se další krok nebere`.
  - `vyhrabání východu vrátí exit`; `joystick nahoru na vstupu vrátí leave`.
  - `kamarád: první přiblížení vrátí friend jednou` (žížala / brouček – brouček se probudí).
  - `velká věc: dotyk vrátí big jednou za ~6 s`.
  - `dispose uvolní geometrie a scénu`.
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** – `feat: podzemní diorama s hrabacím bludištěm`

### Task 5: Povrch 4. kola – data a vizuály

**Files:**
- Create: `src/levels/level4Data.ts`, `src/world/burrow.ts`
- Test: `tests/levels/level4Data.test.ts`, `tests/world/burrow.test.ts`

**Interfaces:**
- Produces:
  - `LEVEL4 = { halfSize: 20, tree: {x, z, r}, spawn, mounds: {x, z, pen: 0 | 1 | 2}[] /* 8 */, pens: { x, z, rx, rz, hole: {x, z} /* na louce u plotu */, inside: {x, z} /* krtinec výstupu */, back: {x, z} /* krtinec zpět ven */ }[] /* 2 */, bonus: {kind: 'strawberry', x, z}, props: Prop[] }`
  - `penColliders(pen): Collider[]` – prstenec válců (kořenový plot) výšky 1,1 m (víc než skok ~0,75), bez mezery.
  - `insidePen(pen, x, z): boolean`.
  - `burrow.ts`: `makeBigTree()`, `makeMound(seed): { root; setLeft(k: 0..3): void; shake(t): void }`, `makeHole()`, `makeMolehill()`, `makeRootFence(pen)`, `makeFallingLeaf()` (ambient).
- [ ] **Step 1: Failing tests**
  - `8 hromádek: 4 venku, 2 v každé ohradě; žádná ve stromu ani v plotu`.
  - `plot ohrady je vyšší než skok a bez mezer (bod uvnitř → přímka ven protíná kolizi)`.
  - `díra je venku u ohrady, výstupní a zpáteční krtinec uvnitř`.
  - `fyzika: křeček skákající na plot ho nepřeskočí` (`stepBody` + skok proti plotu 3 s → stále venku).
  - `makeMound.setLeft(0) zmenší hromádku na plocho`.
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** – `feat: povrch 4. kola – strom, hromádky, ohrady z kořenů`

### Task 6: Kolo 4 – `Level4Tree`

**Files:**
- Create: `src/levels/level4.ts`
- Modify: `src/levels/level.ts` (volitelné `view3d`), `src/levels/registry.ts` (typ `PlayableLevel` beze změny)
- Test: `tests/levels/level4.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5, `LevelBase` (`currentAction`, `onAction`, `resetHeading`).
- Produces:
  - `Level4Tree extends LevelBase`: `goal = { done, total: 8, icon: 'mound' }`, `npc: Mole`, `celebrationTime = 3.5`, `get view3d(): { scene: THREE.Scene; camera: THREE.Camera } | null` (podzemí, když je aktivní), `get iris(): { k: number /* 0 zavřeno .. 1 otevřeno */; x: number; y: number } | null` (pro UI), `get mode(): 'surface' | 'irisIn' | 'underground' | 'irisOut'`, `get finishShot()`.
  - Události: stávající `onGoal`, `onCollect`, `onFriendSay(id, obj)` (krtek, žížala, brouček – `obj` pod zemí = objekt v podzemní scéně; main pozná scénu přes `view3d`), nové `onDig?(kind: 'mound' | 'soil' | 'blocked')`.
  - Chování:
    - `currentAction()`: u nevyhrabané hromádky (≤ 0,8 m) `'dig'`, u díry (≤ 0,9 m) `'enter'`, u zpátečního krtince v ohradě `'enter'`, jinak `'jump'`.
    - `onAction('dig')`: hromádka −1 (3 ťuknutí), drobky, `onDig('mound')`; po 3. poklad (animace + `puffCheeks`), `onGoal(index)`.
    - `onAction('enter')` u díry → `irisIn` (0,5 s) → `underground` (`Underground.enter()`) → kolečko se rozevře (0,5 s); u zpátečního krtince → kolečko → křeček stojí venku u díry.
    - Pod zemí `update` neposílá vstup do fyziky povrchu; volá `underground.update(dt, input.move, tapEdge)`; události: `dig/crack` → `onDig('soil')`, `item` → bonus (`onCollect` + `bonusTaken++` přes sdílenou cestu), `friend` → hláška žížaly/broučka, `big` → vtipná hláška, `exit` → kolečko → křeček vyskočí z výstupního krtince v ohradě, `leave` → kolečko → zpět u díry.
    - Stav podzemí (instance `Underground` pro každou ohradu) se drží po celé kolo; dispose obou při `onDispose`.
    - Krtek vykukuje z krtince u nejbližšího nehotového místa (hromádka nebo díra), hlášky s cooldownem 8 s; cíl: všech 8 hromádek → `isComplete`, krtek vyleze a tančí, `l4finish`.
- [ ] **Step 1: Failing tests** (`level4.test.ts`, pomocníci `put`, `tick`, `tap()` = jeden snímek s action true a jeden false)
  - `vyhrabání všech 8 hromádek dokončí kolo (venkovní pěšky, v ohradách přes podzemí)` – projde: 4 hromádky, díra 1 → vyřešit bludiště 1 (cestou z BFS řešení) → ohrada 1 (2 hromádky) → zpět krtincem → díra 2 → bludiště 2 → ohrada 2 → `onGoal` 0..7, `isComplete`, `onComplete` po oslavě.
  - `hromádka potřebuje 3 ťuknutí; držení tlačítka hrabe jen jednou` (Review Focus 1).
  - `u díry je actionMode 'enter', u hromádky 'dig', jinde 'jump'`.
  - `během kolečka se nedá ovládat a view3d se přepne až v půlce`.
  - `návrat vstupem zachová vyhrabané políčka a dobrota se nezapočítá dvakrát` (Review Focus 4).
  - `z ohrady se vždy dostane zpět krtincem, i bez vyhrabaných hromádek` (Review Focus 5).
  - `bonusy: povrchový + v každém bludišti jeden → 3 hvězdy po dokončení`.
  - `3× setup/dispose nenechá ve scéně nic navíc a view3d je po dispose null` (Review Focus 2).
- [ ] **Step 2–4:** fail → implement → pass.
- [ ] **Step 5: Commit** – `feat: 4. kolo – hromádky, ohrady a cesta podzemím`

### Task 7: Napojení do hry – render podzemí, kolečko, zvuky, hlasy, mapa

**Files:**
- Modify: `src/main.ts`, `src/ui/screens.ts`, `src/ui/style.css`, `src/audio/sfx.ts`, `src/audio/lines.ts`, `scripts/elevenlabs.ts`, `.env.example`, `src/levels/registry.ts`
- Test: `tests/ui/screens.test.ts`, `tests/audio/sfx.test.ts`, `tests/scripts/elevenlabs.test.ts`, `tests/levels/registry.test.ts`, `tests/ui/flow.test.ts`

**Interfaces:**
- Consumes: `Level4Tree` (Task 6), `actionMode`, `view3d`, `iris`.
- Produces:
  - `LINES`: `l4story: 'Pod velkým stromem bydlí krtek. Schoval tam spoustu pokladů!'`, `l4intro: 'Ahoj! Pomůžeš mi vyhrabat poklady? Hrabej tlapkou!'`, `l4cheer1: 'Hurá, poklad!'`, `l4cheer2: 'Ty jsi ale šikovný hrabáček!'`, `l4hole: 'Zalez dovnitř, vyhrabeš se k pokladům!'`, `l4worm: 'Ahoj, kopáči! Sluníčko je nahoře!'`, `l4stone: 'Kamínek nejde, zkus to jinudy.'`, `l4chest: 'Ta truhla je moc těžká, i pro krtka!'`, `l4beetle: 'Chrrr… Cože? Kdo mě budí? No nic, dobrou!'`, `l4dino: 'Cvak cvak! Neboj, to je jen stará kostra.'`, `l4finish: 'Děkuju, kamaráde! Teď máme plnou spíž.'`.
  - `speakerFor`: `l4story` → narrator; `l4worm`, `l4stone`, `l4chest` → worm; `l4beetle`, `l4dino` → beetle; ostatní `l4*` → mole. `voiceIdFor` s fallbackem `mole → hedgehog`, `worm → butterfly`, `beetle → bee` (pak `ELEVENLABS_VOICE`). `.env.example`: `ELEVENLABS_VOICE_MOLE=`, `…_WORM=`, `…_BEETLE=`.
  - `Sfx.dig()` (šustivé hrabnutí – šum s pásmovou propustí), `Sfx.thud()` (ťuk do kamínku), `Sfx.snore()` (chrápání broučka), `Sfx.pop()` (vykouknutí z krtince).
  - `Screens.iris(k: number | null, x: number, y: number)` – vrstva s radiálním gradientem (`mask`/`background: radial-gradient`), k = 0 zavřeno, 1 / null = skryté.
  - `main.ts`: render `level.view3d ?? { scene, camera }`; `screens.setAction(level.actionMode)` každý krok; `screens.iris(...)` z `level.iris`; `onDig` → `sfx.dig()/thud()`; bubliny pod zemí promítají kamerou `view3d`; `follow` se pod zemí neaktualizuje; resize posílá poměr stran i do podzemí (`level.resizeUnderground?.(aspect)`); `registry`: kolo 4 `ready`, `story: 'l4story'`, `intro: 'l4intro'`.
- [ ] **Step 1: Failing tests**
  - `screens: iris(0.5, 0.3, 0.4) zobrazí vrstvu s kruhem; iris(null) ji skryje`.
  - `sfx: dig/thud/snore/pop ztlumeno nic, jinak zvuk; bez AudioContextu nespadnou`.
  - `elevenlabs: l4intro → mole, l4worm → worm, l4beetle → beetle; mole bez vlastního ID použije hlas ježka; worm motýla; beetle včelky`.
  - `registry: hotová jsou kola 1–4; kolo 4 vytvoří Level4Tree s npc`.
  - `flow: kolo 3 → Dál → příběh kola 4; po kole 4 „už brzy“`.
- [ ] **Step 2–4:** fail → implement → pass; `npx tsc --noEmit` čisté.
- [ ] **Step 5: Commit** – `feat: 4. kolo v mapě, render podzemí, kolečkový přechod, zvuky a hlasy`

### Task 8: Ruční ověření v prohlížeči

- [ ] **Step 1:** `localStorage progress.unlocked = 4`, mapa → kolo 4 → příběh → úvod krtka.
- [ ] **Step 2:** hromádka: tlačítko se změní na tlapku, 3 ťuknutí, poklad, lišta; skok jinde funguje.
- [ ] **Step 3:** díra → kolečko → podzemí: celé bludiště v záběru, pohyb po políčkách, hrabání 2 ťuknutí, kamínek/truhla/dinosaurus, žížala/brouček s animací a hláškou, východ → kolečko → ohrada; návrat zpátečním krtincem; druhé bludiště.
- [ ] **Step 4:** pauza pod zemí → Znovu / Mapa; dokončení, hvězdy, „Dál“ → „už brzy“; regrese kol 1–3.
- [ ] **Step 5:** Commit oprav (pokud nějaké) – `fix: …`
