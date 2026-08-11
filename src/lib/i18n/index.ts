/**
 * Ulazna tačka za prevode.
 *
 * `getStrings(locale)` je jedini način da se dođe do teksta — i na serveru i u
 * pregledniku. Rječnici su obični objekti, pa ih preglednik dobija kroz svoj
 * paket; granicu server → klijent prelazi samo oznaka jezika ('bs'), nikad
 * cijeli rječnik. Zato u rječnicima smiju stajati i funkcije (množina, datumi),
 * što ne bi bilo moguće da se prenose kao podaci.
 */

import { DEFAULT_LOCALE, type Locale } from './config';
import type { Dictionary } from './dictionary';
import { ar } from './dictionaries/ar';
import { bs } from './dictionaries/bs';
import { en } from './dictionaries/en';

const DICTIONARIES: Record<Locale, Dictionary> = { bs, en, ar };

export function getStrings(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export * from './config';
export * from './plural';
export type {
  AmenityKey,
  Dictionary,
  FaqFacts,
  PlaceKey,
  PluralForms,
  QuestionAnswer,
  Step,
} from './dictionary';
