/** Oblici podataka koji putuju između baze, servera i preglednika. */

import type { DateStr } from './dates';

export type BookingStatus =
  | 'pending_payment' // čeka online uplatu (za budući domaći procesor)
  | 'pending_cash' // gotovina, čeka odobrenje vlasnika
  | 'pending_transfer' // čeka da uplata legne na račun vlasnika
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'blocked';

/** 'card' je rezervisan za budući domaći procesor (Monri, WSPay, PaySpot). */
export type PaymentMethod = 'card' | 'cash' | 'bank_transfer' | 'test' | 'none';

/** Statusi koji drže termin zauzetim. */
export const BLOCKING_STATUSES: BookingStatus[] = [
  'pending_payment',
  'pending_cash',
  'pending_transfer',
  'confirmed',
  'blocked',
];

export type SlotKind = 'booked' | 'pending' | 'blocked';

/** Jedino što preglednik smije vidjeti o tuđim rezervacijama: datumi. */
export interface AvailabilitySlot {
  booking_id: number;
  start_date: DateStr;
  end_date: DateStr;
  kind: SlotKind;
}

export interface RatePeriod {
  id: string;
  name: string;
  start_date: DateStr;
  end_date: DateStr;
  nightly_price_cents: number;
  min_nights: number | null;
  priority: number;
}

export interface Settings {
  id: number;
  default_nightly_cents: number;
  /** Cijena za subotu i nedjelju. 0 = vikend nema posebnu cijenu. */
  weekend_price_cents: number;
  cleaning_fee_cents: number;
  currency: string;
  currency_symbol: string;
  min_nights: number;
  max_nights: number;
  max_guests: number;
  checkin_time: string;
  checkout_time: string;
  hold_minutes: number;
  // Bankovni podaci — gost ih vidi na potvrdi kad plaća na račun.
  bank_account_name: string;
  bank_name: string;
  bank_iban: string;
  transfer_days: number;
}

export interface Booking {
  id: number;
  booking_public_link: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guests: number | null;
  note: string | null;
  start_date: DateStr;
  end_date: DateStr;
  status: BookingStatus;
  payment_method: PaymentMethod;
  total_cents: number;
  currency: string;
  price_breakdown: PriceBreakdown | null;
  payment_reference: string | null;
  payment_id: string | null;
  hold_expires_at: string | null;
  admin_note: string | null;
  /** Jezik na kojem je gost rezervisao — na njemu mu stižu i svi mailovi. */
  locale: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayPrice {
  date: DateStr;
  cents: number;
  /** Naziv sezone koja je odredila cijenu, ili null za osnovnu cijenu. */
  periodName: string | null;
}

export interface PriceBreakdown {
  days: DayPrice[];
  dayCount: number;
  totalCents: number;
  averageDailyCents: number;
  currency: string;
  currencySymbol: string;
}

/** Podaci koje početna stranica dobije sa servera pri prvom učitavanju. */
export interface BookingContext {
  slots: AvailabilitySlot[];
  periods: RatePeriod[];
  settings: Settings;
  /** Načini plaćanja koje gost smije vidjeti. */
  paymentMethods: PaymentMethod[];
}

export type ApiError = {
  error: string;
  code?: string;
};
