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

## ElevenLabs (nejpřirozenější, každá postava vlastním hlasem)

1. Založte si účet na elevenlabs.io a v Profile → API Keys vytvořte klíč.
2. V knihovně hlasů (Voices) si vyberte hlasy, které umí česky (model Multilingual v2), a zkopírujte jejich **Voice ID**.
3. Zkopírujte `.env.example` jako `.env.local` a doplňte klíč a hlasy:
   - `ELEVENLABS_VOICE_NARRATOR` – vypravěč příběhu
   - `ELEVENLABS_VOICE_HEDGEHOG` – ježek
   - `ELEVENLABS_VOICE_BEE` – včelky
   - `ELEVENLABS_VOICE_BUTTERFLY` – motýli
   - nebo jen `ELEVENLABS_VOICE` pro všechny
4. Spusťte `npm run voice -- --provider elevenlabs` (jen některé věty: `--only bee1,bee2,bee3`).

Texty vět se odešlou službě ElevenLabs; `.env.local` s klíčem do gitu nepůjde.
