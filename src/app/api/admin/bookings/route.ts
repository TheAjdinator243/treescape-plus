import { after, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-guard';
import {
  describeIssues,
  invalidInput,
  readJson,
  requireDatabase,
  serverError,
} from '@/lib/api-helpers';
import { sendGuestCancelled, sendGuestCashApproved, sendGuestCashRejected } from '@/lib/email';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Booking } from '@/lib/types';
import { bookingDecisionSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Odluka vlasnika o zahtjevu za plaćanje gotovinom.
 *
 * Odobreno → termin ostaje zauzet i postaje potvrđen.
 * Odbijeno → termin se OSLOBAĐA i odmah je opet dostupan drugim gostima
 *            (okidač u bazi sam briše red iz availability_slots).
 */
export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const parsed = bookingDecisionSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidInput(locale, describeIssues(parsed.error));

  const { booking_id, decision, reason } = parsed.data;
  const nextStatus = decision === 'approve' ? 'confirmed' : 'cancelled';

  const { data, error } = await supabaseAdmin()
    .from('bookings')
    // Razlog ide i u bazu, ne samo u mail: za mjesec dana niko se neće sjećati
    // zašto je termin odbijen, a u administraciji je to jedini trag.
    .update({
      status: nextStatus,
      hold_expires_at: null,
      ...(reason ? { admin_note: reason } : {}),
    })
    .eq('id', booking_id)
    // Odlučuje se samo o onome što zaista čeka — ovo sprječava da dvostruki
    // klik ili stara otvorena kartica ponovo "odobri" nešto već riješeno.
    .in('status', ['pending_cash', 'pending_transfer'])
    .select()
    .maybeSingle();

  if (error) {
    console.error('[treescape] odluka o rezervaciji nije upisana:', error.message);
    return serverError(locale, error.message);
  }

  if (!data) {
    return NextResponse.json(
      { error: getStrings(locale).errors.ALREADY_RESOLVED },
      { status: 409 }
    );
  }

  const booking = data as Booking;

  /**
   * Mail gostu ide kroz `after`, a NE kao goli `void`.
   *
   * Ovo je ista greška koja je već jednom popravljena u ruti za rezervaciju, a
   * ovdje je ostala — i zato gost nije dobijao obavijest o odobrenju. Čim se
   * odgovor pošalje, Vercel smije zamrznuti i ugasiti funkciju, a sve što je
   * tada još u zraku nestane s njom. Mail ne stigne ni otići, i nigdje se ne
   * pojavi greška: u administraciji piše da je odobreno, jer jeste — u bazi.
   *
   * `after` platformi kaže da funkciju drži živom dok se posao ne završi.
   */
  after(() =>
    decision === 'approve' ? sendGuestCashApproved(booking) : sendGuestCashRejected(booking, reason)
  );

  return NextResponse.json({ ok: true, status: nextStatus });
}

/** Otkazivanje potvrđene rezervacije ili oslobađanje blokiranog termina. */
export async function DELETE(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const url = new URL(request.url);

  /**
   * `id` je cijeli broj. Kroz adresu stiže kao tekst, pa se izričito provjeri:
   * bez ovoga bi `?id=abc` otišao do baze i vratio se kao gola greška 500
   * umjesto uredne poruke da je zahtjev neispravan.
   */
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) return invalidInput(locale);

  const reason = (url.searchParams.get('reason') ?? '').trim().slice(0, 300) || undefined;

  const { data, error } = await supabaseAdmin()
    .from('bookings')
    .update({ status: 'cancelled', ...(reason ? { admin_note: reason } : {}) })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[treescape] otkazivanje nije uspjelo:', error.message);
    return serverError(locale, error.message);
  }

  /**
   * Gost se OBAVEZNO obavještava o otkazivanju.
   *
   * Ranije se ovdje nije slalo ništa: termin bi se u bazi oslobodio, a gost bi
   * i dalje mislio da dolazi — i to nakon što je već dobio potvrdu. Najgori
   * mogući ishod, jer se otkriva tek na vratima.
   *
   * Isti put služi i za oslobađanje ručno blokiranog termina; tamo nema gosta
   * ni adrese, pa `sendGuestCancelled` sam odustane.
   */
  if (data) after(() => sendGuestCancelled(data as Booking, reason));

  return NextResponse.json({ ok: true });
}
