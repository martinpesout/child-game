# Křečkova cesta za zásobami – návrh hry

Datum: 2026-11-23
Stav: návrh ke schválení

## 1. Záměr

Jednoduchá, roztomilá 3D hra v prohlížeči (Three.js) pro děti 5–8 let, primárně na tabletu.
Dítě ovládá křečka, který běhá po přírodě, sbírá dobroty a v sérii kol se učí nové dovednosti.
Hra má dát pocit malého dobrodružství, které se postupně stupňuje, ale nikdy nestresuje.

Proč takhle: děti si mají hru užít samy, bez čtení návodu a bez frustrace z prohry.
Dospělý (autor) ji chce později pustit i na PC/televizi s ovládáním z telefonů.

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**
- Hratelné na tabletu dotykem. Cílové zařízení: **iPad Air** (Safari, aktuální iPadOS) – podle něj se ladí výkon (cíl 60 fps) i předčítání. Ostatní tablety a PC prohlížeče by měly fungovat, ale neladí se na ně.
- **Hra je pro jednoho hráče** – a tak zůstane i s telefony na televizi (telefon = jen ovladač jednoho křečka). Více hráčů najednou se neplánuje.
- Roztomilý křeček a zvířátka s výraznými animacemi a jednoduchými zvuky.
- Kola s různými cíli, každé učí jednu novou dovednost; propojuje je příběh.
- Hraje se i na PC klávesnicí (šipky/WASD, mezerník) – hlavně pro vývoj a testování.

**Ne-cíle (zatím)**
- Ovládání telefony přes QR kód (pozdější etapa – architektura ji ale musí umožnit).
- Ukládání postupu na server, účty, žebříčky.
- Model ze Sketchfabu (licence + chybí kostra pro animace); lze zvážit později.

**Anti-cíle (to by byl neúspěch, i kdyby hra fungovala)**
- Dítě může prohrát, „umřít“ nebo být pod časovým tlakem.
- Cokoliv strašidelného nebo hlasitého/agresivního ve zvucích.
- Dítě neví, co má dělat, a potřebuje dospělého, aby mu přečetl text.
- Křeček se zasekává o neviditelné hrany nebo propadá světem.

## 3. Celá hra (vize – pro kontext)

Příběh: Blíží se zima, křeček musí naplnit spíž. Vydá se z domku do světa.
V každém kole potká zvířátko, které zadá úkol a naučí novou dovednost.

| # | Místo | Zvířátko | Cíl | Nová dovednost |
|---|-------|----------|-----|----------------|
| 1 | Louka u domku | ježek | sesbírat oříšky | běh (joystick) |
| 2 | Zahrada | veverka | proběhnout obručemi (závod, veverka nechá vyhrát) | přesné zatáčení |
| 3 | Kamenitá cesta | žabka | vyskákat po kamenech/pařezech pro jahodu | skok |
| 4 | Pod stromem | krtek | vyhrabat schované poklady z hromádek hlíny | hrabání |
| 5 | Velký návrat | všichni | proběhnout, vyskákat, prohrabat se pod plotem, proplížit se kolem spícího kocoura, zalézt do domku | vše + plížení |

- Každé kolo: 1–3 hvězdičky (za bonusové/schované dobroty), kolo jde vždy dokončit.
- Mezi koly krátká obrazovka s obrázkem a jednou větou příběhu (text + předčtení).
- Kocour (kolo 5): když se vzbudí, jen zamňouká, křeček se lekne a vrátí se kousek zpět. Legrační, ne strašidelný.
- Pád z kamene: křeček se objeví na začátku úseku, nic se neztrácí.

## 4. Rozsah této etapy: základ + kolo 1

### 4.1 Co dítě zažije
1. Úvodní obrazovka: název hry, křeček na louce, velké tlačítko „Hrát“ (zároveň odemkne zvuk – prohlížeče vyžadují dotyk).
2. Krátká příběhová obrazovka (obrázek ze scény + věta „Blíží se zima…“), pokračuje se ťuknutím.
3. Kolo 1 – Louka u domku:
   - Křeček stojí u svého domku (domek je dekorace, do něj se v tomto kole nezalézá).
   - Přicupitá/je u cesty ježek; nad ním bublina: „Ahoj! Pomůžeš mi najít 10 oříšků?“ + krátký zvuk. Bublinu jde přečíst nahlas (viz 4.6).
   - Na louce je rozmístěno 10 oříšků (hlavní cíl) a 3 bonusové dobroty (jahoda, mrkev, kousek jablka) – trochu schované za keři/kameny.
   - Ukazatel nahoře: ikona oříšku a „3 / 10“, pod tím 3 obrysy hvězdiček.
   - Po sebrání všech 10 oříšků: ježek řekne „Hurá, děkuju!“, oslava (poskok, konfety, zvuk), obrazovka konce kola s hvězdičkami (1 hvězda za dokončení, +1 za každé 2 bonusy → max 3; přesný přepočet je volba stavitele, musí platit: dokončení = vždy ≥ 1, všechny bonusy = 3).
   - Tlačítka „Znovu“ a „Dál“ (Dál zatím vede na obrazovku „Další dobrodružství už brzy!“).
4. Nápověda, když se dítě ztratí: pokud 20 s nesebere nic, nad nejbližším oříškem se objeví jemně pulzující šipka/třpyt.

### 4.2 Ovládání
- **Tablet:** virtuální joystick vlevo dole (objeví se pod palcem tam, kde se dítě dotkne levé poloviny obrazovky – plovoucí joystick). Pravá polovina: velké tlačítko skoku.
- *Skok v kole 1 (volba návrháře):* skok je skutečný (fyzika), ale nízký. Kameny jsou nízké a dá se na ně vyskočit (jedna bonusová dobrota leží na kameni jako ochutnávka kola 3); keře, domek a strom jsou vyšší než skok, takže na ně křeček nevyleze. Okraj louky je vyšší než skok. Na kameni se nesmí dát zaseknout.
- **Klávesnice:** šipky/WASD pohyb, mezerník akce.
- Pohyb je relativní ke kameře (nahoru = od kamery). Rychlost se škáluje s vychýlením joysticku.
- Kamera: sleduje křečka zezadu shora, plynule (lerp), bez ručního otáčení. Neprochází keři – stačí rozumná výška/vzdálenost, aby se do překážek nedostala.
- **Vrstva vstupu:** hra čte abstraktní stav `{ move: {x, y}, action: boolean }` od „ovladače“. Dotykový a klávesnicový ovladač jsou dvě implementace. Budoucí telefon přes QR kód bude třetí (posílá stejný stav přes síť). Herní logika nesmí na DOM událostech záviset přímo.

### 4.3 Křeček
- Procedurálně poskládaný z Three.js primitiv (koule/kapsle/zploštělé koule): kulaté tělo, velká hlava, výrazné tváře, malé růžové ouška, lesklá černá korálková očka s odleskem, růžový čumáček, drobné tlapky, krátký ocásek. Barvy: zlatohnědá + krémové bříško a tváře.
- Styl: měkké, matné materiály (MeshToonMaterial nebo MeshStandardMaterial s vysokou drsností), jemný obrys není nutný.
- Animace (procedurální, bez kostry): klidové dýchání a mrkání, cupitání při běhu (houpání těla, kmitání tlapek), natočení do směru pohybu, nafouknutí tváří při sebrání dobroty (krátce), radostný poskok při oslavě, mírné naklonění hlavy k blízkému zvířátku.
- Kolize: koule/kapsle vůči jednoduchým kolizním tvarům (válce/kvádry keřů, kamenů, domku) + hranice louky (neviditelná stěna, vizuálně plot/keře na okraji).
- Fyzika vlastní a jednoduchá: gravitace, zem jako výšková mapa nebo rovina s mírnými kopečky, stání na kvádrech/válcích (příprava na kolo 3). Žádná fyzikální knihovna.

### 4.4 Svět kola 1
- Ohraničená louka cca 40×40 m (orientačně; křeček ~0,3 m – měřítko zvolí stavitel tak, aby přeběhnutí louky trvalo ~15–20 s).
- Tráva: zelený podklad + instancované stébla/trsy (InstancedMesh) kolem cest, kytičky, několik keřů, kamenů, strom v pozadí, domek křečka (dřevěný/ořechová skořápka – volba stavitele), oblohový gradient, měkké slunce se stíny.
- Výkon na tabletu: omezený počet stínících objektů, instancování, pixel ratio max 2, jeden směrový + hemisférické světlo.

### 4.5 Ježek
- Stejný styl jako křeček, z primitiv: hnědé tělo s ostny (kužely, instancované), světlá tvář, čumáček.
- Animace: kývání hlavou, poskakování, zamávání, natočení ke křečkovi když je blízko.
- Stojí na místě (u domku), mluví bublinou na začátku a na konci kola; když k němu křeček přiběhne během kola, zopakuje úkol („Ještě 4 oříšky!“).

### 4.6 Texty a předčítání
- Krátké věty, velké písmo, čeština.
- Předčítání: Web Speech API (`speechSynthesis`, hlas `cs-CZ`), spouští se automaticky u bublin; tlačítko reproduktoru v bublině pro zopakování. Na iPadu je český hlas (např. „Zuzana“) k dispozici – vybírá se první hlas s `lang` začínajícím `cs`. Pokud český hlas není (jiná zařízení), jen se zobrazí text (bez chyby). Nahrané hlasy jsou mimo tuto etapu.

### 4.7 Zvuky
- Generované v kódu (Web Audio API), žádné soubory: cupitání (tiché ťukání v rytmu kroků), „cink/pop“ při sebrání oříšku (výška tónu stoupá s počtem), jiný veselejší zvuk u bonusu, „pískání“ ježka při mluvení (krátké melodické brblání), fanfára na konci kola, jemné tlačítkové kliknutí.
- Volitelná tichá podkladová smyčka (ptáčci/jednoduchá melodie) – volba stavitele, s tlačítkem ztlumení v rohu.
- Hlasitost příjemná, nic ostrého.

### 4.8 Obrazovky a UI
- HTML/CSS překryv nad canvasem (ne 3D UI): úvod, příběh, HUD, bublina, konec kola, „už brzy“.
- Velké dotykové cíle (min. 64 px), kulaté tvary, teplé barvy, čitelné písmo (např. Google Font s českou diakritikou – „Baloo 2“ nebo podobné).
- Tlačítko pauzy/ztlumení v rohu. Když je tablet na výšku, výzva „otoč tablet“.
- *Spouštění (volba návrháře):* hra je statický web (GitHub Pages/Netlify) a zároveň instalovatelná webová aplikace (manifest + service worker pro offline). Na iPadu se přes „Přidat na plochu“ spustí na celou obrazovku bez lišt Safari; na Androidu navíc Fullscreen API. Písmo je součástí hry (ne z Google Fonts za běhu), aby fungovala offline.

## 5. Postupy, které jsme zvážili

| Postup | Výhody | Nevýhody | Rozhodnutí |
|--------|--------|----------|------------|
| **A) Vite + Three.js, ES moduly** | přehledná struktura po souborech, dev server dostupný z tabletu přes Wi-Fi, snadné nasazení jako statický web, později lze přidat server pro telefony | potřeba Node.js a instalace | **zvoleno** |
| B) Jedno HTML + Three.js z CDN | žádná instalace, rychlý start | u 5 kol a 6 zvířátek nepřehledné, horší testování na tabletu, pro telefony by se stejně přecházelo na A | zamítnuto |
| C) React Three Fiber | pohodlné pro hodně UI | zbytečná vrstva navíc pro hru, kde je skoro vše 3D | zamítnuto |

Další rozhodnutí, která jsou moje volba (lze změnit):
- Postavy z primitiv místo staženého modelu (licence, animovatelnost).
- Vlastní jednoduchá fyzika místo knihovny (předvídatelnost, žádné zasekávání).
- Zvuky generované Web Audio, předčítání přes Web Speech API.
- Jazyk: TypeScript (hra poroste, typy pomohou) – stavitel může zvolit čistý JS, pokud k tomu má dobrý důvod.

## 6. Architektura (doporučená, detaily na staviteli)

```
src/
  main.ts            – start, smyčka hry, přepínání obrazovek
  input/             – Controller rozhraní; touch.ts, keyboard.ts (později phone.ts)
  audio/             – sfx.ts (Web Audio), speech.ts (Web Speech)
  characters/        – hamster.ts, hedgehog.ts (stavba z primitiv + animace)
  world/             – terrain, grass, props (keře, kameny, domek), physics.ts (kolize)
  levels/            – level.ts (společné rozhraní kola), level1-meadow.ts
  ui/                – overlay obrazovky (HTML/CSS)
```

- Kolo je datově + kódem popsaný objekt s rozhraním typu `setup(scene)`, `update(dt)`, `isComplete()`, `stars()`, `dispose()` – aby šlo přidávat kola 2–5 bez zásahu do jádra.
- Herní smyčka s pevným krokem fyziky (např. 60 Hz) a interpolovaným vykreslováním, nebo proměnný krok s omezením dt – volba stavitele, nesmí docházet k proletění kolizí při poklesu fps.
- Ukládání: jen localStorage (získané hvězdičky, ztlumení) – chráněno try/catch.

## 7. Testování a hotovo znamená

- Spuštění `npm run dev` s přístupem z tabletu v síti (`--host`).
- Automatické testy pro čistou logiku (kolize, počítání dobrot/hvězd, mapování vstupu) – Vitest.
- Ruční ověření: projít kolo 1 na tabletu (dotyk) i na PC (klávesnice), od úvodu po konečnou obrazovku; zvuk funguje po prvním ťuknutí; žádné zaseknutí o keře/okraj; plynulé na běžném tabletu.
- Hotovo: dítě 5–8 let zvládne kolo 1 bez pomoci dospělého a chce ho hrát znovu.

## 8. Co je ponecháno staviteli

Přesné rozměry, barvy, rozmístění objektů, parametry pohybu a kamery, konkrétní zvukové syntézy, přesný výpočet hvězd (v mezích 4.1), volba písma, struktura souborů nad rámec kapitoly 6.
