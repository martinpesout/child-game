/** "Ještě N oříšků!" with Czech plural forms (1 / 2–4 / 5+). */
export function remainingText(n: number): string {
  if (n === 1) return 'Ještě jeden oříšek!';
  if (n >= 2 && n <= 4) return `Ještě ${n} oříšky!`;
  return `Ještě ${n} oříšků!`;
}

/**
 * Every spoken line in the game, by id. A recording at src/assets/voice/<id>.m4a replaces the device voice
 * (generate them with `npm run voice`). Kept free of game imports so scripts can read it.
 */
export const LINES = {
  story: 'Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu!',
  intro: 'Ahoj! Pomůžeš mi najít 10 oříšků?',
  thanks: 'Hurá, děkuju!',
  remaining1: remainingText(1),
  remaining2: remainingText(2),
  remaining3: remainingText(3),
  remaining4: remainingText(4),
  remaining5: remainingText(5),
  remaining6: remainingText(6),
  remaining7: remainingText(7),
  remaining8: remainingText(8),
  remaining9: remainingText(9),
  bee1: 'Bzzz! Tahle kytička je moje!',
  bee2: 'Neboj, neštípu. Jen bzučím!',
  bee3: 'Bzz bzz! Taky sbírám zásoby na zimu!',
  butterfly1: 'Jé, ahoj! Máš krásné tvářičky!',
  butterfly2: 'Chyť mě, jestli to dokážeš!',
  butterfly3: 'Lítám a lítám, až se mi točí hlava!',
  l2story: 'Za loukou je zahrada. Bydlí tam rychlá veverka!',
  l2intro: 'Ahoj! Dáme závod? Proběhni všemi obručemi!',
  l2cheer1: 'Jen tak dál!',
  l2cheer2: 'Ty jsi ale rychlík!',
  l2cheer3: 'Super, další obruč!',
  l2tube: 'Šup do roury!',
  l2wait: 'Haló! Tudy, pojď za mnou!',
  l2finish: 'Hurá, jsi v cíli! Jsi rychlejší než já!',
  l3story: 'Cestu přehradil potůček. Na druhém břehu roste jahoda!',
  l3intro: 'Kvák! Skákej po kamenech za mnou!',
  l3laugh1: 'Kvák-kvák, to studí!',
  l3laugh2: 'Žbluňk! Nevadí, zkus to znovu!',
  l3laugh3: 'Hihi, kvák! Ještě jednou!',
  l3cheer1: 'Hop! Výborný skok!',
  l3cheer2: 'Kvák! Jsi skokan!',
  l3hint: 'Rozběhni se a skoč dřív!',
  l3lily: 'Pozor, lekníny se potápí! Skákej rychle!',
  l3finish: 'Kvák! Jsi skokan jako já! Tady je tvoje jahoda.',
  l4story: 'Pod velkým stromem bydlí krtek. Schoval tam spoustu pokladů!',
  l4intro: 'Ahoj! Pomůžeš mi vyhrabat poklady? Hrabej tlapkou!',
  l4cheer1: 'Hurá, poklad!',
  l4cheer2: 'Ty jsi ale šikovný hrabáček!',
  l4hole: 'Zalez dovnitř, vyhrabeš se k pokladům!',
  l4worm: 'Ahoj, kopáči! Sluníčko je nahoře!',
  l4stone: 'Kamínek nejde, zkus to jinudy.',
  l4clock: 'Crrr! Kdo tady zakopal budík? Teď jsem úplně vzhůru!',
  l4beetle: 'Chrrr… Cože? Kdo mě budí? No nic, dobrou!',
  l4dino: 'Cvak cvak! Neboj, to je jen stará kostra.',
  l4finish: 'Děkuju, kamaráde! Teď máme plnou spíž.',
  l5story: 'Spíž je plná. Křeček se vrací domů a kamarádi ho vyprovázejí!',
  l5intro: 'Naposledy závod? Proběhni obručemi!',
  l5frog: 'Hop přes potůček!',
  l5mole: 'Pod plotem se prohrabeš!',
  l5duck: 'Pííp! Kdo tady zakopal gumovou kachnu?',
  l5yard: 'Pst! Kocour spí. Když otevře oko, stůj jako socha!',
  l5meow: 'Mňau! Koho to tu slyším?',
  l5sleep: 'Mrrr… jen jsem si zdřímnul.',
  l5home1: 'Vítej doma, kamaráde!',
  l5home2: 'Hurá, zvládl jsi to!',
  l5home3: 'Kvák! Jsi ten nejlepší skokan!',
  l5home4: 'Ať se ti v zimě dobře spinká!',
  l5end: 'Křeček je doma! Zvládl jsi celé dobrodružství!',
} as const;
export type LineId = keyof typeof LINES;
