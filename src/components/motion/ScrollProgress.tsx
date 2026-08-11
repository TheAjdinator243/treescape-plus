'use client';

import { useRef } from 'react';

import { useScrollTicker } from './scroll-ticker';

/**
 * Vlas-linija koja pokazuje koliko je stranice prošlo.
 *
 * Stoji uz donju ivicu navigacije i jedina je stvar koja se na sajtu kreće
 * bez povoda posjetioca — zato je i tanka kao vlas i u boji koja ne viče.
 *
 * Pomjera se samo `transform` (`scaleX`), nikad `width`: mijenjanje širine bi
 * pri svakom kadru tjeralo preglednik da ponovo rasporedi stranicu.
 *
 * `prefers-reduced-motion` se ovdje ne provjerava: traka ne animira ništa
 * svojom voljom nego prati prst na ekranu — kao i sam skrol.
 */
export function ScrollProgress({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useScrollTicker((y) => {
    const node = ref.current;
    if (!node) return;

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    // Stranica kraća od ekrana nema šta pokazivati.
    const progress = scrollable > 0 ? Math.min(y / scrollable, 1) : 0;
    node.style.transform = `scaleX(${progress.toFixed(4)})`;
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`origin-[left_center] rtl:origin-[right_center] ${className}`}
      style={{ transform: 'scaleX(0)', willChange: 'transform' }}
    />
  );
}
