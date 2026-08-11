import 'server-only';

import { cookies, headers } from 'next/headers';

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  normalizeLocale,
  type Locale,
} from './config';
import { getStrings } from './index';
import type { Dictionary } from './dictionary';

/**
 * Jezik za serverske komponente.
 *
 * Redoslijed je bitan: izričit izbor iz kolačića uvijek pobjeđuje ono što
 * preglednik nagađa. Ko je jednom kliknuo "English", ne želi da mu se sajt
 * vrati na bosanski samo zato što mu je Windows na tom jeziku.
 *
 * Napomena: `cookies()` čini cijelo stablo dinamičnim. Ovdje to ništa ne
 * mijenja — sve stranice su ionako `force-dynamic`, jer dostupnost termina ne
 * smije biti keširana.
 */
export async function getLocale(): Promise<Locale> {
  const chosen = await getChosenLocale();
  if (chosen) return chosen;

  const headerStore = await headers();
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
