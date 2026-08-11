/**
 * Demo podaci — koriste se SAMO dok Supabase nije podešen.
 *
 * Zahvaljujući ovome možeš pokrenuti `npm run dev` i odmah vidjeti kompletan
 * sajt sa živim kalendarom, prije nego otvoriš ijedan nalog. Čim u .env.local
 * upišeš Supabase ključeve, ovi podaci se više nigdje ne pojavljuju.
 */

import { addDaysStr, todayStr } from './dates';
import type { AvailabilitySlot, RatePeriod, Settings } from './types';

export const DEMO_SETTINGS: Settings = {
  id: 1,
  default_nightly_cents: 12000,
  weekend_price_cents: 30000,
  cleaning_fee_cents: 3000,
  currency: 'EUR',
  currency_symbol: '€',
  min_nights: 2,
  max_nights: 30,
  max_guests: 8,
  checkin_time: '15:00',
  checkout_time: '11:00',
  hold_minutes: 15,
  // Demo IBAN — dovoljno da se vidi kako izgleda stranica s podacima za uplatu.
  bank_account_name: 'TreeScape (demo)',
  bank_name: 'Demo banka d.d.',
  bank_iban: 'BA391234567890123456',
  transfer_days: 3,
};

export function demoPeriods(): RatePeriod[] {
  const year = new Date().getFullYear();
  return [
    {
      id: 'demo-summer',
      name: 'Ljetna sezona',
      start_date: `${year}-06-15`,
      end_date: `${year}-09-16`,
      nightly_price_cents: 18000,
      min_nights: 3,
      priority: 10,
    },
    {
      id: 'demo-winter',
      name: 'Zimska sezona',
      start_date: `${year}-12-15`,
      end_date: `${year + 1}-01-16`,
      nightly_price_cents: 20000,
      min_nights: 3,
      priority: 10,
    },
    {
      id: 'demo-nye',
      name: 'Nova godina',
      start_date: `${year}-12-29`,
      end_date: `${year + 1}-01-03`,
      nightly_price_cents: 26000,
      min_nights: 4,
      priority: 20,
    },
  ];
}

/** Nekoliko zauzetih termina u odnosu na današnji dan, da kalendar ne bude prazan. */
export function demoSlots(): AvailabilitySlot[] {
  const today = todayStr();
  return [
    {
      booking_id: 1,
      start_date: addDaysStr(today, 4),
      end_date: addDaysStr(today, 8),
      kind: 'booked',
    },
    {
      booking_id: 2,
      start_date: addDaysStr(today, 15),
      end_date: addDaysStr(today, 18),
      kind: 'booked',
    },
    {
      booking_id: 3,
      start_date: addDaysStr(today, 26),
      end_date: addDaysStr(today, 29),
      kind: 'pending',
    },
    {
      booking_id: 4,
      start_date: addDaysStr(today, 40),
      end_date: addDaysStr(today, 47),
      kind: 'booked',
    },
  ];
}
