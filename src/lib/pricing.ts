/**
 * Obračun cijene — jedina implementacija, koriste je i preglednik i server.
 *
 * Preglednik računa da bi gost odmah vidio iznos dok pomjera datume.
 * Server računa PONOVO, iz baze, prije nego što upiše rezervaciju. Broj koji
 * stigne od klijenta se nikada ne vjeruje — inače bi svako mogao poslati
 * `total_cents: 1` i rezervisati sedmicu za jedan fening.
 *
 * ── Jedinica je DAN, ne noćenje ────────────────────────────────────────────
 * Kuća se može uzeti i samo za jedan dan, bez spavanja. Zato se sve broji u
 * danima koje boravak zauzima, a raspon je [dolazak, odlazak):
 *
 *   · jedan dan (10.08)          → [10.08, 11.08) = 1 dan
 *   · od 10.08 do 12.08          → [10.08, 12.08) = 2 dana
 *
 * Dan odlaska ostaje slobodan za sljedećeg gosta — što se lijepo poklapa s
 * odjavom u 09:00 i prijavom u 11:00 istog dana.
 */

import {
  addDaysStr,
  daysBetween,
  eachDay,
  isWeekend,
  isWithin,
  todayStr,
  type DateStr,
} from './dates';
import { DEFAULT_LOCALE, getStrings, intlTag, type Locale } from './i18n';
import type { AvailabilitySlot, PriceBreakdown, RatePeriod, Settings } from './types';

/**
 * Cijena za jedan dan, po ovom redoslijedu:
 *
 *   1. sezona s najvećim `priority` koja pokriva taj datum
 *   2. vikend cijena, ako je subota ili nedjelja i ako je uključena
 *   3. osnovna cijena iz postavki
 *
 * Sezona je iznad vikenda namjerno. Vlasnik je sezonu upisao za tačno te
 * datume i za tu cijenu; da je vikend nadglasa, ljetna subota bi se najednom
 * naplaćivala jeftinije od ljetnog utorka.
 */
function rateForDay(
  day: DateStr,
  periods: RatePeriod[],
  settings: Settings
): { cents: number; periodName: string | null } {
  let winner: RatePeriod | null = null;

  for (const period of periods) {
    if (!isWithin(day, period.start_date, period.end_date)) continue;
    if (!winner || period.priority > winner.priority) winner = period;
  }

  if (winner) {
    return { cents: winner.nightly_price_cents, periodName: winner.name };
  }

  // 0 znači "vikend nema posebnu cijenu".
  if (settings.weekend_price_cents > 0 && isWeekend(day)) {
    return { cents: settings.weekend_price_cents, periodName: WEEKEND_PERIOD };
  }

  return { cents: settings.default_nightly_cents, periodName: null };
}

/**
 * Oznaka koju vikend dan nosi u razradi cijene.
 *
 * Nije naziv sezone nego ključ: sučelje po njemu zna da red treba ispisati na
 * jeziku gosta, a ne onako kako je vlasnik nazvao sezonu.
 */
export const WEEKEND_PERIOD = 'weekend';

/** Puni obračun za boravak [start, end). Dan odlaska se ne naplaćuje. */
export function quoteStay(
  start: DateStr,
  end: DateStr,
  periods: RatePeriod[],
  settings: Settings
): PriceBreakdown {
  const days = eachDay(start, end).map((date) => {
    const rate = rateForDay(date, periods, settings);
    return { date, cents: rate.cents, periodName: rate.periodName };
  });

  const totalCents = days.reduce((sum, d) => sum + d.cents, 0);

  return {
    days,
    dayCount: days.length,
    totalCents,
    averageDailyCents: days.length ? Math.round(totalCents / days.length) : 0,
    currency: settings.currency,
    currencySymbol: settings.currency_symbol,
  };
}

export type ValidationResult = { ok: true } | { ok: false; code: string; message: string };

/**
 * Sva pravila boravka na jednom mjestu. Server ovo pokreće obavezno;
 * klijent iz uljudnosti, da gost ne klikne pa tek onda sazna za problem.
 *
 * Minimalnog broja dana NEMA — može se rezervisati i jedan jedini dan.
 */
export function validateStay(
  start: DateStr,
  end: DateStr,
  guests: number,
  periods: RatePeriod[],
  settings: Settings,
  locale: Locale = DEFAULT_LOCALE
): ValidationResult {
  const t = getStrings(locale);

  if (end <= start) {
    return { ok: false, code: 'INVALID_RANGE', message: t.errors.INVALID_RANGE };
  }

  if (start < todayStr()) {
    return { ok: false, code: 'PAST_DATE', message: t.errors.PAST_DATE };
  }

  if (daysBetween(start, end) > settings.max_nights) {
    return { ok: false, code: 'MAX_DAYS', message: t.errors.MAX_DAYS(settings.max_nights) };
  }

  if (!Number.isInteger(guests) || guests < 1) {
    return { ok: false, code: 'INVALID_INPUT', message: t.errors.INVALID_INPUT };
  }

  if (guests > settings.max_guests) {
    return {
      ok: false,
      code: 'TOO_MANY_GUESTS',
      message: t.errors.TOO_MANY_GUESTS(settings.max_guests),
    };
  }

  return { ok: true };
}

/**
 * Da li raspon dodiruje ijedan zauzet termin.
 *
 * Ovo je samo za prijateljsku poruku u sučelju. Pravu odbranu od dvostrukog
 * bookinga radi EXCLUDE ograničenje u bazi — ovdje se utrka može izgubiti,
 * tamo ne može.
 */
export function rangeHasConflict(start: DateStr, end: DateStr, slots: AvailabilitySlot[]): boolean {
  return slots.some((slot) => start < slot.end_date && slot.start_date < end);
}

/** Skup pojedinačnih zauzetih dana — kalendar ih tako najlakše iscrtava. */
export function takenDayMap(slots: AvailabilitySlot[]): Map<DateStr, 'hard' | 'pending'> {
  const map = new Map<DateStr, 'hard' | 'pending'>();

  for (const slot of slots) {
    const level = slot.kind === 'pending' ? 'pending' : 'hard';
    for (const day of eachDay(slot.start_date, slot.end_date)) {
      // Potvrđeno uvijek nadjačava rezervisano-u-toku.
      if (level === 'hard' || !map.has(day)) map.set(day, level);
    }
  }

  return map;
}

/**
 * Prvi dan od danas koji nije zauzet — za "slobodno od 14. augusta" u heroju.
 *
 * Ovo je jedini podatak na naslovnom ekranu koji se mijenja sam od sebe, pa
 * mora biti tačan: gost koji pročita datum, klikne i zatekne ga prekriženim u
 * kalendaru izgubi povjerenje u cijeli kalendar.
 *
 * Traži se najviše dvije godine unaprijed — koliko i `getAvailability` čita iz
 * baze. Dalje od toga nema šta ni da se nađe, pa je granica ujedno i zaštita
 * od beskonačne petlje ako bi neko blokirao sve datume.
 */
export function firstFreeDate(
  slots: AvailabilitySlot[],
  from: DateStr = todayStr()
): DateStr | null {
  const taken = takenDayMap(slots);

  let day = from;
  for (let i = 0; i <= 730; i++) {
    if (!taken.has(day)) return day;
    day = addDaysStr(day, 1);
  }

  return null;
}

/**
 * Najniža dnevna cijena — za "od 180 KM po danu" u heroju.
 *
 * Vikend ulazi u račun samo ako je uključen. Obično je skuplji pa ništa ne
 * mijenja, ali ako je vlasnik postavio niži vikend, "od" mora reći istinu.
 */
export function lowestNightlyCents(periods: RatePeriod[], settings: Settings): number {
  const base =
    settings.weekend_price_cents > 0
      ? Math.min(settings.default_nightly_cents, settings.weekend_price_cents)
      : settings.default_nightly_cents;

  return periods.reduce((min, p) => Math.min(min, p.nightly_price_cents), base);
}

// ── Formatiranje novca ─────────────────────────────────────────────────────

/**
 * 18000 → "180 KM" (bez decimala kad su nule, jer tako izgleda čistije).
 *
 * Grupisanje hiljada nije svugdje isto — "1.250 KM" na bosanskom, "1,250 KM"
 * na engleskom — pa razdvajanje određuje jezik, a ne tvrdo upisano 'bs-BA'.
 */
export function formatMoney(cents: number, symbol = '€', locale: Locale = DEFAULT_LOCALE): string {
  const amount = cents / 100;
  const hasFraction = cents % 100 !== 0;
  const formatted = new Intl.NumberFormat(intlTag(locale), {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}
