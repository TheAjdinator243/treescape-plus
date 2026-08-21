import 'server-only';

import { NextResponse } from 'next/server';

import { isDatabaseConfigured } from './env';
import { DEFAULT_LOCALE, getStrings, type Locale } from './i18n';

/**
 * Kratka provjera prije nego ruta dodirne bazu.
 *
 * Bez ovoga bi `supabaseAdmin()` bacio izuzetak zbog nedostajućeg ključa, a
 * pozivalac bi dobio goli 500 bez ikakvog objašnjenja šta da uradi.
 */
/**
 * Ruta koja bez baze nema šta raditi.
 *
 * Poruka koja ide VANI je namjerno prazna od sadržaja. Ranije je ovdje išao
 * `errors.DATABASE_MISSING`, koji glasi "Dodaj Supabase ključeve u .env.local
 * (ili u Vercel → Environment Variables) i pokreni migracije iz
 * supabase/migrations" — uputa napisana za vlasnika sajta, a servirana svakome
 * ko pošalje jedan `curl`. Iz nje se besplatno saznaje baza, hosting, raspored
 * repozitorija i to da sajt trenutno stoji nedovršen.
 *
 * Ništa od toga nije katastrofa samo po sebi, ali je sve to prvi korak svakog
 * napada: napadač prvo mapira šta ima pred sobom. Poruka za vlasnika ostaje
 * netaknuta na `/admin`, iza pristupnog koda, i u serverskom logu.
 */
export function requireDatabase(locale: Locale = DEFAULT_LOCALE): NextResponse | null {
  if (isDatabaseConfigured) return null;

  console.error(
    '[treescape] baza nije podešena — ruta je odbila zahtjev. ' +
      'Nedostaju NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY ili SUPABASE_SERVICE_ROLE_KEY.'
  );

  return NextResponse.json({ error: getStrings(locale).errors.SERVER_ERROR }, { status: 503 });
}

/**
 * Najveće tijelo koje ijedna ruta ovdje ima razloga primiti.
 *
 * Najveći ispravan zahtjev je rezervacija s napomenom od 500 znakova — dakle
 * jedva dva kilobajta. Šesnaest je široko odmjereno.
 *
 * Granica postoji zato što se bez nje tijelo PRVO učita i raščlani, pa tek
 * onda dođe do sheme koja bi ga odbila. Platforma i sama odbija očito
 * prevelike zahtjeve, ali ta granica nije naša, ne piše nigdje u ovom
 * projektu i može se promijeniti bez našeg znanja. Ovdje je izrečena.
 */
const MAX_BODY_BYTES = 16 * 1024;

/** Sigurno čitanje JSON tijela — neispravan JSON ne smije rušiti rutu. */
export async function readJson(request: Request): Promise<unknown | null> {
  // Prijavljena dužina se provjerava prva: ako je već ona prevelika, tijelo
  // se ne mora ni pročitati.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;

  try {
    // Čita se kao tekst pa se mjeri: zahtjev koji je slagao o svojoj dužini —
    // ili je nije ni prijavio — staje ovdje, prije raščlanjivanja.
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return null;

    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * `detail` je pravi razlog (poruka iz baze, ili koje polje nije prošlo
 * provjeru). Šalje se SAMO iz administracije, koja je iza pristupnog koda.
 *
 * Gost ga nikad ne vidi — njemu poruka o unutrašnjosti baze ne znači ništa, a
 * može odati kako je sistem građen. Vlasniku znači sve: bez toga na ekranu
 * piše samo "Došlo je do greške", pravi uzrok ostane u Vercel logu, i svaki
 * kvar postaje pogađanje.
 */
export function invalidInput(locale: Locale = DEFAULT_LOCALE, detail?: string): NextResponse {
  const message = getStrings(locale).errors.INVALID_INPUT;
  return NextResponse.json({ error: detail ? `${message} — ${detail}` : message }, { status: 400 });
}

export function serverError(locale: Locale = DEFAULT_LOCALE, detail?: string): NextResponse {
  const message = getStrings(locale).errors.SERVER_ERROR;
  return NextResponse.json({ error: detail ? `${message} — ${detail}` : message }, { status: 500 });
}

/** Sažetak zod grešaka: "weekend_price_cents: Expected number, received nan". */
export function describeIssues(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  return error.issues.map((i) => `${i.path.join('.') || '(tijelo)'}: ${i.message}`).join('; ');
}
