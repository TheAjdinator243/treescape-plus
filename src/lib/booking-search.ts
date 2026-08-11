import { bookingReference } from './reference';
import type { Booking } from './types';

/**
 * Pretraga rezervacija u administraciji.
 *
 * Domaćin traži na tri načina, zavisno od toga šta ima pri ruci:
 *   · gost zove telefonom  → broj rezervacije koji mu je stigao u mailu
 *   · gost piše mailom     → ime ili email adresa
 *   · zove nepoznat broj   → broj telefona
 *
 * Zato jedno polje pretražuje sve odjednom, umjesto da domaćin bira
 * kategoriju prije nego zna šta traži.
 */

/** Kvačice koje `NFD` odvoji od slova (č → c + ˇ). */
const KVACICE = /[̀-ͯ]/g;

/** đ nije slovo s kvačicom nego zaseban znak — `NFD` ga ne rastavlja. */
const DJ = /đ/g;

/**
 * Svodi tekst na oblik u kojem se poređenje ne lomi na sitnicama.
 *
 * Kvačice se skidaju namjerno: domaćin traži "hodzic" jer mu je brže od
 * "Hodžić", a i gost svoje ime u mailu često napiše bez kvačica. Bez ovoga
 * bi pretraga naizgled "ne radila" baš na domaćim prezimenima.
 *
 * Kodovi znakova se pišu brojem, a ne doslovnim znakom: nevidljive kvačice
 * u izvornom kodu se lako izgube pri kopiranju ili promjeni kodne stranice.
 */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(KVACICE, '').replace(DJ, 'd').trim();
}

/** Samo cifre — da "+387 61 111 111" nađe i onaj ko ukuca "61111111". */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Sve po čemu se jedna rezervacija može naći. */
function haystack(booking: Booking): string[] {
  return [
    booking.guest_name ?? '',
    booking.guest_email ?? '',
    booking.guest_phone ?? '',
    booking.admin_note ?? '',
    String(booking.id),
    bookingReference(booking.booking_public_link),
    booking.booking_public_link,
    booking.start_date,
    booking.end_date,
  ]
    .filter(Boolean)
    .map(normalize);
}

/**
 * Da li rezervacija odgovara upitu.
 *
 * Više riječi znači da SVE moraju odgovarati, ali svaka smije pogoditi drugo
 * polje — tako "amina 2026" nađe Aminu s terminom u 2026, a da domaćin ne
 * mora pamtiti kojim se redom traži.
 */
export function matchesBookingSearch(booking: Booking, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const fields = haystack(booking);
  const phone = digitsOnly(booking.guest_phone ?? '');

  return terms.every((term) => {
    if (fields.some((field) => field.includes(term))) return true;

    // Broj telefona se poredi i bez razmaka, crtica i pozivnog znaka.
    // Prag od tri cifre je tu da "1" ne pogodi svaki broj u imeniku.
    const termDigits = digitsOnly(term);
    return termDigits.length >= 3 && phone.length > 0 && phone.includes(termDigits);
  });
}

/** Filtrirane rezervacije. Prazan upit vraća isti niz, bez kopiranja. */
export function searchBookings(bookings: Booking[], query: string): Booking[] {
  if (!query.trim()) return bookings;
  return bookings.filter((booking) => matchesBookingSearch(booking, query));
}
