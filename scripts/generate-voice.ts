/**
 * Namluví všechny věty hry hlasem Macu a uloží je jako .m4a do src/assets/voice/.
 * Hra pak tyto nahrávky přehraje na každém zařízení místo hlasu zařízení.
 *
 *   npm run voice                         # nejlepší nainstalovaný český hlas
 *   npm run voice -- --voice "Zuzana (Prémiový)" --rate 165
 *   npm run voice -- --only intro,thanks  # jen vybrané věty
 *   npm run voice -- --force              # povolí i základní (strojový) hlas
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { LINES, type LineId } from '../src/audio/lines';
import { parseVoices, pickCzechVoice, voiceQuality } from './voiceTools';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

if (process.platform !== 'darwin') {
  console.error('Skript potřebuje macOS (příkazy say a afconvert).');
  process.exit(1);
}

const installed = parseVoices(execFileSync('say', ['-v', '?'], { encoding: 'utf8' }));
const chosen = arg('voice') ?? pickCzechVoice(installed)?.name;
if (!chosen) {
  console.error('Na Macu není žádný český hlas. Stáhněte ho v Nastavení systému → Zpřístupnění → Předčítaný obsah → Systémový hlas → Spravovat hlasy… → Čeština.');
  process.exit(1);
}
if (voiceQuality(chosen) === 0 && !flag('force')) {
  console.error(
    `Nainstalovaný je jen základní hlas „${chosen}“, který zní strojově.\n` +
      'Stáhněte prémiový: Nastavení systému → Zpřístupnění → Předčítaný obsah → Systémový hlas → Spravovat hlasy… → Čeština → Zuzana (Prémiový).\n' +
      'Pak spusťte skript znovu. (Se základním hlasem: npm run voice -- --force)',
  );
  process.exit(1);
}

const rate = arg('rate') ?? '165';
const outDir = resolve(arg('out') ?? 'src/assets/voice');
const only = arg('only')?.split(',') as LineId[] | undefined;
const ids = (Object.keys(LINES) as LineId[]).filter((id) => !only || only.includes(id));

mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'krecek-voice-'));
console.log(`Hlas: ${chosen}, tempo ${rate} slov/min → ${outDir}`);
try {
  for (const id of ids) {
    const aiff = join(tmp, `${id}.aiff`);
    execFileSync('say', ['-v', chosen, '-r', rate, '-o', aiff, LINES[id]]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', '64000', '-c', '1', aiff, join(outDir, `${id}.m4a`)]);
    console.log(`  ✓ ${id}.m4a  „${LINES[id]}“`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('Hotovo. Spusťte hru (npm run dev) – věty se přehrají z nahrávek.');
