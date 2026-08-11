#!/usr/bin/env node
/**
 * Provjera podešavanja — `npm run doctor`
 *
 * Prolazi kroz sve što mora biti tačno da bi rezervacije radile, i javi
 * TAČNO šta fali i gdje se to popravlja.
 *
 * Nijedan ključ se ne ispisuje — samo maskirano (sk_t••••••••4242), tako da
 * izlaz ove komande možeš slobodno nekome pokazati.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

let failures = 0;
let warnings = 0;

const ok = (msg, extra = '') => console.log(`  ${c.green('✓')} ${msg} ${c.dim(extra)}`);
const bad = (msg, fix) => {
  failures++;
  console.log(`  ${c.red('✗')} ${msg}`);
  if (fix) console.log(`      ${c.yellow('→')} ${fix}`);
};
const warn = (msg, fix) => {
  warnings++;
  console.log(`  ${c.yellow('!')} ${msg}`);
  if (fix) console.log(`      ${c.dim('→')} ${fix}`);
};
const section = (title) => console.log(c.cyan(`\n─── ${title} ───`));

function mask(v) {
  if (!v) return '';
  return v.length <= 10 ? '••••' : `${v.slice(0, 6)}${'•'.repeat(8)}${v.slice(-4)}`;
}

// ── Učitavanje .env.local ───────────────────────────────────────────────────
const ENV_PATH = path.resolve(process.cwd(), '.env.local');

console.log(c.bold('\n╔════════════════════════════════════════════╗'));
console.log(c.bold('║   TreeScape — provjera podešavanja         ║'));
console.log(c.bold('╚════════════════════════════════════════════╝'));

section('Datoteka .env.local');

if (!existsSync(ENV_PATH)) {
  bad('.env.local ne postoji', 'pokreni: npm run setup');
  console.log(c.red('\nBez te datoteke dalje nema šta da se provjerava.\n'));
  process.exit(1);
}
ok('.env.local postoji');

const env = {};
for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && m[2].trim()) env[m[1]] = m[2].trim();
}

// ── Supabase ────────────────────────────────────────────────────────────────
section('Supabase');

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

let db = null;

if (!url || !anonKey || !serviceKey) {
  bad(
    'nedostaju Supabase ključevi',
    'npm run setup  (Supabase → Project Settings → API)'
  );
  console.log(
    c.dim('\n  Bez baze sajt i dalje radi, ali na demo podacima — prave rezervacije ne rade.')
  );
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  bad(`adresa ne izgleda ispravno: ${url}`, 'treba oblik https://abcdefgh.supabase.co');
} else if (serviceKey === anonKey) {
  bad(
    'service role ključ je isti kao anon ključ',
    'to su dva RAZLIČITA ključa na istoj stranici u Supabase-u'
  );
} else {
  ok('ključevi postavljeni', `${mask(serviceKey)}`);

  const { createClient } = await import('@supabase/supabase-js');
  db = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── Migracija ─────────────────────────────────────────────────────────────
  section('Migracija baze');

  const tables = ['bookings', 'availability_slots', 'rate_periods', 'settings', 'payment_events'];
  let missing = [];

  for (const table of tables) {
    // NAMJERNO `.limit(1)`, a ne `{ head: true }`.
    // Sa `head: true` PostgREST na nepostojeću tabelu ne vrati grešku, pa je
    // doctor jednom prijavio da je migracija prošla iako nije bila ni pokrenuta.
    const { error } = await db.from(table).select('*').limit(1);
    if (error) missing.push(table);
  }

  // Tabela može postojati, a da joj fali kolona — npr. ako je migracija
  // pukla na pola, ili ako baza još nosi stariju verziju sheme. Zato se
  // provjeravaju i pojedine kolone, a ne samo postojanje tabela.
  const columnChecks = [
    { table: 'bookings', column: 'payment_reference' },
    { table: 'bookings', column: 'locale' },
    { table: 'settings', column: 'bank_iban' },
    { table: 'settings', column: 'weekend_price_cents' },
  ];
  const missingColumns = [];

  for (const { table, column } of columnChecks) {
    if (missing.includes(table)) continue;
    const { error } = await db.from(table).select(column).limit(1);
    if (error) missingColumns.push(`${table}.${column}`);
  }

  const RUN_IT = 'Supabase → SQL Editor → zalijepi supabase/migrations/0001_init.sql → Run';

  if (missing.length === tables.length) {
    bad('nijedna tabela ne postoji — shema nije pokrenuta', RUN_IT);
  } else if (missing.length > 0) {
    bad(`nedostaju tabele: ${missing.join(', ')}`, RUN_IT);
  } else if (missingColumns.length > 0) {
    // Shema je iz starije verzije projekta. Datoteka je pisana tako da se
    // smije pokrenuti i preko postojeće baze — ništa se ne briše.
    bad(`shema je zastarjela — nedostaje: ${missingColumns.join(', ')}`, RUN_IT);
  } else {
    ok('sve tabele postoje', tables.join(', '));

    const { data: settings } = await db.from('settings').select('*').eq('id', 1).maybeSingle();
    if (!settings) {
      bad('nema reda u tabeli settings', "pokreni: insert into settings (id) values (1);");
    } else {
      ok(
        'postavke učitane',
        `${settings.default_nightly_cents / 100} ${settings.currency_symbol}/noćenje, ` +
          `čišćenje ${settings.cleaning_fee_cents / 100}, min ${settings.min_nights} noćenja`
      );
    }

    const { error: rpcError } = await db.rpc('release_expired_holds');
    if (rpcError) {
      bad('funkcija release_expired_holds ne postoji', 'ponovo pokreni migraciju');
    } else {
      ok('funkcija release_expired_holds radi');
    }

    // ── NAJVAŽNIJA PROVJERA ────────────────────────────────────────────────
    // Ne gledamo metapodatke nego stvarno ponašanje: upišemo dva termina koja
    // se preklapaju i tražimo da baza odbije drugi. Koristi 2099. godinu i
    // sve za sobom počisti.
    section('Zaštita od dvostrukog bookinga');

    const tokenA = `doctor-a-${Date.now()}`;
    const tokenB = `doctor-b-${Date.now()}`;
    const row = (token) => ({
      booking_public_link: token,
      start_date: '2099-01-10',
      end_date: '2099-01-15',
      status: 'blocked',
      payment_method: 'none',
      admin_note: 'automatska provjera — briše se odmah',
    });

    try {
      const { error: firstError } = await db.from('bookings').insert(row(tokenA));

      if (firstError) {
        bad(`ne mogu upisati probni termin: ${firstError.message}`, 'provjeri migraciju');
      } else {
        const { error: secondError } = await db.from('bookings').insert(row(tokenB));

        if (!secondError) {
          bad(
            'BAZA JE PRIMILA DVA PREKLAPAJUĆA TERMINA — dvostruki booking je moguć!',
            'ograničenje bookings_no_overlap nedostaje. Ponovo pokreni 0001_init.sql.'
          );
        } else if (secondError.code === '23P01') {
          ok('baza odbija preklapanje', 'greška 23P01 — tačno kako treba');
        } else {
          warn(
            `drugi upis je odbijen, ali s neočekivanom greškom: ${secondError.code}`,
            secondError.message
          );
        }

        // Da li okidač održava javni kalendar?
        const { data: slot } = await db
          .from('availability_slots')
          .select('kind')
          .eq('start_date', '2099-01-10')
          .maybeSingle();

        if (slot) ok('okidač upisuje termin u javni kalendar', `vrsta: ${slot.kind}`);
        else bad('okidač ne puni availability_slots', 'ponovo pokreni migraciju');
      }
    } finally {
      await db.from('bookings').delete().in('booking_public_link', [tokenA, tokenB]);
      const { data: leftovers } = await db
        .from('bookings')
        .select('booking_public_link')
        .in('booking_public_link', [tokenA, tokenB]);
      if (leftovers?.length) {
        warn('probni redovi nisu obrisani', `obriši ručno: ${leftovers.map((l) => l.booking_public_link).join(', ')}`);
      } else {
        ok('probni podaci obrisani');
      }
    }

    // ── Privatnost gostiju ─────────────────────────────────────────────────
    section('Privatnost podataka o gostima');

    const publicDb = createClient(url, anonKey, { auth: { persistSession: false } });

    const { data: leaked, error: blockedError } = await publicDb
      .from('bookings')
      .select('guest_name, guest_email, guest_phone');

    if (leaked && leaked.length > 0) {
      bad(
        `PREGLEDNIK MOŽE ČITATI PODATKE GOSTIJU (${leaked.length} redova)!`,
        'RLS nije uključen. Ponovo pokreni 0001_init.sql, dio pod "7. SIGURNOST".'
      );
    } else if (blockedError || (leaked && leaked.length === 0)) {
      ok('imena, mailovi i telefoni gostiju su nedostupni iz preglednika');
    }

    const { error: slotsError } = await publicDb
      .from('availability_slots')
      .select('start_date')
      .limit(1);

    if (slotsError) {
      bad(
        'preglednik NE MOŽE čitati slobodne termine — kalendar će biti prazan',
        'ponovo pokreni migraciju (politika "javno citanje dostupnosti")'
      );
    } else {
      ok('preglednik može čitati slobodne termine');
    }
  }
}

// ── Plaćanje ────────────────────────────────────────────────────────────────
section('Načini plaćanja');

const testOn = env.ENABLE_TEST_PAYMENTS === 'true';
const live = Boolean(env.NEXT_PUBLIC_SITE_URL && !env.NEXT_PUBLIC_SITE_URL.includes('localhost'));

if (db) {
  const { data: s } = await db
    .from('settings')
    .select('bank_iban, bank_account_name, bank_name, transfer_days')
    .eq('id', 1)
    .maybeSingle();

  const iban = (s?.bank_iban ?? '').replace(/\s/g, '');

  if (!iban) {
    warn(
      'plaćanje na račun se ne nudi — IBAN nije unesen',
      'unesi ga u /admin → Cijene → "Podaci za uplatu na račun"'
    );
  } else if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(iban.toUpperCase())) {
    bad(`IBAN nije ispravnog oblika: ${iban}`, 'npr. BA391234567890123456');
  } else if (!s?.bank_account_name?.trim()) {
    bad(
      'IBAN je unesen, ali nema naziva primaoca',
      'bez toga gost ne zna na čije ime uplaćuje — /admin → Cijene'
    );
  } else {
    ok('plaćanje na račun radi', `${iban.slice(0, 6)}…${iban.slice(-4)}, rok ${s.transfer_days} dana`);
  }
}

ok('plaćanje u gotovini', 'uvijek dostupno, uz odobrenje vlasnika');

if (testOn && live) {
  bad(
    'TEST način plaćanja je UKLJUČEN na pravom sajtu — svako može rezervisati besplatno!',
    'postavi ENABLE_TEST_PAYMENTS=false i objavi ponovo'
  );
} else if (testOn) {
  warn('TEST način plaćanja je uključen', 'u redu lokalno; na pravom sajtu mora biti false');
} else {
  ok('TEST način plaćanja isključen');
}

// ── Administracija ──────────────────────────────────────────────────────────
section('Administracija');

/**
 * Dužina nije dovoljna mjera. Tajna koja je nekad bila primjer u uputstvu je
 * javno poznata bez obzira koliko je duga — ko je zna, može sam potpisati
 * kolačić i ući u administraciju bez pristupnog koda.
 */
const KNOWN_PLACEHOLDERS = [
  'lokalna-tajna-za-razvoj-najmanje-32-znaka-duga',
  'promijeni-me-najmanje-32-znaka-duga-tajna',
  'promijeni-me-u-dug-nasumican-kod',
  'promijeni-me',
  'treescape-lokalni-test-kod',
  'changeme',
  'secret',
];

const isPlaceholder = (v) => KNOWN_PLACEHOLDERS.includes(v?.toLowerCase?.() ?? '');

if (!env.ADMIN_ACCESS_CODE) {
  bad('nema ADMIN_ACCESS_CODE — /admin se ne može otvoriti', 'npm run setup');
} else if (isPlaceholder(env.ADMIN_ACCESS_CODE)) {
  bad(
    'ADMIN_ACCESS_CODE je primjer iz uputstva — javno poznat',
    'obriši tu liniju iz .env.local pa pokreni: npm run setup'
  );
} else if (env.ADMIN_ACCESS_CODE.length < 12) {
  // Ovo nije savjet nego stanje: prijava s ovako kratkim kodom se odbija
  // (vidi MIN_ACCESS_CODE_LENGTH u src/lib/admin-auth.ts).
  bad(
    `pristupni kod ima ${env.ADMIN_ACCESS_CODE.length} znakova — prijava je onemogućena`,
    'najmanje 12, a najbolje: openssl rand -base64 24'
  );
} else if (env.ADMIN_ACCESS_CODE.length < 16) {
  warn(
    `pristupni kod ima ${env.ADMIN_ACCESS_CODE.length} znakova`,
    'neka bude bar 16 nasumičnih — ovo je jedina brava na administraciji'
  );
} else {
  ok('pristupni kod postavljen', `${env.ADMIN_ACCESS_CODE.length} znakova`);
}

// Kod koji sadrži ime, godinu ili broj telefona pogađa se, ne razbija.
if (env.ADMIN_ACCESS_CODE && /^[A-Za-zČĆŽŠĐčćžšđ]{3,}\d{4,}$/.test(env.ADMIN_ACCESS_CODE)) {
  warn(
    'pristupni kod izgleda kao ime + broj',
    'takav kod pogađa svako ko te poznaje — bolje nasumičan niz'
  );
}

if (!env.ADMIN_SESSION_SECRET) {
  bad('nema ADMIN_SESSION_SECRET', 'npm run setup');
} else if (isPlaceholder(env.ADMIN_SESSION_SECRET)) {
  bad(
    'ADMIN_SESSION_SECRET je primjer iz uputstva — s njim se pristupni kod može ZAOBIĆI',
    'obriši tu liniju iz .env.local pa pokreni: npm run setup'
  );
} else if (env.ADMIN_SESSION_SECRET.length < 32) {
  bad(
    `ADMIN_SESSION_SECRET ima ${env.ADMIN_SESSION_SECRET.length} znakova, treba najmanje 32`,
    'npm run setup  (Enter na tom pitanju generiše ispravnu tajnu)'
  );
} else {
  ok('tajna sesije dovoljno duga');
}

/**
 * Drugi faktor nije obavezan da bi sajt radio, ali jeste ono što dijeli
 * "neko zna kod" od "neko ima i telefon". Zato upozorenje, ne samo bilješka.
 */
if (!env.ADMIN_TOTP_SECRET) {
  warn(
    'dvofaktorska zaštita nije uključena — pristupni kod je jedina brava',
    'npm run totp  (traje minutu, treba ti aplikacija za provjeru na telefonu)'
  );
} else if (!/^[A-Z2-7]{16,}$/i.test(env.ADMIN_TOTP_SECRET.replace(/[=\s-]/g, ''))) {
  bad(
    'ADMIN_TOTP_SECRET nije ispravan base32 — prijava će padati',
    'npm run totp  (napravi novu tajnu i ponovo dodaj nalog u aplikaciju)'
  );
} else {
  ok('dvofaktorska zaštita uključena');
}

if (!env.CRON_SECRET) {
  bad('nema CRON_SECRET — cron ruta se ne izvršava (vraća 401)', 'npm run setup');
} else {
  ok('cron tajna postavljena');
}

// ── Ostalo ──────────────────────────────────────────────────────────────────
section('Ostalo');

const site = env.NEXT_PUBLIC_SITE_URL;
if (!site) {
  warn('nema NEXT_PUBLIC_SITE_URL', 'lokalno: http://localhost:3000');
} else if (site.endsWith('/')) {
  bad(`NEXT_PUBLIC_SITE_URL završava kosom crtom: ${site}`, 'ukloni / s kraja');
} else {
  ok('adresa sajta', site);
}

const gmail = Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
const posta = gmail ? 'Gmail' : env.RESEND_API_KEY ? 'Resend' : null;

if (!posta) {
  warn(
    'email nije podešen — potvrde se neće slati gostima',
    'najlakše: GMAIL_USER + GMAIL_APP_PASSWORD (ne traži vlastiti domen)'
  );
} else {
  ok(`email podešen (${posta})`, env.OWNER_EMAIL ?? '');
}

if (env.GMAIL_USER && !env.GMAIL_APP_PASSWORD) {
  warn(
    'ima GMAIL_USER ali nema GMAIL_APP_PASSWORD',
    'to je zasebna lozinka za aplikacije, ne lozinka naloga: myaccount.google.com → Security → App passwords'
  );
}

if (posta && !env.OWNER_EMAIL) {
  warn('nema OWNER_EMAIL — gost dobija mail, ali ti ne dobijaš obavijest mailom');
}

// Resend bez potvrđenog domena ume da prevari: proba na vlastitu adresu prođe,
// pa se čini da radi — a prvom pravom gostu mail nikad ne stigne.
if (posta === 'Resend' && (env.EMAIL_FROM ?? '').includes('onboarding@resend.dev')) {
  warn(
    'Resend šalje s onboarding@resend.dev — do potvrde domena prima SAMO tvoju adresu',
    'za prave goste: potvrdi domen u Resend-u, ili koristi Gmail'
  );
}

const telegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
if (telegram) {
  ok('Telegram obavijesti podešene');
} else if (env.TELEGRAM_BOT_TOKEN) {
  warn('ima TELEGRAM_BOT_TOKEN ali nema TELEGRAM_CHAT_ID', 'oba su potrebna, inače se preskače');
} else if (env.TELEGRAM_CHAT_ID) {
  warn('ima TELEGRAM_CHAT_ID ali nema TELEGRAM_BOT_TOKEN', 'oba su potrebna, inače se preskače');
}

// Zahtjev za gotovinu drži termin samo neko vrijeme. Ako ni mail ni Telegram
// nisu podešeni, on tiho stoji u /admin dok ne istekne. Lokalno to nije
// problem, pa ostaje upozorenje — ali na pravom sajtu je ovo ono što se ne
// smije previdjeti.
if (!telegram && !(env.RESEND_API_KEY && env.OWNER_EMAIL)) {
  warn(
    'nijedan kanal obavijesti nije podešen — za nove zahtjeve nećeš saznati',
    'podesi TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (najbrže) ili RESEND_API_KEY + OWNER_EMAIL'
  );
}

// ── Zaključak ───────────────────────────────────────────────────────────────
console.log();
console.log('─'.repeat(48));

if (failures === 0 && warnings === 0) {
  console.log(c.green(c.bold('\n  Sve je ispravno podešeno. ✓')));
  console.log(c.dim('\n  Pokreni: npm run dev\n'));
} else if (failures === 0) {
  console.log(c.green(c.bold(`\n  Radi. ${warnings} upozorenje/a (ništa kritično).`)));
  console.log(c.dim('\n  Pokreni: npm run dev\n'));
} else {
  console.log(c.red(c.bold(`\n  ${failures} greška/e${warnings ? `, ${warnings} upozorenje/a` : ''}.`)));
  console.log(c.dim('  Popravi ono označeno crvenim ✗ pa pokreni ponovo: npm run doctor\n'));
}

process.exit(failures > 0 ? 1 : 0);
