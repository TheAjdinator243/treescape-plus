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
export function requireDatabase(locale: Locale = DEFAULT_LOCALE): NextResponse | null {
  if (isDatabaseConfigured) return null;

  return NextResponse.json({ error: getStrings(locale).errors.DATABASE_MISSING }, { status: 503 });
}

/** Sigurno čitanje JSON tijela — neispravan JSON ne smije rušiti rutu. */
export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
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
  return NextResponse.json(
    { error: detail ? `${message} — ${detail}` : message },
    { status: 400 }
  );
}

export function serverError(locale: Locale = DEFAULT_LOCALE, detail?: string): NextResponse {
  const message = getStrings(locale).errors.SERVER_ERROR;
  return NextResponse.json(
    { error: detail ? `${message} — ${detail}` : message },
    { status: 500 }
  );
}

/** Sažetak zod grešaka: "weekend_price_cents: Expected number, received nan". */
export function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .map((i) => `${i.path.join('.') || '(tijelo)'}: ${i.message}`)
    .join('; ');
}
