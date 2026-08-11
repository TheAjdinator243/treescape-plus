import 'server-only';

import { addDaysStr, daysBetween, todayStr } from './dates';
import { getRatePeriods, getSettings, releaseExpiredHolds } from './data';
import { env } from './env';
import { DEFAULT_LOCALE, getStrings, type Locale } from './i18n';
import { methodInfo } from './payments';
import { quoteStay, validateStay } from './pricing';
import { isOverlapError, supabaseAdmin } from './supabase/admin';
import type { Booking, PaymentMethod, PriceBreakdown, Settings } from './types';
import type { BookingRequest } from './validation';

export type CreateResult =
  | { ok: true; booking: Booking; quote: PriceBreakdown; settings: Settings }
  | { ok: false; status: number; code: string; message: string };

/**
 * Pravi rezervaciju i zaključava termin.
 *
 * Redoslijed je bitan:
 *  1. oslobodi istekle termine (napuštena uplata ne smije zauvijek blokirati),
 *  2. pročitaj cjenovnik iz baze i SAM izračunaj iznos,
 *  3. provjeri pravila boravka,
 *  4. pokušaj upis — a stvarnu provjeru zauzetosti radi EXCLUDE ograničenje.
 *
 * Korak 4 je jedini koji ne može izgubiti utrku dva istovremena gosta.
 *
 * `locale` je jezik na kojem je gost popunio formu. Upisuje se uz rezervaciju
 * jer mailovi o njoj kreću i danima kasnije, kad od gosta nema više ničega.
 */
export async function createBooking(
  input: Omit<BookingRequest, 'payment_method'>,
  method: PaymentMethod,
  locale: Locale = DEFAULT_LOCALE
): Promise<CreateResult> {
  const t = getStrings(locale);

  // `force`: pred upis se ne štedi na tačnosti — vidi HOLD_SWEEP_MS u data.ts.
  await releaseExpiredHolds(true);

  const [periods, settings] = await Promise.all([getRatePeriods(), getSettings()]);

  // Način plaćanja mora biti stvarno ponuđen. Bez ove provjere bi neko mogao
  // poslati {method:'test'} i sam sebi potvrditi rezervaciju bez plaćanja.
  const info = methodInfo(method, settings, env.enableTestPayments);
  if (!info) {
    return {
      ok: false,
      status: 400,
      code: 'METHOD_UNAVAILABLE',
      message: t.errors.METHOD_UNAVAILABLE,
    };
  }

  const check = validateStay(
    input.start_date,
    input.end_date,
    input.guests,
    periods,
    settings,
    locale
  );
  if (!check.ok) {
    return { ok: false, status: 400, code: check.code, message: check.message };
  }

  const quote = quoteStay(input.start_date, input.end_date, periods, settings);

  const holdExpiresAt =
    info.holdHours === null
      ? null
      : new Date(Date.now() + info.holdHours * 3_600_000).toISOString();

  const { data, error } = await supabaseAdmin()
    .from('bookings')
    .insert({
      guest_name: input.guest_name,
      guest_email: input.guest_email,
      guest_phone: input.guest_phone,
      guests: input.guests,
      note: input.note ?? null,
      start_date: input.start_date,
      end_date: input.end_date,
      status: info.initialStatus,
      payment_method: method,
      total_cents: quote.totalCents,
      currency: quote.currency,
      price_breakdown: quote,
      hold_expires_at: holdExpiresAt,
      locale,
    })
    .select()
    .single();

  if (error) {
    // Ovdje se utrka završava: drugi gost je stigao prvi.
    if (isOverlapError(error)) {
      return { ok: false, status: 409, code: 'DATES_TAKEN', message: t.errors.DATES_TAKEN };
    }

    console.error('[treescape] upis rezervacije nije uspio:', error.message);
    return { ok: false, status: 500, code: 'SERVER_ERROR', message: t.errors.SERVER_ERROR };
  }

  return { ok: true, booking: data as Booking, quote, settings };
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  const { data, error } = await supabaseAdmin()
    .from('bookings')
    .select('*')
    .eq('booking_public_link', token)
    .maybeSingle();

  if (error) {
    console.error('[treescape] čitanje rezervacije nije uspjelo:', error.message);
    return null;
  }

  return (data as Booking) ?? null;
}

/** Ručno blokiranje termina iz administracije. */
export async function blockDates(
  startDate: string,
  endDate: string,
  reason?: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const t = getStrings(locale);

  if (endDate <= startDate) {
    return { ok: false, status: 400, message: t.errors.INVALID_RANGE };
  }

  if (daysBetween(startDate, endDate) > 365) {
    return { ok: false, status: 400, message: t.errors.MAX_DAYS(365) };
  }

  const { error } = await supabaseAdmin().from('bookings').insert({
    start_date: startDate,
    end_date: endDate,
    status: 'blocked',
    payment_method: 'none',
    admin_note: reason ?? null,
  });

  if (error) {
    if (isOverlapError(error)) {
      return { ok: false, status: 409, message: t.errors.DATES_TAKEN };
    }
    console.error('[treescape] blokiranje termina nije uspjelo:', error.message);
    return { ok: false, status: 500, message: t.errors.SERVER_ERROR };
  }

  return { ok: true };
}

/** Rezervacije za administraciju — od prije godinu dana pa nadalje. */
export async function listBookings(statuses?: string[]): Promise<Booking[]> {
  let query = supabaseAdmin()
    .from('bookings')
    .select('*')
    .gte('end_date', addDaysStr(todayStr(), -365))
    .order('start_date', { ascending: true });

  if (statuses?.length) query = query.in('status', statuses);

  const { data, error } = await query;

  if (error) {
    console.error('[treescape] čitanje rezervacija nije uspjelo:', error.message);
    return [];
  }

  return (data ?? []) as Booking[];
}
