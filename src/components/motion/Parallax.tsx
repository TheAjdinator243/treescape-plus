'use client';

import { useRef } from 'react';

import { useScrollTicker } from './scroll-ticker';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Sadržaj koji se pri skrolanju kreće sporije (ili brže) od stranice.
 *
 * Tri pravila zbog kojih ovo ne trza:
 *
 *  1. Crta se iz zajedničkog `requestAnimationFrame`-a (`scroll-ticker.ts`), a
 *     ne iz `scroll` slušaoca. Skrol na ovoj stranici vodi Lenis iz svog rAF-a;
 *     slušalac bi crtao kadar kasnije i sloj bi vidljivo "plivao" za sadržajem.
 *  2. Pomjera se SAMO `translate3d`, nikad `top` ni `margin`. Prvo radi
 *     grafička kartica; drugo tjera preglednik da ponovo rasporedi cijelu
 *     stranicu, u svakom kadru.
 *  3. Ništa se ne računa dok se ploha ne vidi. Na dugoj stranici to je većina
 *     vremena.
 *
 * Sadržaj mora biti VEĆI od svog okvira (npr. `-inset-y-16` ili `scale-110`),
 * inače se pri pomjeranju vidi rub ispod njega.
 */
export function Parallax({
  children,
  /**
   * Koliko sporije od stranice. 0.2 = kreće se petinom brzine skrola.
   * Negativna vrijednost okreće smjer — sloj tada ide "ispred" sadržaja.
   */
  speed = 0.2,
  className = '',
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useScrollTicker(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    // Nula kad je sredina plohe na sredini ekrana, pa pomak na obje strane.
    const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
    node.style.transform = `translate3d(0, ${(-fromCenter * speed).toFixed(2)}px, 0)`;
  }, !reduced);

  return (
    <div ref={ref} className={className} style={reduced ? undefined : { willChange: 'transform' }}>
      {children}
    </div>
  );
}
