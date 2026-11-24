# Kolo 4 – Pod stromem: návrh

Datum: 2026-11-24
Stav: schváleno
Navazuje na: `docs/superpowers/specs/2026-11-23-krecek-design.md` (vize, kapitola 3), `2026-11-24-kolo-2-zahrada-design.md` (společný základ kol, mapa), `2026-11-24-kolo-3-potucek-design.md`

## 1. Záměr

Čtvrté kolo příběhu. Pod velkým stromem bydlí krtek. Naučí křečka **hrabat**: na povrchu vyhrabává poklady z hromádek hlíny a dvakrát zaleze pod zem, kde si v **hrabacím bludišti** prohrabe cestu mezi kamínky ven na místa, kam se po povrchu nedá dojít.
Dítě se učí nový úkon (ťukání tlapkou) a jednoduché plánování cesty (obejít kamínek, najít cestu ke sluníčku).

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**
- Hratelné kolo 4 od příběhu po hvězdičky; na mapě se odemkne dokončením kola 3.
- Hrabání je jedním tlačítkem (to samé jako skok, u hlíny se změní na tlapku).
- Pod zemí je vždy vidět celé bludiště, křeček i východ – dítě se nikdy neztratí.
- Kola 1–3 fungují beze změny chování.

**Ne-cíle**
- Volný 3D pohyb pod zemí, padání pod zemí, nepřátelé, časový limit.
- Generovaná (náhodná) bludiště – obě jsou ručně navržená.
- Kolo 5.

**Anti-cíle**
- Dítě neví, kde je nebo kam má jít pod zemí.
- Křeček se zasekne (v rohu, v kamínku, na hraně hromádky) nebo se vyhrabe jinde než východem.
- Hrabání je únavné (příliš mnoho ťukání) nebo nejasné (nevím, co právě hrabu).
- Prázdná hromádka (každá skrývá poklad – rozhodnutí uživatele).

## 3. Jak to dítě zažije

1. Po kole 3 „Dál“ (nebo z mapy) → příběh (vypravěč): „Pod velkým stromem bydlí krtek. Schoval tam spoustu pokladů!“
2. Úvodní detail křečka, pak krtek vykoukne z krtince: „Ahoj! Pomůžeš mi vyhrabat poklady? Hrabej tlapkou!“
3. **Povrch** – louka pod velkým stromem, 8 hromádek hlíny. U hromádky se tlačítko změní na tlapku 🐾; ťukáním (3 ťuknutí) křeček hrabe, hlína odlétá, hromádka se zmenšuje a objeví se poklad (oříšek, žalud, semínko…), který křeček sní.
4. Dvě místa na louce jsou ohrazená **hustým plotem z kořenů** (vyšší než skok); dovnitř se dá jen podzemím. U každého je **díra** u kořenů – „Zalez dovnitř!“.
5. **Pod zemí** (kolečkový přechod): pevná kamera z boku na řez hlínou jako mravenčí farma; nahoře pruh trávy, strom, nebe a svítící **východ** (paprsek slunce). Křeček leze všemi čtyřmi směry po políčkách, tlapka (2 ťuknutí) vyhrabe políčko hlíny před ním. Kamínky nejdou prohrabat, kořeny pod trávou jsou pevný strop.
6. Bludiště 1: žížala v kapse („Ahoj, kopáči! Sluníčko je nahoře!“), jedna dobrota v hlíně. Bludiště 2: delší, víc kamínků, **spící brouček (chroustek)** – chrápe; když k němu křeček prohrabe, probudí se a vtipně zabručí. Jedna dobrota v hlíně.
7. Vyhrabání východu → kolečkový přechod zpět → křeček vykoukne z krtince **uvnitř ohrady** na povrchu; tam jsou zbývající hromádky.
8. Cíl: všech 8 hromádek vyhrabaných → krtek radostně vyleze, konfety, fanfára, „Děkuju, kamaráde! Teď máme plnou spíž.“ → hvězdičky.

## 4. Mechanika kola 4

### 4.1 Povrch a hromádky
- Plocha ~40×40 m (jako ostatní kola), rovná louka, uprostřed **velký strom** (kmen je překážka), krtinec krtka u stromu.
- **8 hromádek** hlíny (průměr ~1 m, výška ~0,35 m, nejsou překážka – dá se přes ně přejít). Rozložení: 4 volně na louce, 2 v ohradě 1, 2 v ohradě 2. Hromádky na louce jsou blízko stromu, aby byly snadno k nalezení.
- **Hrabání hromádky**: když křeček stojí do ~0,8 m od středu nevyhrabané hromádky, tlačítko akce ukazuje tlapku 🐾 místo skoku a akce = hrabání (ne skok). 3 ťuknutí (každé = drobky hlíny, zvuk, hromádka se zmenší o třetinu); po 3. se objeví poklad a křeček ho sní (žvýkání jako v kole 1). Mezi ťuknutími není časový limit.
- Lišta: **8 obrysů hromádek / pokladů** (cíl) + 3 bonusové dobroty (jahoda, mrkev, jablko – stejné tři druhy a sloty na liště jako v kolech 1–3, rozmístěné ručně).
- Bonusy: 1 volně na povrchu (schovaná za stromem nebo v trávě), 1 v bludišti 1, 1 v bludišti 2.

### 4.2 Ohrady a díry
- 2 **ohrady z kořenů** (kruh/ovál ~6 m, „živý plot“ z kořenů a kapradí vyšší než skok), v každé 2 hromádky a krtinec (výstup z podzemí).
- Ohrada se nedá přeskočit ani obejít; jediná cesta dovnitř je podzemím.
- Ven z ohrady: v ohradě je druhá díra/krtinec „zpět“, kterým se křeček vrátí na louku (krátký kolečkový přechod bez bludiště) – nebo je v ohradě branka, která se otevře po vyhrabání obou hromádek (volba stavitele; podmínka: z ohrady se nikdy nedá uvíznout).
- **Díra do podzemí** je u okraje ohrady na louce: tmavý otvor s vykopanou hlínou, nad ním se třese hlína a jemně svítí. Když křeček stojí u díry, tlačítko ukazuje tlapku/šipku dolů; ťuknutí = zalézt.
- Bludiště jde opakovat: po vylezení zůstane vyhrabané (při opětovném vstupu je stav zachovaný).
- *Volba návrháře:* obě díry jsou otevřené od začátku a ohrady jde dělat v libovolném pořadí (díra 1 → ohrada 1, díra 2 → ohrada 2). Krtek vykukuje u nejbližšího ještě nehotového místa.
- *Volba návrháře:* z bludiště jde kdykoli odejít zpět vstupem (vylézt nahoru vstupní šachtou → kolečko → křeček stojí u díry na louce); vyhrabaný stav zůstane. Pauza pod zemí funguje jako na povrchu: „Znovu“ spustí celé kolo od začátku, „Mapa“ odejde na mapu.

### 4.3 Kolečkový přechod
- Při vstupu: kamera se přiblíží ke křečkovi u díry, obraz se stáhne do kruhu kolem křečka (černý okraj, kruh se zmenšuje ~0,5 s), pak se kruh rozevře (~0,5 s) už v podzemní scéně s křečkem u vstupu.
- Při výstupu obráceně: kruh kolem křečka pod zemí u východu → rozevře se na povrchu, křeček vyskočí z krtince uvnitř ohrady.
- Během přechodu se nedá ovládat.

### 4.4 Podzemí – hrabací bludiště
- Samostatná 3D scéna (diorama): řez hlínou s hloubkou, stejné světlo a stejný model křečka; nahoře pruh trávy s kořeny, strom a nebe (aby bylo jasné, že je to pod loukou).
- **Mřížka** (políčko ~0,6 m): hlína (2 ťuknutí), kamínek (neprohrabatelný), kořeny pod trávou (pevný strop), volné políčko (vyhrabané nebo kapsa), východ (v řadě kořenů, jediné prohrabatelné místo).
- Bludiště 1: cca 14 × 7 políček; bludiště 2: cca 16 × 8 políček, víc kamínků. Obě ručně navržená, vždy řešitelná, žádná slepá ulička bez možnosti návratu (hrabat se dá i zpět).
- **Pohyb po políčkách**: joystick se převede na 4 směry (dominantní osa). Do volného políčka křeček plynule přejde (~0,2 s), do hlíny/kamínku se jen natočí. Bez padání (pod zemí se leze všemi směry).
- **Hrabání**: tlačítko = tlapka; hrabe políčko, kam křeček kouká. Políčko, které hrabe, je zvýrazněné (přerušovaný rámeček / světlo). Po 1. ťuknutí políčko popraská, po 2. se rozpadne.
- Kamínek / kořeny: při pokusu o hrabání krátké „ťuk“ a křeček zakroutí hlavou; žížala nebo brouček poradí „Kamínek nejde, zkus to jinudy“ (nejvýš 1× za ~6 s).
- **Vtipné velké překážky (přání uživatele)** – kromě kamínků je v každém bludišti jedna velká neprohrabatelná věc přes víc políček, kterou je třeba obejít:
  - bludiště 1: **zakopaná pirátská truhla** (2×2 políčka) – pootevřené víko, vykukují zlaťáky; když k ní křeček dojde, zkusí ji otevřít, nejde to a žížala poznamená „Ta je moc těžká, i pro krtka!“;
  - bludiště 2: **kostra dinosaura** (cca 5×2 políček, lebka + páteř + ocas) – po přiblížení lebka „zacvaká“ čelistí a brouček (pokud je vzhůru) se lekne; vtipné, ne strašidelné (velké kulaté kosti, usměvavá lebka);
  - případně drobnosti místo některých kamínků: stará gumová holínka, ztracená plechovka, kosti od krtkova oběda – vše neprohrabatelné jako kamínek.
  - Velké věci zabírají víc políček v mřížce a chovají se jako kamínek (nejdou prohrabat ani projít); bludiště zůstává řešitelné (test).
- Dobroty v hlíně: odkryjí se vyhrabáním svého políčka, křeček je sní.
- **Východ**: v řadě kořenů, nad ním svítí paprsek slunce a kytička – vždy vidět. Vyhrabání východu = výstup (4.3).
- Kamera: pevná, celé bludiště v záběru, mírně zepředu a shora (aby byla vidět hloubka), na iPadu na šířku vyplní obrazovku s okrajem pro joystick a tlačítko.
- Postavy: žížala (bludiště 1) a spící brouček – chroustek (bludiště 2) jako dekorativní kamarádi v kapsách; hláška při prvním přiblížení.

### 4.4b Živé podzemí i povrch (přání uživatele)
- **Pod zemí se pořád něco jemně hýbe**, i když dítě stojí:
  - žížala se vlní a občas vykoukne z hlíny a zase se schová;
  - brouček (chroustek) spí – oddychuje, bublinka „Zzz“, cuká tykadly; po probuzení se protáhne a zamává;
  - kořínky se lehce kývají, z hlíny občas sjede drobek, kamínky jsou statické;
  - paprsek slunce nad východem pulzuje, kytička se kývá ve větru, tráva nahoře se vlní.
- **Na povrchu** jemný život: listí stromu se pohupuje a občas spadne lísteček, nad hromádkami se třese hlína (zve k hrabání), krtek vykukuje a schovává se, motýli a včelky jako v ostatních kolech.
- Animace jsou levné (posun/natočení/měřítko jednotlivých dílů, žádné nové fyziky) a nesmí rušit: nic se nepohybuje přes cestu křečka ani přes políčko, které právě hrabe.

### 4.5 Krtek
- Nová postava ve stylu ostatních: tmavě šedý sametový kožíšek, růžový čumáček a velké lopatkovité tlapky, malá očka (případně brýle).
- Vykukuje z krtinců: úvod u stromu, pak „čeká“ u dalšího nevyhrabaného místa (vykoukne z krtince poblíž), mává; v cíli vyleze celý a radostně tancuje.
- Hlášky: úvod, povzbuzení po vyhrabání pokladu (max. 1× za 8 s), u díry („Zalez dovnitř, vyhrabeš se k pokladům!“), cíl. Hlas: **stejný jako ježek** (rozhodnutí uživatele) – `ELEVENLABS_VOICE_MOLE`, a když chybí, použije se `ELEVENLABS_VOICE_HEDGEHOG`. *Volba návrháře:* žížala `ELEVENLABS_VOICE_WORM`, jinak hlas motýla; brouček `ELEVENLABS_VOICE_BEETLE`, jinak hlas včelky; do doby nahrání čte hlas zařízení.

### 4.6 Hvězdy a mapa
- Hvězdy jako v kolech 1–3 (dokončení = 1, bonusy navýší). Ukládání přes `LevelProgress`, odemknutí kola 4 dokončením kola 3.
- Kolo 4 přestane být „už brzy“; po kole 4 „Dál“ → „Další dobrodružství už brzy!“ (kolo 5).

## 5. Postupy (rozhodnutí uživatele)

| Postup pro podzemí | Výhody | Nevýhody | Rozhodnutí |
|---|---|---|---|
| A) Řez pod loukou ve stejné scéně | plynulé, „opravdu pod touhle loukou“ | kolize s povrchem, kamera „v zemi“, riziko nesrozumitelného záběru | zamítnuto |
| **B) Samostatná diorama scéna + kolečkový přechod** | pevná přehledná kamera, nic nepřekáží, přechod známý z animáků | přechod místo plynulé jízdy kamery | **zvoleno** |

| Varianta hrabání pod zemí | Rozhodnutí |
|---|---|
| Rovná chodbička jen dopředu | zamítnuto (málo zábavné) |
| **Bludiště po políčkách všemi 4 směry, kamínky, pevný strop kromě východu** | **zvoleno** (2 ťuknutí na políčko, 2 bludiště) |

Ostatní technika navazuje na společný základ (`LevelBase`, mapa, lišta, hlasy přes `npm run voice`). Pod zemí se nepoužívá fyzika (pohyb po políčkách).

## 6. Hotovo znamená

- Mapa: po dokončení kola 3 je kolo 4 odemčené; kolo 3 → „Dál“ → kolo 4 → hvězdy → „Dál“ → „už brzy“.
- Automatické testy: hrabání hromádky (3 ťuknutí, poklad, cíl), tlačítko akce se mění u hromádky/díry, skok jinde funguje; bludiště: obě jsou řešitelná (hledání cesty v testu), kamínek a kořeny nejdou prohrabat, východ jen na určeném místě, pohyb po políčkách bez zaseknutí, opakovaný vstup zachová stav; ohrada se nedá přeskočit a nedá se v ní uvíznout; přechody (kolečko) nepustí ovládání; „Znovu“ bez úniků.
- Kola 1–3: všechny stávající testy procházejí.
- Ruční ověření v prohlížeči a na iPadu: tlačítko tlapky je srozumitelné, pod zemí je vždy vidět cíl, kolečkový přechod je jasný.

## 7. Ponecháno staviteli

Přesné rozložení louky, ohrad a hromádek, tvary bludišť v mezích 4.4, druhy pokladů, vzhled krtka/žížaly/broučka, texty hlášek (krátké, veselé, česky), délky animací, ikona tlapky, zda se z ohrady odchází druhým krtincem nebo brankou (4.2).
