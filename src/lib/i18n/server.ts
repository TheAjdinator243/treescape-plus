import 'server-only';

import { cookies, headers } from 'next/headers';

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localeFromAcceptLanguage,
  normalizeLocale,
  type Locale,
} from './config';
import { getStrings } from './index';
import type { Dictionary } from './dictionary';

/**
 * Jezik za serverske komponente.
 *
 * Redoslijed je bitan, i od uvođenja jezika u adresu ide ovako:
 *
 * 1. ADRESA. Ko otvori /en, dobija engleski — pa makar mu u kolačiću stajao
 *    bosanski. Bez ovoga podijeljen link ne bi vrijedio ništa: pošalješ /en
 *    gostu iz Emirata, a on ga otvori i vidi bosanski jer je jednom bio ovdje.
 * 2. KOLAČIĆ. Za sve što nema jezik u adresi — administracija, mailovi,
 *    poruke o greškama iz API-ja.
 * 3. Nagađanje iz preglednika, pa bosanski.
 *
 * Napomena: `headers()` i `cookies()` čine cijelo stablo dinamičnim. Ovdje to
 * ništa ne mijenja — sve stranice su ionako `force-dynamic`, jer dostupnost
 * termina ne smije biti keširana.
 */
export async function getLocale(): Promise<Locale> {
  const headerStore = await headers();

  const inPath = normalizeLocale(headerStore.get(LOCALE_HEADER));
  if (inPath) return inPath;

  const chosen = await getChosenLocale();
  if (chosen) return chosen;

  return localeFromAcceptLanguage(headerStore.get('accept-language')) ?? DEFAULT_LOCALE;
}

/**
 * Jezik koji je posjetilac IZRIČITO odabrao, ili `null` ako još nije.
 *
 * Razlika u odnosu na `getLocale()` je cijela poenta ulaznog ekrana: `null`
 * znači "ovaj čovjek još nije rekao svoj jezik, pitaj ga", dok `getLocale()`
 * uvijek vrati neki jezik jer ima na šta pasti (preglednik, pa bosanski).
 */
export async function getChosenLocale(): Promise<Locale | null> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

/** Prečica za komponente kojima trebaju i jezik i tekst. */
export async function getServerStrings(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: getStrings(locale) };
}
