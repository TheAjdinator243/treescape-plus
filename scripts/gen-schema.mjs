#!/usr/bin/env node
/**
 * Izvodi `supabase/schema.sql` iz `supabase/migrations/0001_init.sql`.
 *
 * Razlika između te dvije datoteke je samo jedan blok: migracija nosi i
 * logiku koja STARIJU bazu podiže na današnji oblik, a svježoj instalaciji to
 * ne treba. Sve ostalo — tabele, ograničenja, okidači, RLS, Realtime — je
 * doslovno isto.
 *
 * Zato se `schema.sql` ne piše rukom nego izvodi: dvije datoteke se tako ne
 * mogu razići zbog omaške u prepisivanju.
 *
 *   node scripts/gen-schema.mjs
 *
 * Pokreće se i samo, kao dio `npm run db:check`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'supabase', 'migrations', '0001_init.sql');
const DST = path.join(ROOT, 'supabase', 'schema.sql');

// Granice bloka koji svježoj bazi ne treba.
const POCETAK = '-- ── Ako tabela VEĆ POSTOJI iz starije verzije ──';
const KRAJ = '-- Ograničenja se imenuju izričito, da se kasnije mogu naći i zamijeniti.';

const ZAGLAVLJE = `-- ═══════════════════════════════════════════════════════════════════════════
--  TreeScape — SHEMA ZA NOVU, PRAZNU BAZU
--
--  Otvori Supabase → SQL Editor, kopiraj cijeli sadržaj, zalijepi i klikni Run.
--  Očekivani odgovor je "Success. No rows returned" — to je uspjeh.
--
--  ⚠  OVA DATOTEKA SE NE UREĐUJE RUČNO.
--
--  Izvodi se iz \`migrations/0001_init.sql\`, koja je jedini izvor istine.
--  Razlika je samo u tome što migracija nosi i blokove koji STARIJU bazu
--  podižu na današnji oblik; svježoj instalaciji to ne treba, pa je ovdje
--  izostavljeno. Sve ostalo je doslovno isto.
--
--  Mijenjaš shemu?  Uredi \`migrations/0001_init.sql\`, pa pokreni:
--      npm run db:check
--  Ta komanda osvježi ovu datoteku i provjeri obje na pravom Postgresu.
--
--  ── Koju datoteku kada ────────────────────────────────────────────────────
--    · nova, prazna baza          →  schema.sql (ova)
--    · baza koja već ima podatke  →  migrations/0001_init.sql
--    · podaci za igru             →  demodata.sql (tek nakon jedne od gornjih)
-- ═══════════════════════════════════════════════════════════════════════════
`;

const src = readFileSync(SRC, 'utf8');

const pocetak = src.indexOf(POCETAK);
const kraj = src.indexOf(KRAJ);

if (pocetak === -1 || kraj === -1 || kraj < pocetak) {
  console.error(
    'Ne mogu naći granice bloka za nadogradnju u 0001_init.sql.\n' +
      'Ako su se komentari promijenili, ispravi POCETAK/KRAJ u ovoj skripti.'
  );
  process.exit(1);
}

// Preskoči zaglavlje migracije — ova datoteka ima svoje.
const prvoZaglavlje = src.indexOf('-- ═══');
const krajZaglavlja = src.indexOf('-- ═══', prvoZaglavlje + 5);

const tijelo = src.slice(krajZaglavlja, pocetak).trimEnd() + '\n\n\n' + src.slice(kraj);
const izlaz = ZAGLAVLJE + tijelo;

const staro = (() => {
  try {
    return readFileSync(DST, 'utf8');
  } catch {
    return null;
  }
})();

writeFileSync(DST, izlaz, 'utf8');

const brojLinija = (s) => s.split('\n').length;

if (staro === izlaz) {
  console.log('schema.sql je već bio u koraku s migracijom.');
} else {
  console.log(
    `schema.sql osvježen — ${brojLinija(izlaz)} linija ` +
      `(izostavljeno ${brojLinija(src.slice(pocetak, kraj))} linija za nadogradnju starih baza).`
  );
}

// Izlazni kod govori je li datoteka bila zastarjela — `db:check` to koristi.
process.exit(staro === izlaz ? 0 : 1);
