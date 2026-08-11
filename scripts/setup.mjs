#!/usr/bin/env node
/**
 * Vodič kroz podešavanje — `npm run setup`
 *
 * Pita te ključ po ključ i sam upiše `.env.local`.
 *
 * Ključevi se unose OVDJE, u tvom terminalu, i ostaju na tvom računaru.
 * Ne prolaze ni kroz kakav chat i ne ispisuju se nazad na ekran.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env.local');

const rl = createInterface({ input: process.stdin, output: process.stdout });

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

/** Postojeće vrijednosti se čuvaju — Enter znači "ostavi kako jeste". */
function readExisting() {
  if (!existsSync(ENV_PATH)) return {};
  const out = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

function mask(value) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}${'•'.repeat(12)}${value.slice(-4)}`;
}

const existing = readExisting();

async function ask(key, { label, hint, required = false, generate = false }) {
  const current = existing[key];

  console.log();
  console.log(c.bold(label));
  if (hint) console.log(c.dim(`  ${hint}`));
  if (current) console.log(c.dim(`  trenutno: ${mask(current)}`));

  const suffix = generate
    ? c.dim(' [Enter = generiši nasumično]')
    : current
      ? c.dim(' [Enter = ostavi]')
      : required
        ? c.yellow(' (obavezno)')
        : c.dim(' [Enter = preskoči]');

  const answer = (await rl.question(`  ${key}${suffix}: `)).trim();

  if (answer) return answer;
  if (current) return current;
  if (generate) return randomBytes(24).toString('base64url');
  return '';
}

console.log(c.bold('\n╔════════════════════════════════════════════╗'));
console.log(c.bold('║   TreeScape — podešavanje                  ║'));
console.log(c.bold('╚════════════════════════════════════════════╝'));
console.log(
  c.dim(
    '\nSve što uneseš ide samo u .env.local na ovom računaru.\n' +
      'Ta datoteka je u .gitignore i nikada ne odlazi na GitHub.\n' +
      'Ono što preskočiš možeš dodati kasnije — ponovo pokreni npm run setup.'
  )
);

console.log(c.cyan('\n─── 1. Supabase (baza) ───'));
console.log(c.dim('    supabase.com → tvoj projekat → Project Settings → API'));

const values = {};
values.NEXT_PUBLIC_SUPABASE_URL = await ask('NEXT_PUBLIC_SUPABASE_URL', {
  label: 'Adresa projekta',
  hint: 'izgleda kao https://abcdefgh.supabase.co',
});
values.NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask('NEXT_PUBLIC_SUPABASE_ANON_KEY', {
  label: 'Javni (anon) ključ',
  hint: 'ovaj ide u preglednik — smije biti javan',
});
values.SUPABASE_SERVICE_ROLE_KEY = await ask('SUPABASE_SERVICE_ROLE_KEY', {
  label: 'Service role ključ',
  hint: 'TAJNA. Samo server. Nikome je ne šalji.',
});

console.log(c.cyan('\n─── 2. Plaćanje ───'));
console.log(
  c.dim(
    '    Bankovni podaci (IBAN, primalac) se NE unose ovdje nego u\n' +
      '    administraciji: /admin → Cijene → "Podaci za uplatu na račun".'
  )
);

values.ENABLE_TEST_PAYMENTS = await ask('ENABLE_TEST_PAYMENTS', {
  label: 'Uključiti TEST način plaćanja?',
  hint: 'upiši "true" da možeš isprobati cijeli tok bez pravog novca; na pravom sajtu mora ostati false',
});
if (!values.ENABLE_TEST_PAYMENTS) values.ENABLE_TEST_PAYMENTS = 'false';

console.log(c.cyan('\n─── 3. Administracija ───'));

values.ADMIN_ACCESS_CODE = await ask('ADMIN_ACCESS_CODE', {
  label: 'Pristupni kod za /admin',
  hint: 'ovo kucaš da uđeš u administraciju',
  generate: true,
});
values.ADMIN_SESSION_SECRET = await ask('ADMIN_SESSION_SECRET', {
  label: 'Tajna za potpisivanje sesije',
  hint: 'nikad je ne kucaš ručno — samo pritisni Enter',
  generate: true,
});
values.CRON_SECRET = await ask('CRON_SECRET', {
  label: 'Tajna za cron posao',
  hint: 'štiti automatsko oslobađanje napuštenih termina',
  generate: true,
});

console.log(c.cyan('\n─── 4. Ostalo ───'));

values.NEXT_PUBLIC_SITE_URL = await ask('NEXT_PUBLIC_SITE_URL', {
  label: 'Adresa sajta',
  hint: 'lokalno: http://localhost:3000 — bez kose crte na kraju',
});
if (!values.NEXT_PUBLIC_SITE_URL) values.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

values.OWNER_EMAIL = await ask('OWNER_EMAIL', {
  label: 'Email vlasnika',
  hint: 'tu stižu obavijesti o novim rezervacijama',
});
values.RESEND_API_KEY = await ask('RESEND_API_KEY', {
  label: 'Resend ključ (opcionalno)',
  hint: 'bez njega sve radi, samo se ne šalju mailovi — resend.com',
});
values.EMAIL_FROM = existing.EMAIL_FROM ?? 'TreeScape <onboarding@resend.dev>';

values.TELEGRAM_BOT_TOKEN = await ask('TELEGRAM_BOT_TOKEN', {
  label: 'Telegram bot (opcionalno)',
  hint: 'obavijest na telefon za koju sekundu — u Telegramu: @BotFather → /newbot',
});
values.TELEGRAM_CHAT_ID = await ask('TELEGRAM_CHAT_ID', {
  label: 'Telegram broj razgovora',
  hint: 'napiši botu "zdravo", pa otvori api.telegram.org/bot<TOKEN>/getUpdates',
});

rl.close();

const content = `# Lokalne postavke — NE commita se (vidi .gitignore).
# Generisano sa: npm run setup

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL=${values.NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${values.NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${values.SUPABASE_SERVICE_ROLE_KEY}

# ── Plaćanje ──
# Bankovni podaci se unose u /admin → Cijene, ne ovdje.
ENABLE_TEST_PAYMENTS=${values.ENABLE_TEST_PAYMENTS}

# ── Administracija ──
ADMIN_ACCESS_CODE=${values.ADMIN_ACCESS_CODE}
ADMIN_SESSION_SECRET=${values.ADMIN_SESSION_SECRET}
CRON_SECRET=${values.CRON_SECRET}

# ── Aplikacija ──
NEXT_PUBLIC_SITE_URL=${values.NEXT_PUBLIC_SITE_URL}

# ── Email (opcionalno) ──
RESEND_API_KEY=${values.RESEND_API_KEY}
EMAIL_FROM=${values.EMAIL_FROM}
OWNER_EMAIL=${values.OWNER_EMAIL}

# ── Telegram (opcionalno) ──
TELEGRAM_BOT_TOKEN=${values.TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${values.TELEGRAM_CHAT_ID}
`;

writeFileSync(ENV_PATH, content, 'utf8');

console.log(c.green('\n✓ Zapisano u .env.local'));
console.log(c.bold('\n  Tvoj kod za /admin:'), c.yellow(values.ADMIN_ACCESS_CODE));
console.log(c.dim('  (zapiši ga negdje — u datoteci je, ali nije loše imati ga pri ruci)'));

console.log(c.bold('\nSljedeći korak:'));
console.log('  npm run doctor    ' + c.dim('— provjeri da li je sve ispravno podešeno'));
console.log();
