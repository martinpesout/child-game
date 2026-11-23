# Nahrávky hlasu

Nejrychleji je vytvoří Mac jeho prémiovým českým hlasem:

1. Nastavení systému → Zpřístupnění → Předčítaný obsah → Systémový hlas → Spravovat hlasy… → Čeština → stáhnout **Zuzana (Prémiový)**.
2. V projektu spustit `npm run voice` (volby: `--voice "Jméno hlasu"`, `--rate 165`, `--only intro,thanks`).

Vlastní nahrávky (např. namluvené rodiči) stačí uložit sem pod stejnými názvy.

Sem patří nahrané věty (soubor `<id>.m4a`). Když soubor existuje, hra ho přehraje místo hlasu iPadu.
Formát: `.m4a` (AAC), mono, krátké ticho na začátku i konci odstřihnout.

| soubor | věta |
|---|---|
| story.m4a | Blíží se zima a křeček potřebuje naplnit spíž. Vydá se na cestu! |
| intro.m4a | Ahoj! Pomůžeš mi najít 10 oříšků? |
| thanks.m4a | Hurá, děkuju! |
| remaining1.m4a | Ještě jeden oříšek! |
| remaining2.m4a | Ještě 2 oříšky! |
| remaining3.m4a | Ještě 3 oříšky! |
| remaining4.m4a | Ještě 4 oříšky! |
| remaining5.m4a … remaining9.m4a | Ještě 5 (…9) oříšků! |
