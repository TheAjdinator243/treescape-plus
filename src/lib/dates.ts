/**
 * Datumi se kroz cijelu aplikaciju prenose kao obični stringovi 'YYYY-MM-DD'.
 *
 * Razlog: `new Date('2026-08-05')` JavaScript tumači kao ponoć po UTC-u, pa u
 * Sarajevu (UTC+1/+2) ispadne 4. avgust. Za rezervacije je to katastrofa —
 * gost odabere 5., a u bazi završi 4. Zato: string u bazi, string u API-ju,
 * string u stanju komponente, a pravi `Date` se pravi samo za prikaz.
 */

import { format, type Locale as DateFnsLocale } from 'date-fns';
import { ar, bs, enGB } from 'date-fns/locale';

import { DEFAULT_LOCALE, type Locale } from './i18n/config';

/** Datum bez vremena, u obliku 'YYYY-MM-DD'. */
export type DateStr = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(value: unknown): value is DateStr {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = fromDateStr(value);
  return !Number.isNaN(d.getTime()) && toDateStr(d) === value;
}

/** `Date` (lokalna vremenska zona) → 'YYYY-MM-DD'. */
export function toDateStr(date: Date): DateStr {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → `Date` u lokalnoj ponoći (bez UTC pomaka). */
export function fromDateStr(value: DateStr): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function todayStr(): DateStr {
  return toDateStr(new Date());
}

export function addDaysStr(value: DateStr, days: number): DateStr {
  const d = fromDateStr(value);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** Broj dana koje boravak zauzima. 01.08 → 05.08 = 4; 01.08 → 02.08 = 1. */
export function daysBetween(start: DateStr, end: DateStr): number {
  const ms = fromDateStr(end).getTime() - fromDateStr(start).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Datumi koji se stvarno naplaćuju: [start, end) — dan odlaska ne ulazi.
 * Isti dogovor koji koristi i `daterange(..., '[)')` u bazi.
 */
export function eachDay(start: DateStr, end: DateStr): DateStr[] {
  const days: DateStr[] = [];
  let cursor = start;
  // Zaštita od beskonačne petlje ako neko pošalje end < start.
  let guard = 0;
  while (cursor < end && guard++ < 3650) {
    days.push(cursor);
    cursor = addDaysStr(cursor, 1);
  }
  return days;
}

/** Da li se dva raspona [aStart, aEnd) i [bStart, bEnd) preklapaju. */
export function rangesOverlap(
  aStart: DateStr,
  aEnd: DateStr,
  bStart: DateStr,
  bEnd: DateStr
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Da li datum pada unutar raspona [start, end). */
export function isWithin(date: DateStr, start: DateStr, end: DateStr): boolean {
  return date >= start && date < end;
}

/**
 * Subota ili nedjelja.
 *
 * `getDay()` vraća 0 za nedjelju i 6 za subotu. Računa se iz LOKALNOG datuma
 * (`fromDateStr` pravi lokalnu ponoć), pa vikend ostaje vikend bez obzira na
 * to u kojoj se vremenskoj zoni vrti server — a Vercel ga vrti u UTC-u.
 */
export function isWeekend(date: DateStr): boolean {
  const day = fromDateStr(date).getDay();
  return day === 0 || day === 6;
}

// ── Jezik ──────────────────────────────────────────────────────────────────

/**
 * Bosanski mjeseci u date-fns-u nisu bosanski nego srpski: "avgust" umjesto
 * "august". Standardni bosanski jezik zna samo za "august", pa se ta dva
 * mjeseca (puni i skraćeni oblik) ovdje ispravljaju.
 *
 * Zakrpa je izdvojena u funkciju jer je treba i kalendar, koji svoj `bs`
 * dobija od react-day-picker-a (isti date-fns objekat, plus prevedene ARIA
 * oznake koje ne želimo izgubiti).
 */
const BS_MONTHS_WIDE = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
];

const BS_MONTHS_ABBREVIATED = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

export function withBosnianMonths<T extends DateFnsLocale>(base: T): T {
  return {
    ...base,
    localize: {
      ...base.localize,
      month: ((index: number, options?: { width?: string }) => {
        if (options?.width === 'narrow') return base.localize.month(index as never, options as never);
        const names = options?.width === 'abbreviated' ? BS_MONTHS_ABBREVIATED : BS_MONTHS_WIDE;
        return names[index] ?? base.localize.month(index as never, options as never);
      }) as T['localize']['month'],
    },
  };
}

const DATE_LOCALES: Record<Locale, DateFnsLocale> = {
  bs: withBosnianMonths(bs),
  en: enGB,
  ar,
};

export function dateLocale(locale: Locale): DateFnsLocale {
  return DATE_LOCALES[locale] ?? DATE_LOCALES[DEFAULT_LOCALE];
}

// ── Prikaz ─────────────────────────────────────────────────────────────────

/**
 * Obrasci se razlikuju po jeziku, i to ne samo po nazivima mjeseci: bosanski
 * iza rednog broja i godine piše tačku ("5. august 2026."), engleski i arapski
 * ne pišu ništa.
 */
interface Patterns {
  long: string;
  short: string;
  /** Skraćeni oblik s godinom — samo za raspone koji prelaze iz jedne godine u drugu. */
  shortWithYear: string;
  numeric: string;
  dateTime: string;
}

const PATTERNS: Record<Locale, Patterns> = {
  bs: {
    long: 'd. MMMM yyyy.',
    short: 'd. MMM',
    shortWithYear: 'd. MMM yyyy.',
    numeric: 'd.M.yyyy.',
    dateTime: 'd.M.yyyy. HH:mm',
  },
  en: {
    long: 'd MMMM yyyy',
    short: 'd MMM',
    shortWithYear: 'd MMM yyyy',
    numeric: 'd/M/yyyy',
    dateTime: 'd/M/yyyy HH:mm',
  },
  ar: {
    long: 'd MMMM yyyy',
    short: 'd MMM',
    shortWithYear: 'd MMM yyyy',
    numeric: 'd/M/yyyy',
    dateTime: 'd/M/yyyy HH:mm',
  },
};

function patterns(locale: Locale) {
  return PATTERNS[locale] ?? PATTERNS[DEFAULT_LOCALE];
}

/** npr. "5. august 2026." */
export function formatLong(value: DateStr, locale: Locale = DEFAULT_LOCALE): string {
  return format(fromDateStr(value), patterns(locale).long, { locale: dateLocale(locale) });
}

/** npr. "5.8.2026." */
export function formatNumeric(value: DateStr, locale: Locale = DEFAULT_LOCALE): string {
  return format(fromDateStr(value), patterns(locale).numeric, { locale: dateLocale(locale) });
}

/** npr. "5. aug – 9. aug 2026." */
export function formatRange(
  start: DateStr,
  end: DateStr,
  locale: Locale = DEFAULT_LOCALE
): string {
  const a = fromDateStr(start);
  const b = fromDateStr(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const { short, shortWithYear } = patterns(locale);
  const options = { locale: dateLocale(locale) };
  const left = format(a, sameYear ? short : shortWithYear, options);
  const right = format(b, shortWithYear, options);
  return `${left} – ${right}`;
}

export function formatDateTime(
  value: string | Date,
  locale: Locale = DEFAULT_LOCALE
): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return format(d, patterns(locale).dateTime, { locale: dateLocale(locale) });
}
