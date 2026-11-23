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
} as const;
export type LineId = keyof typeof LINES;
