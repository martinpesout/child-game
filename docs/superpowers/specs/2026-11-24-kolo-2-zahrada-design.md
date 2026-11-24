# Kolo 2 – Zahrada: návrh

Datum: 2026-11-24
Stav: návrh ke schválení
Navazuje na: `docs/superpowers/specs/2026-11-23-krecek-design.md` (celková vize, kapitola 3)

## 1. Záměr

Druhé kolo příběhu. Křeček se z louky dostane do zahrady, kde ho veverka vyzve k závodu.
Dítě se učí **přesně zatáčet**: proběhnout po pořadě obručemi a rourami/ruličkami (tunely, které má křeček rád).
Veverka závodí vedle, fandí a v cíli nechá křečka vyhrát. Odměnou je křeččí kolo, ve kterém křeček radostně běží.

Zároveň připravit hru na další kola: společný základ kol, seznam kol, obecná horní lišta, hvězdy pro každé kolo.

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**
- Hratelné kolo 2 od příběhové obrazovky po hvězdičky, navazující na kolo 1 tlačítkem „Dál“.
- Trasa je vždy zřejmá (cestička, svítící další obruč, šipka nad křečkem).
- Zahrada je mírně zvlněná a má kaluže, do kterých nejde vstoupit.
- Kolo 1 funguje beze změny chování (všechny jeho testy dál procházejí).

**Ne-cíle**
- Ovládání křeččího kola (kolo je jen animace v cíli).
- Časový limit, žebříčky, prohra.
- Kola 3–5 (jen příprava základu).

**Anti-cíle**
- Dítě neví, kudy dál, nebo zabloudí bez nápovědy.
- Veverka vyhraje nebo křečka „zahanbí“.
- Křeček se zasekne v rouře, na svahu nebo u kaluže.
- Kamera v rouře nebo za kopečkem ztratí křečka z dohledu.

## 3. Jak to dítě zažije

1. Po kole 1 „Dál“ → příběhová obrazovka: „Za loukou je zahrada. Bydlí tam rychlá veverka!“ (předčítaná/nahraná).
2. Úvodní detail křečka (jako kolo 1), pak veverka: „Ahoj! Dáme závod? Proběhni všemi obručemi!“
3. Závod: křeček běží po pískové cestičce, obrucemi a rourami v pořadí. Veverka běží kousek před ním po trase a fandí („Jen tak dál!“, „Šup do roury!“).
4. U trati jsou 3 schované dobroty (bonusy → hvězdy jako v kole 1) a motýli/včelky s hláškami.
5. Cíl: poslední obruč → veverka zpomalí a doběhne druhá („Jsi rychlejší než já!“). Křeček vběhne do křeččího kola v cíli a běží v něm, konfety, fanfára, detail. Pak hvězdičky.
6. „Dál“ → „Další dobrodružství už brzy!“ (kola 3–5).

## 4. Mechanika kola 2

### 4.1 Dráha
- Dráha je **jedna otevřená křivka** (start → cíl), definovaná ~10–14 body v datech kola (CatmullRom). Z křivky se odvozuje: cestička na zemi, pozice obručí a rour (v pořadí podél křivky), trasa veverky, pozice cíle.
- **8 bran** celkem: obruče a 2–3 roury/ruličky mezi nimi (roura = brána, kterou se prochází delším tunelem).
- Brána se počítá, když křeček projde její rovinou zevnitř obrysu (ne obejde ji). Brány platí **jen v pořadí**; průchod pozdější branou nic nedělá.
- Zobrazení stavu: další brána svítí a pulzuje (zlatá) a nad ní jiskřičky; projeté zezelenají; čekající jsou šedobílé.
- **Šipka nad křečkem** ukazuje k další bráně, jen když je křeček dál než ~4 m od cestičky nebo brána není v záběru kamery.
- Cestičku lemují záhony a plůtky vyšší než skok (aby nesváděly k přeskakování), ale s mezerami; zkratky jsou nepohodlné, nikde se nejde zaseknout.

### 4.2 Roury / ruličky
- Válcový tunel (vnitřní průměr cca 2,5× výška křečka), délka 2–3 m, kartonová/terakotová barva.
- Fyzika: stěny roury jsou překážky, uvnitř je průchod; křeček nesmí na rouru vyskočit a uvíznout nahoře (roura je pro skok vysoká, nebo má vršek, ze kterého se sklouzne).
- Kamera v rouře: kamera za křečkem se nesmí zaseknout ve stěně – uvnitř roury se roura zprůhlední (stávající zprůhledňování překážek) a kamera může klesnout níž.

### 4.3 Veverka
- Nový NPC ve stylu křečka/ježka: oranžovohnědá, velký huňatý ocas (nahoru stočený), světlé bříško, ouška se štětičkami.
- Běží po křivce dráhy. Drží si odstup ~2–4 m před křečkem (měřeno podél křivky). Když je křeček daleko, zastaví se, otočí, mává a čeká. Nikdy nedoběhne do cíle před křečkem: před poslední branou zpomalí.
- Animace: poskakující běh, ocas se vlní, mávání, radostný skok v cíli.
- Hlášky (bublina + hlas): start, povzbuzení (náhodně, max. 1× za 8 s), „Šup do roury!“ před rourou, cíl.

### 4.4 Zahrada a terén
- Plocha cca 40×40 m jako louka, ohraničená plotem a živým plotem.
- **Mírně zvlněný terén**: výškové pole (součet několika pomalých sinusovek / hladký šum), amplituda do ~0,5 m, maximální sklon tak, aby křeček nesklouzával a šlo běžet do kopce. Kolem cestičky a bran je terén vyhlazený (brány stojí na rovině).
- **Kaluže** (2–3): modrá lesklá voda s okrajem kamínků. Nejdou vstoupit (neviditelná překážka kolem). Při nárazu cáknutí + krátké „brr“ (zvuk). Kaluže leží mimo dráhu.
- Dekorace zahrady: záhony s květinami, konev, květináče, mrkvový záhon, plůtky, strom; motýli a včelky jako na louce.

### 4.5 Horní lišta a hvězdy
- Lišta ukazuje **8 obrysů bran**, které se zaplňují (stejný princip jako oříšky v kole 1) + 3 bonusové dobroty.
- Hvězdy: dokončení = 1, bonusy jako v kole 1 (všechny 3 = 3 hvězdy). Ukládání `stars.level2`.

### 4.6 Cíl s křeččím kolem
- Za poslední branou stojí velké dřevěné křeččí kolo. Po dokončení kola křeček „vjede“ do kola (krátký přesun), kolo se točí a křeček v něm běží na místě (animace běhu), fanfára, konfety, detailní záběr. Pak obrazovka s hvězdami.

### 4.7 Mapa kol (rozhodnutí uživatele)
- Po „Hrát“ se ukáže **mapa kol**: klikatá cestička s 5 zastávkami (louka, zahrada, kamenitá cesta, pod stromem, domů). U každého kola jsou získané hvězdičky (nejlepší výsledek).
- **Odemykání**: kolo 1 je vždy otevřené; další kolo se odemkne dokončením předchozího. Zamčená kola mají zámeček; kola 3–5 jsou zatím zamčená i s cedulkou „už brzy“ (nelze je spustit, ani když se odemknou).
- Ťuknutí na kolo → příběhová obrazovka daného kola → hra. Hrát jde i starší, už dokončené kolo.
- Na mapě je křeček u posledního odemčeného kola (jemně poskakuje), aby dítě vědělo, kam dál.
- Ukládá se (localStorage, přes bezpečný obal): nejlepší hvězdy pro každé kolo a nejvyšší odemčené kolo. Stávající `stars.level1` se při prvním spuštění převezme (dokončené kolo 1 ⇒ zahrada odemčená).
- Na konci kola: „Znovu“ = stejné kolo, „Dál“ = další kolo (pokud existuje a je hotové), jinak „Další dobrodružství už brzy!“; vedle tlačítko „Mapa“.
- Pauza: navíc tlačítko „Mapa“.

## 5. Společný základ kol (technický návrh – zvolená varianta A)

| Postup | Výhody | Nevýhody | Rozhodnutí |
|---|---|---|---|
| **A) Společný základ + kola jako díly** | žádná duplicita, seznam kol, obecná lišta | nejdřív přestavba kola 1 (kryto testy) | **zvoleno** |
| B) Kopie kola 1 | nejrychlejší start | dvojí kód, opravy na N místech | zamítnuto |
| C) Kola čistě jako data | elegantní pro velké hry | zbytečně složité, kola mají vlastní logiku | zamítnuto |

- **Terén**: fyzika dostane výškovou funkci `groundHeight(x, z)` (kolo 1 = 0). Překážky stojí na terénu (jejich výška je od země v místě překážky). Tráva, dobroty, postavy a efekty se pokládají na terén.
- **Sdílený svět**: stavba nebe, plotu, kopců v dálce, světel, trávy a kytiček podle dat kola (oddělit od specifik louky).
- **Sdílená „kostra kola“**: křeček + fyzika + dobroty/bonusy + motýli/včelky + zprůhledňování + oslava/konfety; konkrétní kolo dodává svůj cíl (oříšky / brány), NPC a dekorace.
- **Seznam kol** v `main.ts`: `Dál` spouští další kolo; příběhová obrazovka a hlášky podle kola; po posledním hotovém kole „Další dobrodružství už brzy!“.
- **Lišta**: obecná – ikona cíle + počet obrysů + bonusové sloty.
- **Hlasy**: nové věty se přidají do seznamu vět (`src/audio/lines.ts`), nahrají se skriptem `npm run voice` (Mac/ElevenLabs); do té doby čte hlas zařízení. Hlas veverky je nová postava (`ELEVENLABS_VOICE_SQUIRREL`).
- Ovládání a kamera beze změny (výchozí kamera za křečkem s řízením jako autíčko; pevná kamera v pauze).

## 6. Hotovo znamená

- Kolo 1 → „Dál“ → kolo 2 → hvězdičky → „Dál“ → „už brzy“; „Znovu“ opakuje aktuální kolo.
- Mapa kol: po zavření a otevření hry je zahrada odemčená a jde rovnou spustit; testy pro odemykání, nejlepší hvězdy a převzetí starého `stars.level1`.
- Automatické testy: počítání bran v pořadí (i průchod mimo pořadí, obejití brány), veverka nikdy nepředběhne do cíle a čeká na křečka, terén (stání na svahu, kopec jde vyběhnout, nic nepropadne), kaluž nejde vstoupit, roura jde proběhnout bez zaseknutí, opakované „Znovu“ bez úniků.
- Kolo 1: všechny stávající testy dál procházejí.
- Ruční ověření v prohlížeči a na iPadu/telefonu: trasa je zřejmá, kamera v rouře nezmizí, plynulost.

## 7. Ponecháno staviteli

Přesná trasa a rozmístění, barvy, tvary dekorací, rychlost veverky, přesné texty povzbuzení (krátké, veselé, česky), tvar terénu v mezích 4.4, podoba šipky a jiskřiček.
