import { LOCALE_COOKIE, LOCALE_MAX_AGE, directionOf, type Locale } from '@/lib/i18n';

/**
 * Pamćenje odabranog jezika u pregledniku.
 *
 * Jezik sada stoji u adresi, pa kolačić više ne odlučuje šta se vidi na
 * stranici. Ostaje mu troje, i sve troje je stvarno:
 *
 *  1. goli `/` — s kolačićem se ide pravo na svoj jezik, bez pitanja;
 *  2. stari linkovi bez jezika (`/uslovi`, `/rezervacija/<token>`) — po njemu
 *     se zna na koju verziju ih preusmjeriti;
 *  3. mailovi i poruke o greškama iz API-ja, gdje adrese nema.
 *
 * `lang` i `dir` se mijenjaju odmah, ručno: bez toga bi stranica na trenutak
 * stajala s arapskim tekstom u lijevo-desnom rasporedu, dok ne stigne odgovor
 * servera.
 */
export function rememberLocale(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
  document.documentElement.lang = locale;
  document.documentElement.dir = directionOf(locale);
}
