#!/usr/bin/env node
/**
 * Uključivanje dvofaktorske zaštite — `npm run totp`
 *
 * Napravi tajnu, pokaže je u obliku koji aplikacija na telefonu razumije, i
 * odmah provjeri da se poklapa — prije nego što išta ode na pravi sajt.
 *
 * Ta zadnja provjera nije ukras. Bez nje se greška vidi tek pri prvoj
 * prijavi na živom sajtu, a tada je već kasno: administracija traži kod koji
 * nemaš odakle dobiti.
 *
 * Tajna se ispisuje SAMO ovdje, u tvom terminalu. Ne ide ni u jednu datoteku
 * koja se commita i ne prolazi ni kroz kakav chat.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

// ── Isti račun kao u src/lib/totp.ts ────────────────────────────────────────
// Skripta se pokreće golim Node-om, bez TypeScripta, pa se ovih dvadesetak
// redova ponavlja. Da se ikad raziđu, `totp.test.ts` bi to odmah pokazao —
// tamo stoje službeni test vektori iz RFC-a 6238.

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32[(value >>> bits) & 31];
    }
  }

  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function decodeBase32(input) {
  const clean = input.toUpperCase().replace(/[=\s-]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];

  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error(`neispravan znak "${char}"`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(out);
}

function codeForCounter(secret, counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

function currentCounter() {
  return Math.floor(Date.now() / 1000 / 30);
}

// ── Vodič ───────────────────────────────────────────────────────────────────

/**
 * Skripta traži živ terminal.
 *
 * Bez ove provjere, pokrenuta s preusmjerenim ulazom (u cjevovodu, iz nekog
 * alata, u CI-u) samo visi na pitanju koje niko ne može odgovoriti — bez
 * greške i bez ijedne poruke. Jasno "ne mogu ovako" je bolje od toga.
 */
if (!process.stdin.isTTY) {
  console.error('\nOvo treba pokrenuti u terminalu — traži da upišeš kod s telefona.\n');
  console.error('Ako ti tajna treba za neki alat, napravi je sam:');
  console.error('  node -e \'console.log(require("node:crypto").randomBytes(20).toString("base64"))\'');
  console.error('...ali onda je sam i provjeri prije nego je pustiš na živi sajt.\n');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

const secret = encodeBase32(randomBytes(20));
const grouped = secret.match(/.{1,4}/g).join(' ');

const issuer = 'TreeScape';
const label = 'admin';
const params = new URLSearchParams({
  secret,
  issuer,
  algorithm: 'SHA1',
  digits: '6',
  period: '30',
});
const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;

console.log(`\n${c.bold('Dvofaktorska zaštita administracije')}\n`);
console.log('Uz pristupni kod tražit će se i šestocifreni broj s telefona.');
console.log(`Treba ti aplikacija za provjeru — ${c.dim('Google Authenticator, Authy, 1Password,')}`);
console.log(`${c.dim('iOS Lozinke, bilo koja.')}\n`);

console.log(c.bold('1. Dodaj nalog u aplikaciju.\n'));
console.log('   Ako aplikacija nudi "unesi ključ ručno", zalijepi ovo:\n');
console.log(`      ${c.green(c.bold(grouped))}\n`);
console.log(`   ${c.dim('Naziv: TreeScape · Tip: vremenski (TOTP) · 6 cifara · 30 sekundi')}\n`);
console.log(`   ${c.dim('Ako radije skeniraš, ovo je sadržaj QR koda:')}`);
console.log(`   ${c.dim(uri)}\n`);

// ── Provjera ────────────────────────────────────────────────────────────────

console.log(c.bold('2. Provjerimo da se poklapa.\n'));

let confirmed = false;

for (let attempt = 1; attempt <= 3 && !confirmed; attempt += 1) {
  const answer = (await rl.question('   Upiši kod koji aplikacija sada pokazuje: ')).replace(
    /\D/g,
    ''
  );

  if (answer.length !== 6) {
    console.log(c.yellow('   Treba tačno šest cifara.\n'));
    continue;
  }

  const key = decodeBase32(secret);
  const now = currentCounter();

  // Isti prozor tolerancije kao pri prijavi: korak unazad i unaprijed.
  for (let offset = -1; offset <= 1 && !confirmed; offset += 1) {
    const expected = Buffer.from(codeForCounter(key, now + offset), 'utf8');
    const got = Buffer.from(answer, 'utf8');
    if (expected.length === got.length && timingSafeEqual(expected, got)) confirmed = true;
  }

  if (!confirmed) {
    console.log(c.yellow('   Ne poklapa se. Provjeri da si dodao pravi nalog.'));
    console.log(
      c.dim('   Ako uporno ne ide, sat na telefonu je vjerovatno pomjeren — ') +
        c.dim('uključi automatsko podešavanje vremena.\n')
    );
  }
}

rl.close();

if (!confirmed) {
  console.log(`\n${c.red('Nije potvrđeno — tajna se NE upisuje nigdje.')}`);
  console.log(c.dim('Pokreni ponovo kad riješiš aplikaciju: npm run totp\n'));
  process.exit(1);
}

console.log(`\n   ${c.green('Poklapa se.')}\n`);

console.log(c.bold('3. Upiši tajnu tamo gdje sajt živi.\n'));
console.log(`   ${c.cyan('Lokalno')} — dodaj u .env.local:\n`);
console.log(`      ADMIN_TOTP_SECRET=${secret}\n`);
console.log(`   ${c.cyan('Na Vercelu')} — Settings → Environment Variables → Add:\n`);
console.log(`      ${c.bold('ADMIN_TOTP_SECRET')} = ${secret}\n`);
console.log(`   ${c.dim('Pa Redeploy. Do tada prijava traži samo pristupni kod.')}\n`);

console.log(c.bold('Zapamti dvije stvari:\n'));
console.log(
  `   · Sve sesije koje su sada otvorene ${c.bold('prestat će vrijediti')} čim ovo uključiš.`
);
console.log('     To je namjerno — stara kartica ne smije zaobići novu zaštitu.\n');
console.log(`   · ${c.bold('Ako izgubiš telefon')}, obriši ADMIN_TOTP_SECRET iz Vercela i`);
console.log('     pokreni Redeploy. Prijava se vraća na sam pristupni kod, a onda');
console.log(`     pokreni ovo ponovo s novim telefonom. ${c.dim('To ti je rezervni izlaz —')}`);
console.log(`     ${c.dim('zato pristup Vercel nalogu čuvaj barem koliko i ovaj kod.')}\n`);
