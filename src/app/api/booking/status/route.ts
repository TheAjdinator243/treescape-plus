import { NextResponse } from 'next/server';

import { requireDatabase } from '@/lib/api-helpers';
import { getBookingByToken } from '@/lib/booking-service';
import { rateLimitKey } from '@/lib/client-ip';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { consumeRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Samo stanje jedne rezervacije — ništa više.
 *
 * Postoji da bi stranica s potvrdom mogla jeftino provjeravati je li domaćin
 * odlučio, bez povlačenja cijele stranice svakih petnaest sekundi.
 *
 * Zašto je ovo sigurno bez prijave: `booking_public_link` JE ključ. Ko ga ima, ionako
 * može otvoriti /rezervacija/<token> i vidjeti cijelu rezervaciju. Ovdje se ne
 * otkriva ništa što ta stranica već ne pokazuje — a vraća se samo status, bez
 * imena, adrese i telefona.
 *
 * Nepostojeći token dobija isti odgovor kao tuđi: 404, bez objašnjenja. Tako
 * se ovim putem ne može pogađati koji tokeni postoje.
 */
/**
 * Koliko često jedna adresa smije provjeravati stanje.
 *
 * Stranica s potvrdom pita svakih petnaest sekundi, dakle četiri puta u
 * minuti. Šezdeset ostavlja mjesta i za više otvorenih kartica, a zaustavlja
 * petlju koja bi istim putem gađala bazu bez prestanka.
 *
 * Pogađanje tokena ovim putem ionako ne prolazi — token je uuid v4, dakle
 * 122 bita — ali svako pitanje je i dalje čitanje iz baze koje neko plaća.
 */
const MAX_CHECKS = 60;
const WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const locale = localeFromRequest(request);

  const key = rateLimitKey(request, 'booking-status');
  if (key) {
    const limit = consumeRateLimit(key, MAX_CHECKS, WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: getStrings(locale).errors.TOO_MANY_REQUESTS },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
  }

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const booking = await getBookingByToken(token);
  if (!booking) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(
    { status: booking.status },
    // Odgovor se NE smije keširati — cijela poenta je da uhvati promjenu.
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
