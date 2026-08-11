'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
  directionOf,
  getStrings,
  type Locale,
} from '@/lib/i18n';

/** Koliko svaki jezik stoji na ekranu prije nego ga smijeni sljedeći. */
const ROTATE_MS = 2400;

/**
 * Ulazni ekran: pitanje o jeziku prije nego se sajt vidi.
 *
 * Postavlja se SAMO onome ko još nije birao. Čim odabere, izbor ide u kolačić
 * i ekran se više nikada ne pojavljuje — ni pri sljedećoj posjeti.
 *
 * ── Zašto se naslov smjenjuje kroz jezike ──────────────────────────────────
 * Ekran koji pita "Odaberite jezik" pomaže samo onome ko već razumije bosanski.
 * Zato pitanje kruži kroz sva tri jezika: ko god da dođe, u par sekundi vidi
 * svoj. Nazivi jezika na dugmadima ionako stalno stoje u svom pismu
 * (Bosanski / English / العربية), pa se dugme može pogoditi i prije nego
 * pitanje dođe na red.
 *
 * Kruženje počinje od jezika koji je preglednik nagovijestio — najvjerovatniji
 * pogodak ide prvi, ostali za njim.
 */
export function LanguageGate({ suggested }: { suggested: Locale }) {
  const router = useRouter();
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Redoslijed kruženja: nagoviješteni jezik prvi, pa ostali svojim redom.
  const order = useMemo<Locale[]>(
    () => [suggested, ...LOCALES.filter((l) => l !== suggested)],
    [suggested]
  );

  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Locale | null>(null);

  const active = step % order.length;
  const shown = order[active] ?? suggested;
  const copy = getStrings(shown).language;

  useEffect(() => {
    if (picked) return;
    const timer = window.setInterval(() => setStep((n) => n + 1), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [picked]);

  // Dok ekran stoji, sajt iza njega ne smije da se skrola.
  useEffect(() => {
    if (picked) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [picked]);

  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  /**
   * Zapisivanje izbora je nuspojava, pa stoji u efektu, a ne u rukovaocu klika.
   *
   * Redoslijed unutra je bitan: kolačić mora biti postavljen PRIJE nego se od
   * servera zatraži ponovno iscrtavanje — inače server odgovori po starom,
   * jer o izboru još ništa ne zna.
   */
  useEffect(() => {
    if (!picked) return;

    document.cookie = `${LOCALE_COOKIE}=${picked}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
    document.documentElement.lang = picked;
    document.documentElement.dir = directionOf(picked);

    router.refresh();
  }, [picked, router]);

  // Ekran nestaje na sam klik, ne čeka odgovor servera — inače bi klik
  // izgledao kao da se ništa nije desilo dok se stranica ponovo ne iscrta.
  if (picked) return null;

  return (
    <div
      id="izbor-jezika"
      role="dialog"
      aria-modal="true"
      aria-label={copy.gateAria}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-forest-900 px-5 py-12"
    >
      <p className="font-display text-3xl text-sand-50 sm:text-4xl">TreeScape</p>

      {/* Naslov se smjenjuje, pa ga čitač ekrana ne prati — on već ima
          `aria-label` na dijalogu, koji miruje. */}
      <div
        key={shown}
        dir={directionOf(shown)}
        aria-hidden="true"
        className="animate-fade-rise mt-10 text-center"
      >
        <h1 className="font-display text-2xl text-sand-50 sm:text-3xl">{copy.gateTitle}</h1>
        <p className="mt-3 text-sm text-moss-300/90 sm:text-base">{copy.gateLead}</p>
      </div>

      <ul className="mt-10 flex w-full max-w-xs flex-col gap-3">
        {LOCALES.map((locale, i) => (
          <li key={locale}>
            <button
              ref={i === 0 ? firstButtonRef : undefined}
              type="button"
              lang={locale}
              dir={directionOf(locale)}
              onClick={() => setPicked(locale)}
              className="w-full rounded-2xl border border-forest-700 bg-forest-800 px-6 py-4 text-lg font-medium text-sand-50 transition-colors hover:border-moss-400 hover:bg-forest-700 focus-visible:border-moss-400"
            >
              {getStrings(locale).language.names[locale]}
            </button>
          </li>
        ))}
      </ul>

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
    </div>
  );
}
