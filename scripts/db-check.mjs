#!/usr/bin/env node
/**
 * Lokalna baza i provjera — `npm run db:check`
 *
 * Pušta `migrations/0001_init.sql` i `demodata.sql` na PRAVOM Postgresu na
 * tvom računaru (PGlite = Postgres preveden u WebAssembly) i dokazuje da rade
 * — prije nego išta od toga dodirne pravi projekat u oblaku.
 *
 * Ne traži Docker, Supabase nalog ni internet. Traje par sekundi.
 *
 *   npm run db:check            provjeri shemu i demo podatke
 *   npm run db:check -- --keep  ostavi bazu na disku, da joj se možeš vratiti
 *
 * Odnos prema `npm test`: testovi provjeravaju shemu iz ugla koda, ovo je
 * provjera iz ugla vlasnika — tačno onim redoslijedom kojim se datoteke
 * lijepe u Supabase SQL Editor, uključujući i demo podatke.
 */

import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';

const ROOT = path.resolve(import.meta.dirname, '..');
const SUPA = path.join(ROOT, 'supabase');
const DATA_DIR = path.join(ROOT, '.local-db');

const keep = process.argv.includes('--keep');

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

let pass = 0;
let fail = 0;

const ok = (m, extra = '') => (pass++, console.log(`  ${c.green('✓')} ${m} ${c.dim(extra)}`));
const bad = (m, d = '') => (fail++, console.log(`  ${c.red('✗')} ${m}${d ? '\n      ' + d : ''}`));
const section = (t) => console.log(c.cyan(`\n─── ${t} ───`));

/**
 * Dvije stvari postoje samo u Supabase-u, ne i u golom Postgresu: role
 * `anon`/`authenticated` i publikacija `supabase_realtime`. Njih izbacujemo.
 * Sve ostalo — tabele, ograničenja, okidači, funkcije, RLS — provjerava se
 * tačno onako kako će raditi u oblaku.
 */
const forLocal = (sql) =>
  sql
    .replace(/^\s*to anon, authenticated\s*$/gim, '')
    .replace(/do \$\$\s*begin\s*alter publication[\s\S]*?end;\s*\$\$;/gi, '');

const read = (rel) => forLocal(readFileSync(path.join(SUPA, rel), 'utf8'));

async function rejected(promise) {
  try {
    await promise;
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

console.log(c.bold('\n╔════════════════════════════════════════════╗'));
console.log(c.bold('║   TreeScape — lokalna provjera baze        ║'));
console.log(c.bold('╚════════════════════════════════════════════╝'));
console.log(c.dim('\nPravi Postgres na tvom računaru. Bez Dockera i bez interneta.'));

if (!keep && existsSync(DATA_DIR)) rmSync(DATA_DIR, { recursive: true, force: true });

const db = keep ? new PGlite(DATA_DIR) : new PGlite();

// ── 0. schema.sql je u koraku s migracijom ──────────────────────────────────
section('schema.sql prati migraciju');

{
  const { spawnSync } = await import('node:child_process');

  // `gen-schema.mjs` vraća 0 ako je schema.sql već bila u koraku, a 1 ako ju
  // je morao osvježiti — tako se zastarjela datoteka ovdje vidi kao problem.
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'gen-schema.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (r.error) {
    bad('nije moguće provjeriti schema.sql', String(r.error.message).split('\n')[0]);
  } else if (r.status === 0) {
    ok('schema.sql odgovara migraciji');
  } else {
    bad(
      'schema.sql je bio zastario — upravo je osvježen',
      'Neko je uredio migrations/0001_init.sql, a schema.sql ostao star.\n' +
        '      Sada je usklađen; pogledaj `git diff supabase/schema.sql` i commituj.'
    );
  }
}

// ── 1. Shema ────────────────────────────────────────────────────────────────
section('0001_init.sql');

try {
  await db.exec(read('migrations/0001_init.sql'));
  ok('izvršava se bez greške');
} catch (e) {
  bad('shema je pukla', e.message);
  console.log(c.red('\n  Dalje nema smisla provjeravati.\n'));
  process.exit(1);
}

try {
  await db.exec(read('migrations/0001_init.sql'));
  ok('može se pokrenuti dvaput', 'vlasnik ne mora pamtiti je li već pokrenuo');
} catch (e) {
  bad('drugo pokretanje puca — nije idempotentna', e.message);
}

const { rows: tables } = await db.query(
  `select table_name from information_schema.tables
    where table_schema='public' order by 1`
);
const names = tables.map((t) => t.table_name);
const expected = ['availability_slots', 'bookings', 'payment_events', 'rate_periods', 'settings'];
if (JSON.stringify(names) === JSON.stringify(expected)) ok('sve tabele postoje', names.join(', '));
else bad('tabele ne odgovaraju', `dobio: ${names.join(', ')}`);

// ── 2. Ključevi ─────────────────────────────────────────────────────────────
section('Ključevi i javni link');

/**
 * `booking_public_link` se namjerno ne prosljeđuje — generiše ga baza, pa se
 * usput provjerava i podrazumijevana vrijednost. Probni redovi se prepoznaju
 * po `admin_note`.
 */
const gost = (s, e, st = 'confirmed', pm = 'cash') =>
  db.query(
    `insert into bookings
       (guest_name, guest_email, start_date, end_date, status, payment_method, total_cents, admin_note)
     values ('Provjera','p@e.ba',$1,$2,$3,$4,25000,'CHECK')
     returning id, booking_public_link`,
    [s, e, st, pm]
  );

const { rows: prvi } = await gost('2099-05-10', '2099-05-15');

if (/^\d+$/.test(String(prvi[0].id))) ok('id je cijeli broj', `prvi id: ${prvi[0].id}`);
else bad('id nije cijeli broj', String(prvi[0].id));

if (
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    prvi[0].booking_public_link
  )
)
  ok('booking_public_link je uuid koji baza sama generiše');
else bad('booking_public_link nije ispravan uuid', String(prvi[0].booking_public_link));

const { rows: drugi } = await gost('2099-06-10', '2099-06-12');
if (drugi[0].booking_public_link !== prvi[0].booking_public_link)
  ok('dva linka nikad nisu ista');
else bad('dvije rezervacije dobile isti javni link!');

// ── 3. Dvostruki booking ────────────────────────────────────────────────────
section('Zaštita od dvostrukog bookinga');

for (const [naziv, s, e] of [
  ['identičan termin', '2099-05-10', '2099-05-15'],
  ['preklapa početak', '2099-05-08', '2099-05-12'],
  ['preklapa kraj', '2099-05-14', '2099-05-20'],
  ['obuhvata postojeći', '2099-05-01', '2099-05-30'],
  ['unutar postojećeg', '2099-05-11', '2099-05-13'],
]) {
  const err = await rejected(gost(s, e));
  if (err?.includes('no_overlap') || err?.includes('23P01')) ok(`odbija: ${naziv}`);
  else bad(`NE odbija: ${naziv}`, err ?? 'upis je prošao, a nije smio!');
}

for (const st of ['pending_cash', 'pending_transfer', 'pending_payment']) {
  const err = await rejected(gost('2099-05-12', '2099-05-14', st));
  if (err) ok(`i stanje "${st}" drži termin`);
  else bad(`stanje "${st}" NE drži termin`);
}

// ── 4. Dan odlaska i jednodnevna rezervacija ────────────────────────────────
section('Dan odlaska i boravak bez noćenja');

if (!(await rejected(gost('2099-05-15', '2099-05-18'))))
  ok('dolazak na dan tuđeg odlaska prolazi', 'odjava 09:00, prijava 11:00');
else bad('dolazak na dan tuđeg odlaska je odbijen');

await gost('2099-07-01', '2099-07-02');
const { rows: dan } = await db.query(
  `select 1 from availability_slots where start_date = date '2099-07-01'`
);
if (dan.length === 1) ok('jedan dan zauzima tačno taj dan');
else bad('jednodnevna rezervacija ne zauzima termin');

if (await rejected(gost('2099-07-01', '2099-07-02'))) ok('drugi gost ne može uzeti isti dan');
else bad('dva gosta mogu uzeti isti dan!');

if (!(await rejected(gost('2099-07-02', '2099-07-03')))) ok('sljedeći dan je i dalje slobodan');
else bad('sljedeći dan je nepotrebno zauzet');

// ── 5. Oslobađanje ──────────────────────────────────────────────────────────
section('Oslobađanje termina');

const { rows: ot } = await gost('2099-09-01', '2099-09-05');
await db.query(`update bookings set status='cancelled' where id=$1`, [ot[0].id]);
if (!(await rejected(gost('2099-09-01', '2099-09-05'))))
  ok('otkazan termin se može ponovo rezervisati');
else bad('otkazan termin i dalje blokira');

await db.query(
  `insert into bookings
     (guest_name, guest_email, start_date, end_date, status, payment_method, hold_expires_at, admin_note)
   values ('Spor','s@e.ba','2099-10-01','2099-10-05','pending_transfer','bank_transfer', now() - interval '1 day','CHECK')`
);
const { rows: rel } = await db.query('select release_expired_holds() as n');
if (rel[0].n >= 1) ok('istekli termin se oslobađa', `oslobođeno: ${rel[0].n}`);
else bad('istekli termin se NE oslobađa');

// ── 6. Privatnost ───────────────────────────────────────────────────────────
section('Privatnost podataka o gostima');

const { rows: cols } = await db.query(
  `select column_name from information_schema.columns
    where table_name='availability_slots' order by 1`
);
const colNames = cols.map((x) => x.column_name);
const leaky = colNames.filter((n) => /name|email|phone|note/.test(n));
if (leaky.length === 0) ok('tabela za preglednik nema nijedan podatak o gostu', colNames.join(', '));
else bad(`tabela za preglednik izlaže: ${leaky.join(', ')}`);

const { rows: rls } = await db.query(
  `select relname from pg_class
    where relname in ('bookings','payment_events') and relrowsecurity = true`
);
if (rls.length === 2) ok('RLS uključen na bookings i payment_events');
else bad('RLS nije uključen svugdje gdje treba');

// ── 7. Demo podaci ──────────────────────────────────────────────────────────
section('demodata.sql');

await db.query(`delete from bookings where admin_note = 'CHECK'`);

try {
  await db.exec(read('demodata.sql'));
  ok('izvršava se bez greške');
} catch (e) {
  bad('demodata.sql je pukla', e.message);
}

const { rows: demo } = await db.query(
  `select status, count(*)::int as n from bookings where admin_note='DEMO' group by status order by 1`
);
if (demo.length > 0)
  ok('demo rezervacije upisane', demo.map((d) => `${d.status}: ${d.n}`).join(', '));
else bad('nema demo rezervacija');

const { rows: jezici } = await db.query(
  `select distinct locale from bookings where admin_note='DEMO' order by 1`
);
if (jezici.length === 3) ok('pokrivena sva tri jezika', jezici.map((j) => j.locale).join(', '));
else bad('demo ne pokriva sva tri jezika', jezici.map((j) => j.locale).join(', '));

const { rows: aktivne } = await db.query(
  `select count(*)::int as n from bookings
    where status in ('pending_payment','pending_cash','pending_transfer','confirmed','blocked')`
);
const { rows: slots } = await db.query('select count(*)::int as n from availability_slots');
if (aktivne[0].n === slots[0].n)
  ok('kalendar odgovara rezervacijama', `${slots[0].n} zauzetih termina`);
else bad(`neslaganje: ${aktivne[0].n} aktivnih, ${slots[0].n} u kalendaru`);

const { rows: mrtve } = await db.query(
  `select count(*)::int as n from availability_slots s
     join bookings b on b.id = s.booking_id
    where b.status in ('cancelled','expired')`
);
if (mrtve[0].n === 0) ok('otkazane i istekle ne zauzimaju kalendar');
else bad(`${mrtve[0].n} otkazanih/isteklih i dalje zauzima kalendar`);

// ── 8. schema.sql daje istu bazu kao migracija ──────────────────────────────
section('schema.sql daje isti rezultat kao migracija');

{
  const svjeza = new PGlite();

  try {
    await svjeza.exec(read('schema.sql'));
    ok('schema.sql se izvršava na praznoj bazi');

    /** Oblik baze: kolone, tipovi i ograničenja — sve po čemu se dvije mogu razići. */
    const oblik = async (conn) => {
      const kolone = await conn.query(
        `select table_name || '.' || column_name || ':' || data_type as x
           from information_schema.columns
          where table_schema='public' order by 1`
      );
      const ogranicenja = await conn.query(
        `select conname as x from pg_constraint
          where connamespace = 'public'::regnamespace order by 1`
      );
      return [
        ...kolone.rows.map((r) => 'kolona ' + r.x),
        ...ogranicenja.rows.map((r) => 'ogranicenje ' + r.x),
      ];
    };

    const a = await oblik(svjeza);
    const b = await oblik(db);
    const samoSchema = a.filter((x) => !b.includes(x));
    const samoMigracija = b.filter((x) => !a.includes(x));

    if (samoSchema.length === 0 && samoMigracija.length === 0) {
      ok('obje daju identičnu bazu', `${a.length} kolona i ograničenja provjereno`);
    } else {
      bad(
        'schema.sql i migracija se razilaze',
        [
          samoSchema.length ? 'samo u schema.sql: ' + samoSchema.join(', ') : '',
          samoMigracija.length ? 'samo u migraciji: ' + samoMigracija.join(', ') : '',
        ]
          .filter(Boolean)
          .join('\n      ')
      );
    }
  } catch (e) {
    bad('schema.sql je pukla', e.message);
  } finally {
    await svjeza.close();
  }
}

// ── Zaključak ───────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(48));

if (fail === 0) {
  console.log(c.green(c.bold(`\n  Sve prošlo (${pass} provjera). ✓`)));
  console.log(c.dim('\n  Shema je bezbjedna za pravi Supabase projekat.'));
  console.log(c.dim('  Redoslijed: 0001_init.sql  →  (opcionalno) demodata.sql\n'));
} else {
  console.log(c.red(c.bold(`\n  ${fail} problema, ${pass} prošlo.`)));
  console.log(c.dim('  NE puštaj ovo u pravi projekat dok se ne popravi.\n'));
}

if (keep) console.log(c.dim(`  Baza ostavljena u ${DATA_DIR}\n`));

await db.close();
process.exit(fail > 0 ? 1 : 0);
