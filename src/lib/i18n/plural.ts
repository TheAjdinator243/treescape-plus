/**
 * Množina — jedno mjesto za sva tri jezika.
 *
 * Kategorije (`one`, `few`, `two`…) ne pogađamo sami nego ih daje
 * `Intl.PluralRules`, koji nosi CLDR pravila za svaki jezik:
 *
 *   · bosanski — 1 dan, 2 dana, 5 dana, 21 dan, 11 dana
 *   · engleski — 1 day, 2 days
 *   · arapski  — 0 ضيف، 1 ضيف، 2 ضيفان، 3 ضيوف، 11 ضيفًا
 *
 * Ranije je ovdje stajala ručno pisana bosanska funkcija. Radila je tačno, ali
 * je znala samo bosanski — a arapski ima šest oblika, ne tri.
 */

import { intlTag, type Locale } from './config';
import type { PluralForms } from './dictionary';

/** `Intl.PluralRules` je skup, a jezika je troje — pravi se jednom pa se čuva. */
const rules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale): Intl.PluralRules {
  let cached = rules.get(locale);
  if (!cached) {
    cached = new Intl.PluralRules(intlTag(locale));
    rules.set(locale, cached);
  }
  return cached;
}

/** Pravi oblik riječi za dati broj. */
export function pluralForm(locale: Locale, n: number, forms: PluralForms): string {
  const category = rulesFor(locale).select(n);
  return forms[category] ?? forms.other;
}

/** Broj i riječ zajedno — "3 dana", "3 days", "3 أيام". */
export function count(locale: Locale, n: number, forms: PluralForms): string {
  return `${n} ${pluralForm(locale, n, forms)}`;
}

/**
 * Riječi koje se broje kroz cijeli sajt.
 *
 * Stoje ovdje, a ne u rječnicima, da se ista tabela može koristiti i iz
 * `common` i iz poruka o greškama bez prepisivanja.
 */
export const plural: Record<Locale, { days: PluralForms; guests: PluralForms }> = {
  bs: {
    days: { one: 'dan', few: 'dana', other: 'dana' },
    guests: { one: 'gost', few: 'gosta', other: 'gostiju' },
  },
  en: {
    days: { one: 'day', other: 'days' },
    guests: { one: 'guest', other: 'guests' },
  },
  ar: {
    days: { zero: 'يوم', one: 'يوم', two: 'يومان', few: 'أيام', many: 'يومًا', other: 'يوم' },
    guests: { zero: 'ضيف', one: 'ضيف', two: 'ضيفان', few: 'ضيوف', many: 'ضيفًا', other: 'ضيف' },
  },
};
