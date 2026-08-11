'use client';

import { createContext, useContext, useMemo } from 'react';

import { directionOf, getStrings, type Direction, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n';

interface I18n {
  locale: Locale;
  dir: Direction;
  t: Dictionary;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * Jezik za klijentske komponente.
 *
 * Kroz granicu server → klijent putuje samo oznaka jezika; rječnik se pravi
 * ovdje, iz koda koji je preglednik ionako preuzeo. Da se prenosio cijeli
 * rječnik, funkcije u njemu (množina, brojači) ne bi preživjele serijalizaciju.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18n>(
    () => ({ locale, dir: directionOf(locale), t: getStrings(locale) }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n se može zvati samo unutar <LocaleProvider>.');
  return value;
}
