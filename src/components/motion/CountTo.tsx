'use client';

import { useEffect, useRef } from 'react';

import { useReducedMotion } from './use-reduced-motion';

/**
 * Broj koji se PRETAČE sa stare vrijednosti na novu.
 *
 * Nije isto što i `Counter`: onaj odbroji jednom, kad dođe na ekran, i tu mu
 * je kraj. Ovaj se pali svaki put kad se vrijednost promijeni, i kreće od one
 * koja je do maloprije stajala — a to je jedino što ima smisla za ukupnu
 * cijenu, koja se mijenja pri svakom dodiru kalendara.
 *
 * ── Zašto se broj upisuje pravo u DOM ─────────────────────────────────────
 * Šezdeset iscrtavanja u sekundi kroz React stanje značilo bi šezdeset
 * iscrtavanja cijele forme za rezervaciju — sa svakim poljem, kalendarom i
 * načinima plaćanja u njoj. Ovako se mijenja samo tekst u jednom `<span>`-u.
 *
 * ── Šta se ispisuje bez JavaScripta ───────────────────────────────────────
 * Konačna vrijednost, odmah. Animacija je samo ono što se desi IZMEĐU dvije
 * vrijednosti; ako je nema, broj je i dalje tačan.
 */
export function CountTo({
  value,
  format,
  duration = 620,
  className = '',
}: {
  value: number;
  /** Broj u tekst — cijena, noći, šta god. */
  format: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  /** Odakle kreće sljedeće pretakanje. */
  const from = useRef(value);
  const formatRef = useRef(format);

  // `format` se piše inline na mjestu poziva, pa je pri svakom iscrtavanju
  // nova funkcija. Da stoji u zavisnostima donjeg efekta, pretakanje bi se
  // pokretalo iznova bez ijedne promjene broja.
  useEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const start = from.current;
    from.current = value;

    if (reduced || start === value) {
      node.textContent = formatRef.current(value);
      return;
    }

    let frame = 0;
    const began = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - began) / duration, 1);
      // Isto usporavanje na kraju kao `--ease-out-soft` u CSS-u, da broj i
      // sadržaj oko njega stanu u istom trenutku.
      const eased = 1 - Math.pow(1 - progress, 3);

      node.textContent = formatRef.current(Math.round(start + (value - start) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
