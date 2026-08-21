import { NextResponse } from 'next/server';

import { rateLimitKey } from '@/lib/client-ip';
import { getAvailability } from '@/lib/data';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { consumeRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Koliko puta jedna adresa smije pitati za kalendar.
 *
 * Ruta je javna i bez ograničenja je bila: svaki poziv je čitanje iz baze, a
 * odgovor se namjerno ne kešira. Petlja s jednog računara time troši tuđu
 * kvotu na Supabaseu i drži bazu zauzetom, bez ijedne ukradene lozinke i bez
 * ijednog upisanog reda.
 *
 * Granica je namjerno visoka. Kalendar se otvara više puta dok gost bira
 * datume, a stranica ga osvježava pri povratku na karticu; stotinu u minuti
 * pravi posjetilac ne dodirne ni izbliza.
 */
const MAX_CALLS = 100;
const WINDOW_MS = 60_000;

/**
 * Javna dostupnost — vraća isključivo datume, nikada podatke o gostima.
 * Koristi je kalendar kad se posjetilac vrati na karticu nakon duže pauze.
 */
export async function GET(request: Request) {
  const key = rateLimitKey(request, 'availability');

  if (key) {
    const limit = consumeRateLimit(key, MAX_CALLS, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: getStrings(localeFromRequest(request)).errors.TOO_MANY_REQUESTS },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
  }

  const slots = await getAvailability();

  return NextResponse.json({ slots }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
