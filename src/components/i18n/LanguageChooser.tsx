'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { LOCALES, directionOf, getStrings, localePath, type Locale } from '@/lib/i18n';

import { rememberLocale } from './remember';

/** Koliko svaki jezik stoji na ekranu prije nego ga smijeni sljedeći. */
const ROTATE_MS = 2400;

/**
 * Izbor jezika — jedino što stoji na golom `/`.
 *
 * Svaki jezik ima svoju adresu (/bs, /en, /ar), pa je ovo raskrsnica, a ne
 * pregrada: ko dođe s linkom na kojem jezik već piše, ovaj ekran nikad i ne
 * vidi. Ko s kolačićem otvori goli domen, prolazi kroz njega bez zaustavljanja
 * (preusmjerava ga `proxy.ts`).
 *
 * ── Zašto su ovo pravi linkovi, a ne dugmad ───────────────────────────────
 * Ranije je ovo bio ekran preko sajta koji je izbor pisao u kolačić, pa je bez
 * JavaScripta bio ćorsokak — morao se skrivati stilom. Sada su to tri obična
 * linka na tri adrese: rade i bez JavaScripta, mogu se podijeliti, i
 * pretraživač kroz njih nađe sve tri verzije sajta. Kolačić se i dalje piše na
 * klik, ali samo da se pitanje ne ponovi.
 *
 * ── Zašto se naslov smjenjuje kroz jezike ─────────────────────────────────
 * Ekran koji pita "Odaberite jezik" pomaže samo onome ko već razumije bosanski.
 * Zato pitanje kruži kroz sva tri jezika: ko god da dođe, u par sekundi vidi
 * svoj. Nazivi jezika na linkovima ionako stalno stoje u svom pismu
 * (Bosanski / English / العربية), pa se link može pogoditi i prije nego
 * pitanje dođe na red.
 *
 * Kruženje počinje od jezika koji je preglednik nagovijestio — najvjerovatniji
 * pogodak ide prvi, ostali za njim.
 */
export function LanguageChooser({ suggested }: { suggested: Locale }) {
  // Redoslijed kruženja: nagoviješteni jezik prvi, pa ostali svojim redom.
  const order = useMemo<Locale[]>(
    () => [suggested, ...LOCALES.filter((l) => l !== suggested)],
    [suggested]
  );

  const [step, setStep] = useState(0);

  const active = step % order.length;
  const shown = order[active] ?? suggested;
  const copy = getStrings(shown).language;

  useEffect(() => {
    const timer = window.setInterval(() => setStep((n) => n + 1), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-forest-900 px-5 py-12">
      <p className="font-display text-3xl text-sand-50 sm:text-4xl">TreeScape</p>

      {/* Naslov se smjenjuje, pa ga čitač ekrana ne prati — spisak jezika ispod
          miruje i njega čita normalno. */}
      <div
        key={shown}
        dir={directionOf(shown)}
        aria-hidden="true"
        className="animate-fade-rise mt-10 text-center"
      >
        <h1 className="font-display text-2xl text-sand-50 sm:text-3xl">{copy.gateTitle}</h1>
        <p className="mt-3 text-sm text-moss-300/90 sm:text-base">{copy.gateLead}</p>
      </div>

      <nav aria-label={copy.gateAria} className="mt-10 w-full max-w-xs">
        <ul className="flex flex-col gap-3">
          {LOCALES.map((locale) => (
            <li key={locale}>
              <Link
                href={localePath(locale)}
                hrefLang={locale}
                lang={locale}
                dir={directionOf(locale)}
                onClick={() => rememberLocale(locale)}
                className="block w-full rounded-2xl border border-forest-700 bg-forest-800 px-6 py-4 text-center text-lg font-medium text-sand-50 transition-colors hover:border-moss-400 hover:bg-forest-700 focus-visible:border-moss-400"
              >
                {getStrings(locale).language.names[locale]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Koji je jezik trenutno na redu — sitno, samo da se vidi da ekran radi. */}
      <ul className="mt-8 flex items-center gap-2" aria-hidden="true">
        {order.map((locale, i) => (
          <li
            key={locale}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === active ? 'w-6 bg-moss-400' : 'w-1.5 bg-forest-700'
            }`}
          />
        ))}
      </ul>
    </main>
  );
}
