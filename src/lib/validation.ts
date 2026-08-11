import { z } from 'zod';

import { isDateStr } from './dates';

/**
 * Sve što stigne izvana prolazi kroz ovo prije nego dodirne bazu.
 *
 * Napomena: iznos NIJE dio sheme. Cijenu server računa sam, iz baze —
 * da klijent ne bi mogao poslati "total_cents: 1".
 */
export const bookingRequestSchema = z.object({
  start_date: z.string().refine(isDateStr, 'Neispravan datum dolaska'),
  end_date: z.string().refine(isDateStr, 'Neispravan datum odlaska'),
  guests: z.number().int().min(1).max(50),
  guest_name: z.string().trim().min(2).max(120),
  guest_email: z.string().trim().email().max(200),
  guest_phone: z.string().trim().min(6).max(40),
  note: z.string().trim().max(500).nullable().optional(),
  // Server ionako provjerava je li način stvarno ponuđen — ovdje samo
  // odsijecamo očigledne gluposti prije nego dođu do baze.
  payment_method: z.enum(['bank_transfer', 'cash', 'test']),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const adminLoginSchema = z.object({
  code: z.string().min(1).max(200),
  /**
   * Šestocifreni kod s telefona. Neobavezan u shemi, a obavezan u ruti kad je
   * `ADMIN_TOTP_SECRET` postavljen — tako prijava bez drugog faktora i dalje
   * radi na sajtu koji ga još nije uključio.
   *
   * Gornja granica je široka jer se kod prvo očisti od razmaka i crtica;
   * tačan oblik provjerava `verifyTotp`.
   */
  totp: z.string().trim().max(20).optional(),
});

export const blockDatesSchema = z.object({
  start_date: z.string().refine(isDateStr),
  end_date: z.string().refine(isDateStr),
  reason: z.string().trim().max(200).optional(),
});

export const bookingDecisionSchema = z.object({
  /**
   * `bookings.id` je cijeli broj koji raste, a ne uuid — javni dio adrese je
   * odvojena kolona `booking_public_link`. `coerce` je tu jer broj kroz JSON
   * i kroz parametre adrese zna stići i kao tekst.
   */
  booking_id: z.coerce.number().int().positive(),
  decision: z.enum(['approve', 'reject']),
  /**
   * Razlog odbijanja — gost ga dobija u mailu. Neobavezan: domaćin ga smije
   * preskočiti, i tada u mailu jednostavno nema tog dijela.
   */
  reason: z.string().trim().max(300).optional(),
});

/**
 * Gost otkazuje svoju rezervaciju.
 *
 * Razlog je OBAVEZAN, za razliku od odbijanja iz administracije. Domaćin
 * odgovara gostu i tako, a gost koji ode bez riječi ostavlja vlasnika da
 * pogađa je li našao jeftinije, je li mu se nešto desilo, ili je nešto na
 * sajtu pošlo po zlu.
 */
export const guestCancelSchema = z.object({
  token: z.string().min(10).max(100),
  reason: z.string().trim().min(3).max(300),
});

export const settingsSchema = z.object({
  default_nightly_cents: z.number().int().min(0).max(100_000_00),
  // 0 je dozvoljena i znači "vikend ide po osnovnoj cijeni".
  weekend_price_cents: z.number().int().min(0).max(100_000_00),
  cleaning_fee_cents: z.number().int().min(0).max(100_000_00),
  min_nights: z.number().int().min(1).max(60),
  max_nights: z.number().int().min(1).max(365),
  max_guests: z.number().int().min(1).max(50),
  hold_minutes: z.number().int().min(5).max(240),
  currency: z.string().trim().length(3),
  currency_symbol: z.string().trim().min(1).max(5),
  checkin_time: z.string().regex(/^\d{2}:\d{2}$/),
  checkout_time: z.string().regex(/^\d{2}:\d{2}$/),
  bank_account_name: z.string().trim().max(140),
  bank_name: z.string().trim().max(140),
  // Prazan IBAN je dozvoljen i znači "ne nudi plaćanje na račun".
  bank_iban: z
    .string()
    .trim()
    .max(40)
    .refine(
      (v) => v === '' || /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(v.replace(/\s/g, '').toUpperCase()),
      'IBAN nije ispravnog oblika (npr. BA391234567890123456)'
    ),
  transfer_days: z.number().int().min(1).max(30),
});

export const ratePeriodSchema = z.object({
  name: z.string().trim().min(1).max(80),
  start_date: z.string().refine(isDateStr),
  end_date: z.string().refine(isDateStr),
  nightly_price_cents: z.number().int().min(0).max(100_000_00),
  min_nights: z.number().int().min(1).max(60).nullable(),
  priority: z.number().int().min(0).max(1000),
});
