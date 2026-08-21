import 'server-only';

import { daysBetween, todayStr } from './dates';
import type { Booking } from './types';

/**
 * Brojke o poslu, izračunate iz rezervacija koje već postoje.
 *
 * Ništa se ne upisuje niti čuva posebno: sve ovo je pogled na `bookings`.
 * Zbog toga su brojke uvijek tačne i uvijek se slažu sa spiskom rezervacija —
 * nema drugog izvora koji bi se s njim mogao razići.
 *
 * ── Šta se računa kao zarada ──────────────────────────────────────────────
 * Samo `confirmed`. Zahtjev koji čeka odgovor NIJE novac: gost se predomisli,
 * domaćin odbije, termin istekne. Prikazivati ga kao zaradu značilo bi
 * pokazati broj koji nikad nije stigao na račun.
 *
 * `blocked` (datumi koje je vlasnik sam zatvorio) i `test` se ne broje nigdje —
 * ni u zaradi, ni u broju rezervacija, ni u popunjenosti. To nisu gosti.
 */

export interface MoneyStats {
  /** Potvrđeno i naplativo, po rasponima. U centima. */
  earnedAllTime: number;
  earnedThisYear: number;
  earnedThisMonth: number;
  /** Potvrđeno, ali boravak još nije počeo — novac koji tek dolazi. */
  upcomingCents: number;

  confirmedCount: number;
  /** Zahtjevi koji još čekaju odluku. */
  pendingCount: number;
  /** Koliko je zahtjeva odbijeno ili je isteklo. */
  lostCount: number;
  /** Udio potvrđenih u svim zahtjevima gostiju, 0–1. */
  conversion: number;

  nightsSold: number;
  /** Prosječna cijena po danu boravka, u centima. */
  averageNightlyCents: number;
  /** Prosječna dužina boravka, u danima. */
  averageStayDays: number;
  /** Prosječna vrijednost jedne rezervacije, u centima. */
  averageBookingCents: number;

  /** Popunjenost narednih 90 dana, 0–1. */
  occupancy90: number;

  /** Zarada po mjesecu, posljednjih 12 — za traku. */
  monthly: { month: string; cents: number; bookings: number }[];

  /** Koliko rezervacija po jeziku gosta. */
  byLocale: { locale: string; count: number }[];
  /** Koliko rezervacija po načinu plaćanja. */
  byMethod: { method: string; count: number }[];

  currency: string;
}

/** Rezervacije pravih gostiju — bez zatvorenih datuma i bez testova. */
function guestBookings(all: Booking[]): Booking[] {
  return all.filter((b) => b.status !== 'blocked' && b.payment_method !== 'test');
}

export function buildMoneyStats(all: Booking[], currency: string): MoneyStats {
  const guests = guestBookings(all);
  const confirmed = guests.filter((b) => b.status === 'confirmed');

  const today = todayStr();
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);

  const sum = (list: Booking[]) => list.reduce((n, b) => n + (b.total_cents ?? 0), 0);

  /*
   * Rezervacija pripada mjesecu u kojem POČINJE boravak, a ne onom u kojem je
   * napravljena. Vlasnik gleda kada mu je kuća radila; da se broji po datumu
   * upisa, decembarska rezervacija za juli bi ispala decembarska zarada.
   */
  const startsIn = (list: Booking[], prefix: string) =>
    list.filter((b) => b.start_date.startsWith(prefix));

  const nights = confirmed.reduce((n, b) => n + daysBetween(b.start_date, b.end_date), 0);

  const upcoming = confirmed.filter((b) => b.start_date >= today);

  // Popunjenost: koliko je od narednih 90 dana zauzeto potvrđenim boravkom.
  const horizon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  const daysAhead = confirmed.reduce((n, b) => {
    const from = b.start_date > today ? b.start_date : today;
    const to = b.end_date < horizon ? b.end_date : horizon;
    return to > from ? n + daysBetween(from, to) : n;
  }, 0);

  const monthly: MoneyStats['monthly'] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const inMonth = startsIn(confirmed, key);
    monthly.push({ month: key, cents: sum(inMonth), bookings: inMonth.length });
  }

  const tally = (pick: (b: Booking) => string | null) => {
    const map = new Map<string, number>();
    for (const b of guests) {
      const key = pick(b);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const lost = guests.filter((b) => b.status === 'cancelled' || b.status === 'expired').length;
  const pending = guests.filter((b) => b.status.startsWith('pending')).length;

  return {
    earnedAllTime: sum(confirmed),
    earnedThisYear: sum(startsIn(confirmed, year)),
    earnedThisMonth: sum(startsIn(confirmed, month)),
    upcomingCents: sum(upcoming),

    confirmedCount: confirmed.length,
    pendingCount: pending,
    lostCount: lost,
    conversion: guests.length > 0 ? confirmed.length / guests.length : 0,

    nightsSold: nights,
    averageNightlyCents: nights > 0 ? Math.round(sum(confirmed) / nights) : 0,
    averageStayDays: confirmed.length > 0 ? Math.round((nights / confirmed.length) * 10) / 10 : 0,
    averageBookingCents: confirmed.length > 0 ? Math.round(sum(confirmed) / confirmed.length) : 0,

    occupancy90: Math.min(1, daysAhead / 90),

    monthly,
    byLocale: tally((b) => b.locale).map((e) => ({ locale: e.key, count: e.count })),
    byMethod: tally((b) => b.payment_method).map((e) => ({ method: e.key, count: e.count })),

    currency,
  };
}
