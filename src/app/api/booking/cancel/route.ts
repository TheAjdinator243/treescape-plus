import { after, NextResponse } from 'next/server';

import { describeIssues, invalidInput, readJson, requireDatabase, serverError } from '@/lib/api-helpers';
import { getBookingByToken } from '@/lib/booking-service';
import { rateLimitKey } from '@/lib/client-ip';
import { requireSameOrigin } from '@/lib/csrf';
import { todayStr } from '@/lib/dates';
import { sendGuestCancelled } from '@/lib/email';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { notifyOwnerGuestCancelled } from '@/lib/notify';
import { consumeRateLimit } from '@/lib/rate-limit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Booking } from '@/lib/types';
import { guestCancelSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stanja iz kojih gost još smije odustati. */
const CANCELLABLE = ['pending_cash', 'pending_payment', 'pending_transfer', 'confirmed'];

/**
 * Token je uuid v4, pa se ne može pogoditi ni u milijardu pokušaja — ali
 * ograničenje svejedno stoji, da ova ruta ne posluži kao besplatan način da se
 * vlasniku pošalje proizvoljan broj obavijesti o otkazivanju.
 */
const MAX_CANCELS = 10;
const CANCEL_WINDOW_MS = 10 * 60_000;

/**
 * Gost sam otkazuje svoju rezervaciju, sa stranice s potvrdom.
 *
 * Ovlaštenje je `booking_public_link` — isti onaj kojim gost i otvara tu stranicu.
 * Ko ga ima, ionako vidi cijelu rezervaciju; ovdje smije i odustati od nje.
 * Ništa se ne može otkazati nasumice: token je dug i nasumičan, a `id` iz baze
 * se nigdje ne prihvata.
 */
export async function POST(request: Request) {
  const locale = localeFromRequest(request);
  const t = getStrings(locale);

  const wrongOrigin = requireSameOrigin(request, locale);
  if (wrongOrigin) return wrongOrigin;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const key = rateLimitKey(request, 'booking-cancel');
  if (key) {
    const limit = consumeRateLimit(key, MAX_CANCELS, CANCEL_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: t.errors.TOO_MANY_REQUESTS },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
  }

  const parsed = guestCancelSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidInput(locale, describeIssues(parsed.error));

  const { token, reason } = parsed.data;

  const booking = await getBookingByToken(token);
  // Nepoznat token i tuđa rezervacija dobijaju isti odgovor — inače bi se
  // ovim putem moglo pogađati koji tokeni postoje.
  if (!booking) return NextResponse.json({ error: t.errors.NOT_ALLOWED }, { status: 404 });

  // Već otkazano, isteklo ili odbijeno — nema šta da se otkazuje. Isto vrijedi
  // za boravak koji je prošao: tada je otkazivanje besmisleno, a vlasniku bi
  // stigla obavijest o terminu koji je odavno bio i prošao.
  if (!CANCELLABLE.includes(booking.status) || booking.end_date <= todayStr()) {
    return NextResponse.json({ error: t.errors.ALREADY_RESOLVED }, { status: 409 });
  }

  const { error } = await supabaseAdmin()
    .from('bookings')
    .update({ status: 'cancelled', admin_note: reason })
    .eq('id', booking.id)
    // Isto osiguranje kao u administraciji: dvostruki klik ili stara otvorena
    // kartica ne smiju "otkazati" nešto što je u međuvremenu već riješeno.
    .in('status', CANCELLABLE);

  if (error) {
    // Poruka iz baze ostaje u logu. Gostu ne znači ništa, a otkriva kako je
    // sistem građen — takav detalj se šalje samo u administraciju.
    console.error('[treescape] gost nije mogao otkazati:', error.message);
    return serverError(locale);
  }

  /**
   * Obavijesti idu kroz `after` — kao i svugdje drugdje. Bez toga bi se na
   * Vercelu funkcija ugasila čim gost dobije odgovor, i vlasnik nikad ne bi
   * saznao da mu je termin oslobođen.
   *
   * Vlasnik se obavještava OBAVEZNO: ovo je jedina promjena termina koju on ne
   * pokreće, pa bi mu inače datum tiho nestao iz planova.
   */
  after(async () => {
    const cancelled = { ...booking, status: 'cancelled' } as Booking;
    await Promise.allSettled([
      sendGuestCancelled(cancelled, reason),
      notifyOwnerGuestCancelled(cancelled, reason),
    ]);
  });

  return NextResponse.json({ ok: true });
}
