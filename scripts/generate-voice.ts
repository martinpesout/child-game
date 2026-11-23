/**
 * Namluví všechny věty hry hlasem Macu a uloží je jako .m4a do src/assets/voice/.
 * Hra pak tyto nahrávky přehraje na každém zařízení místo hlasu zařízení.
 *
 *   npm run voice                         # nejlepší nainstalovaný český hlas
 *   npm run voice -- --voice "Zuzana (Prémiový)" --rate 165
 *   npm run voice -- --only intro,thanks  # jen vybrané věty
 *   npm run voice -- --force              # povolí i základní (strojový) hlas
 *   npm run voice -- --provider elevenlabs # hlasy ElevenLabs (klíč a hlasy v .env.local)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { LINES, type LineId } from '../src/audio/lines';
import { parseVoices, pickCzechVoice, voiceQuality } from './voiceTools';
import { elevenLabsRequest, parseEnv, speakerFor, voiceIdFor } from './elevenlabs';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

if (process.platform !== 'darwin') {
  console.error('Skript potřebuje macOS (příkazy say a afconvert).');
  process.exit(1);
}

const provider = arg('provider') ?? 'mac';
const env: Record<string, string | undefined> = { ...(existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}), ...process.env };
let chosen = '';
if (provider === 'mac') {
  const installed = parseVoices(execFileSync('say', ['-v', '?'], { encoding: 'utf8' }));
  chosen = arg('voice') ?? pickCzechVoice(installed)?.name ?? '';
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
} else if (provider === 'elevenlabs') {
  if (!env.ELEVENLABS_API_KEY) {
    console.error('Chybí ELEVENLABS_API_KEY. Uložte ho do souboru .env.local (do gitu nepůjde) – viz src/assets/voice/README.md.');
    process.exit(1);
  }
} else {
  console.error(`Neznámá služba „${provider}“. Použijte mac nebo elevenlabs.`);
  process.exit(1);
}

const rate = arg('rate') ?? '165';
const outDir = resolve(arg('out') ?? 'src/assets/voice');
const only = arg('only')?.split(',') as LineId[] | undefined;
const ids = (Object.keys(LINES) as LineId[]).filter((id) => !only || only.includes(id));

if (provider === 'elevenlabs') {
  const missingVoices = [...new Set(ids.map(speakerFor))].filter((sp) => !voiceIdFor(sp, env));
  if (missingVoices.length) {
    console.error(`Chybí hlasy pro: ${missingVoices.join(', ')}. Nastavte ELEVENLABS_VOICE_<POSTAVA> nebo ELEVENLABS_VOICE v .env.local (vzor: .env.example).`);
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'krecek-voice-'));
console.log(provider === 'mac' ? `Hlas: ${chosen}, tempo ${rate} slov/min → ${outDir}` : `ElevenLabs → ${outDir}`);
try {
  for (const id of ids) {
    let source: string;
    if (provider === 'mac') {
      source = join(tmp, `${id}.aiff`);
      execFileSync('say', ['-v', chosen, '-r', rate, '-o', source, LINES[id]]);
    } else {
      const speaker = speakerFor(id);
      const voiceId = voiceIdFor(speaker, env);
      const { url, init } = elevenLabsRequest(voiceId!, LINES[id], env.ELEVENLABS_API_KEY!);
      const res = await fetch(url, init);
      if (!res.ok) {
        console.error(`ElevenLabs vrátil chybu ${res.status} u věty ${id}: ${(await res.text()).slice(0, 300)}`);
        process.exit(1);
      }
      source = join(tmp, `${id}.mp3`);
      writeFileSync(source, Buffer.from(await res.arrayBuffer()));
    }
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', '64000', '-c', '1', source, join(outDir, `${id}.m4a`)]);
    console.log(`  ✓ ${id}.m4a  „${LINES[id]}“${provider === 'elevenlabs' ? `  (${speakerFor(id)})` : ''}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('Hotovo. Spusťte hru (npm run dev) – věty se přehrají z nahrávek.');
