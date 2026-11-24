# Kolo 3 – Kamenitá cesta přes potůček: návrh

Datum: 2026-11-24
Stav: schváleno
Navazuje na: `docs/superpowers/specs/2026-11-23-krecek-design.md` (vize, kapitola 3) a `2026-11-24-kolo-2-zahrada-design.md` (společný základ kol, mapa)

## 1. Záměr

Třetí kolo příběhu: za zahradou cestu přehradí potůček, na druhé straně roste jahoda. Žabka učí křečka **skákat**.
Dítě skáče po kamenech a pařezech přes klikatý potůček. Pád do vody je legrace (cáknutí, žabka se směje), ne trest.
Skoků je hodně (kolem 30 za kolo), aby to bylo zábavné. Na posledních dvou přechodech čekají překvapení: potápějící se lekníny a houpající se kláda.

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**
- Hratelné kolo 3 od příběhové obrazovky po hvězdičky; na mapě se odemkne dokončením zahrady.
- Skok je pro dítě 5–8 let na iPadu zvládnutelný: vždy je vidět, kam křeček dopadne, a mezery rostou postupně.
- Pohyblivé plošiny (leknín, kláda) fungují ve fyzice: křeček se veze, nepropadne, nezasekne se.
- Kola 1 a 2 fungují beze změny chování (všechny jejich testy dál procházejí).

**Ne-cíle**
- Skutečné naklánění klády (kláda má vždy rovný vršek).
- Plavání, životy, časový limit, prohra.
- Kola 4–5.

**Anti-cíle**
- Dítě opakovaně padá a neví proč (skok je neodhadnutelný).
- Pád vrátí dítě daleko zpět nebo mu něco vezme.
- Křeček uvízne na hraně kamene, mezi kameny nebo pod klesajícím leknínem.
- Žabka se dítěti posmívá zle (smích je přátelský, spolu s povzbuzením).

## 3. Jak to dítě zažije

1. Po zahradě „Dál“ (nebo z mapy) → příběh: „Cestu přehradil potůček. Na druhém břehu roste jahoda!“ (vypravěč).
2. Úvodní detail křečka, pak žabka na prvním kameni: „Kvák! Skákej po kamenech za mnou!“
3. Potůček se klikatí krajinou; křeček ho přeskáče **6×** (6 přechodů), na každém přechodu 3–5 skoků. Mezi přechody jsou na souši krátké „skákací schody“ z pařezů a kamenů (bez vody, pád jen znamená skočit znovu). Každý přechod končí na břehu, kde po doskoku **rozkvete kytička** (pevný bod).
4. Žabka vždy čeká na začátku dalšího přechodu a přeskáče ho napřed (ukáže cestu), pak čeká na druhém břehu.
5. **Pád do vody:** cáknutí, kruhy na vodě, žabka se zasměje („Kvák-kvák, to studí!“ / „Nevadí, zkus to znovu!“), krátké zatmění a křeček se objeví na **posledním pevném místě, kde stál** (kámen, pařez nebo břeh – nikdy ne leknín ani kláda; z nich se vrací na kámen před nimi).
6. 5. přechod: kameny a **lekníny** (po ~1,5 s pod křečkem začne klesat, za další ~1,5 s je pod vodou). 6. přechod: kámen → leknín → kámen → **kláda** (pomalu se houpe tam a zpět) → kámen → břeh.
7. Cíl: velký pařez s **jahodou** → křeček ji sní, konfety, fanfára, žabka radostně skáče („Kvák! Jsi skokan jako já!“), pak hvězdičky.

## 4. Mechanika kola 3

### 4.1 Potůček a trasa
- Trasa je jedna otevřená křivka (stejně jako dráha v zahradě, CatmullRom), potůček ji 6× kříží. Potůček je vlastní křivka; v jeho šířce (~2,5–4 m) je terén snížený pod hladinu.
- **Voda**: hladina (průhledná modrá plocha s jemným vlněním) v pevné výšce. Křeček, jehož pozice klesne pod hladinu nad korytem, „spadl do vody“ (viz 4.4). Koryto je hlubší než skok, takže z vody nejde vylézt chůzí.
- Přechody (mezery mezi plochami, kam se skáče, měřeno hrana–hrana):
  - 1. přechod: 2–3 kameny, mezery ~0,6–0,8 m, stejná výška jako břeh.
  - 2. přechod: 3–4 kameny, mezery ~0,8–1,0 m, jeden o kousek výš (schod nahoru).
  - 3. přechod: kameny a pařez (vyšší, ~0,4 m), mezery ~1,0–1,2 m.
  - 4. přechod: 4–5 kamenů a pařezů, cesta zatáčí (skok i do strany), mezery ~1,0–1,3 m.
  - 5. přechod: kameny a 2 lekníny (první překvapení).
  - 6. přechod: kámen – leknín – kámen – kláda – kámen – břeh.
  - Mezery k leknínům a kládě a z nich nejvýš ~1,1 m (pohyblivý cíl potřebuje větší rezervu), ostatní do ~1,4 m.
  - Mezi přechody: 2–3 krátké „skákací schody“ na souši (pařezy různé výšky do ~0,5 m, mezery do ~1,0 m) a na ně schované dobroty.
  - Celkem kolem 30 skoků.
  - Křeček doskočí s rozběhem ~1,85 m po rovině, na o 0,4 m vyšší pařez ~1,55 m; nejdelší mezery nechávají rezervu.
  - *Výšky (volba návrháře):* hladina je jen ~0,15 m pod vrškem břehu a kamenů; vršek leknínu a klády je ve výšce břehu, takže skok z nich nikdy nevede do kopce. Koryto pod hladinou je hluboké (z vody se nedá vylézt).
- Mezi přechody je pevná zem s cestičkou (jako v zahradě), dekorace: rákosí, kameny, kapradí, motýli a včelky.

### 4.2 Pomůcky pro skok
- **Stín pod křečkem**: tmavý kruh promítnutý svisle dolů na nejbližší povrch (kámen, voda, zem), viditelný i ve vzduchu. Velikost se mírně zmenšuje s výškou.
- **Další kámen jemně svítí** (stejný princip jako další obruč v zahradě); projitý přechod = kytička na břehu rozkvete.
- **Kamera**: na přechodu se natočí víc z boku na směr přechodu, aby byla vidět vzdálenost; mimo přechody běžná kamera za křečkem.
- Kameny a pařezy mají **plochý, dost široký vršek** (průměr ≥ 0,9 m), okraj kamene je odpouštějící (stávající STAND_MARGIN).
- Na kameni nad vodou nesmí křeček sklouznout chůzí do vody bez vlastního pohybu.

### 4.3 Pohyblivé plošiny (varianta A – ve fyzice)
- Fyzika dostane **pohyblivé překážky**: překážka se smí mezi kroky posunout (x, z) i změnit výšku vršku. Křeček, který na ní stojí, se posune o stejný posun (veze se); když vršek klesne, křeček klesne s ním (zůstává „na zemi“).
- **Leknín**: plochý zelený kruh (průměr ~1,1 m) s kytičkou. Klidně se pohupuje. Když na něm křeček stojí ~1,5 s, začne pomalu klesat; za další ~1,5 s je vršek pod hladinou → křeček spadne do vody (4.4). Po seskoku nebo pádu se leknín během ~2 s vynoří. Před klesáním se krátce zachvěje (varování).
- **Kláda**: válec ležící **podél proudu, napříč směrem skoku** (~1,8 × 0,6 m, rovný vršek pro fyziku) – dítě tedy skáče na široký cíl dlouhý 1,8 m. Pomalu se houpe podél své délky (po proudu tam a zpět, amplituda ~0,5 m, perioda ~3 s), takže místo dopadu na trase je vždy na kládě; jemně se pohupuje nahoru/dolů (~5 cm). Křeček se na ní veze. *(volba návrháře)*
- Testy: veze se bez proklouznutí, neproleze stranou klády, při klesání leknínu nezůstane „viset ve vzduchu“, z klesající plošiny jde vyskočit.

### 4.4 Pád do vody a návrat
- Pád = cáknutí (zvuk + kapky), kruhy na hladině, žabka se zasměje (hláška max. 1× za ~4 s, střídají se 2–3 varianty včetně povzbuzení).
- Po ~0,8 s krátké zatmění (fade) a křeček stojí na **posledním pevném místě** (kámen, pařez, břeh; ne leknín/kláda), otočený ve směru trasy. Nic se neztrácí (kytičky, dobroty zůstávají).
- Při opakovaném pádu na stejném místě (3×) žabka poradí: „Rozběhni se a skoč dřív!“ (nápověda).

### 4.5 Žabka
- Nová postava ve stylu ostatních: zelená, velké oči nahoře na hlavě, světlé bříško, růžové tvářičky, zadní nožky na skok.
- Pohyb: skáče po trase obloučky; na každém přechodu ho přeskáče napřed a čeká na druhém břehu u kytičky, otočená ke křečkovi. Nemá kolizi (nikdy nezablokuje kámen).
- Animace: čekání (dýchání, kvákací vak), skok, smích (třese se), radostné poskakování v cíli.
- Hlášky: úvod, smích při pádu (2–3), povzbuzení po přechodu (2–3), nápověda, cíl. Hlas `ELEVENLABS_VOICE_FROG` (nový), do té doby hlas zařízení.

### 4.6 Lišta a hvězdy
- Lišta: **6 obrysů kytiček** (přechody) + 3 bonusové dobroty. Kytička se zaplní, když křeček doskočí na břeh za přechodem (projde jeho koncem).
- Bonusy: 3 schované dobroty, aspoň jedna na kameni stranou trasy (vyžaduje skok navíc), žádná nad vodou tak, aby se nedala dosáhnout.
- Hvězdy jako v kolech 1–2 (dokončení = 1, bonusy navýší). Ukládání přes `LevelProgress` (kolo 3), odemknutí kola 3 dokončením kola 2.
- Kolo je dokončené snědením jahody (na pařezu za 6. přechodem); jahodu jde sníst jen po všech 6 přechodech (jinak je pod skleněným zvonem / zavřená v květu – volba stavitele).

### 4.7 Mapa
- Kolo 3 přestane být „už brzy“, stane se hratelným. Kola 4–5 zůstávají „už brzy“.
- Po kole 3 „Dál“ → „Další dobrodružství už brzy!“.

## 5. Technický návrh (navazuje na společný základ kol)

| Postup pro pohyblivé plošiny | Výhody | Nevýhody | Rozhodnutí |
|---|---|---|---|
| **A) Pohyblivé překážky ve fyzice** | poctivý skok, křeček se veze, znovupoužitelné pro kolo 5 | rozšíření fyziky + testy | **zvoleno uživatelem** |
| B) Jen vizuální efekt + časovač | méně práce | křeček „stojí ve vzduchu“, nespravedlivé skoky | zamítnuto |

- **Fyzika**: překážka může mít identifikátor a měnit polohu/výšku mezi kroky; krok fyziky zjistí, na které překážce tělo stojí, a přičte její posun. Svah/terén a otočené kvádry zůstávají.
- **Voda**: kolo zná výšku hladiny a tvar koryta; kontrola „pod hladinou nad korytem“ je čistá funkce (testovatelná).
- **Návrat**: kolo si pamatuje poslední pevné místo (jen statické překážky a zem mimo koryto).
- **Kostra kola** (`LevelBase`) se znovu použije: dobroty, motýli/včelky, oslava, hvězdy. Kolo 3 dodá svůj cíl (přechody), žabku, vodu a plošiny.
- **Stín pod křečkem**: v kostře kola, zapnutý pro všechna kola (pomůže i v kolech 1–2).
- **Kamera**: nový jemný režim „z boku na přechodu“ (natočení kamery podle směru přechodu), plynulý přechod.
- **Hlasy**: nové věty v `src/audio/lines.ts` (prefix `l3`), mluvčí žabka; `l3story` čte vypravěč. Nahrát skriptem `npm run voice`.
- **Zvuky**: cáknutí existuje; přidat kvákání (krátký generovaný zvuk) a „žbluňk“ při potopení leknínu.

## 6. Hotovo znamená

- Mapa: po dokončení zahrady je kolo 3 odemčené a hratelné; zahrada → „Dál“ → kolo 3 → hvězdy → „Dál“ → „už brzy“.
- Automatické testy: veze se na pohyblivé plošině; leknín klesá jen pod křečkem a po čase se vynoří; pád do vody se pozná a vrátí na poslední pevné místo (ne na leknín/kládu); všechny mezery jsou doskočitelné s rezervou i v nejhorší poloze pohyblivých plošin (výpočet z fyziky); přechody se počítají v pořadí; jahoda jen po všech přechodech; opakované „Znovu“ bez úniků.
- Kola 1–2: všechny stávající testy procházejí.
- Ruční ověření v prohlížeči a na iPadu: stín je vidět, skoky jsou odhadnutelné, pád je legrační, kamera na přechodu pomáhá.

## 7. Ponecháno staviteli

Přesný tvar potůčku a trasy, rozmístění kamenů v mezích 4.1, barvy a tvary žabky a dekorací, texty hlášek (krátké, veselé, česky), podoba stínu, kytiček a ochrany jahody, přesné časy leknínu a pohybu klády v mezích 4.3.
