import { NextResponse } from 'next/server';

import { requireDatabase } from '@/lib/api-helpers';
import { getBookingByToken } from '@/lib/booking-service';
import { localeFromRequest } from '@/lib/i18n';

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
export async function GET(request: Request) {
  const locale = localeFromRequest(request);

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
