'use client';

import { useEffect, useRef } from 'react';

import { useScrollTicker } from './scroll-ticker';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Odjeljak koji OSTAJE na ekranu dok se kroz njega skrola.
 *
 * Ovo je ona vrsta naslovnog ekrana gdje stranica naizgled stane, a scena se
 * mijenja: prednji slojevi se razmiču i kamera ulazi u fotografiju. Trik je
 * star i jednostavan — odjeljak je visok nekoliko ekrana, a njegov sadržaj je
 * `position: sticky` i stoji na vrhu dok taj odjeljak prolazi.
 *
 * ── Zašto JavaScript ovdje radi samo JEDNU stvar ───────────────────────────
 * Postavlja `--p`: koliko je scene prošlo, od 0 do 1. Ništa više.
 *
 * Sve ostalo — koji sloj koliko naraste, kad se koji tekst pojavi, kad se
 * ekran ispere u svijetlo — računa CSS iz te jedne brojke (`calc()` u
 * `globals.css`). Tako po kadru postoji jedan jedini upis u DOM umjesto
 * desetak, a raspored scene se mijenja u stilu, gdje mu je i mjesto.
 *
 * ── Visina staze ──────────────────────────────────────────────────────────
 * Odjeljak dobija svoju punu visinu tek kad se javi JavaScript (`data-scene`).
 * Bez toga bi posjetilac bez JS-a skrolao tri ekrana nepomične slike — a
 * ovako dobije običan naslovni ekran, jedan ekran visok.
 *
 * Ko u sistemu ima "smanji animacije" dobija isto to: staza se ne produžava
 * (pravilo u CSS-u stoji pod `prefers-reduced-motion: no-preference`), pa
 * scena miruje na `--p: 0` i ponaša se kao obična naslovna fotografija.
 */
export function Scene({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const wasPast = useRef(false);
  const reduced = useReducedMotion();

  /**
   * Zastavica koju CSS traži prije nego produži stazu.
   *
   * Piše se u DOM iz efekta, a NE u JSX-u: da stoji u JSX-u, našla bi se i u
   * HTML-u koji stiže sa servera, pa bi posjetilac bez JavaScripta dobio
   * odjeljak visok tri ekrana kroz koji se skrola nepomična slika.
   */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduced) {
      node.removeAttribute('data-scene');
      node.style.setProperty('--p', '0');
      return;
    }

    node.dataset.scene = 'on';
  }, [reduced]);

  useScrollTicker(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    // Staza je visina odjeljka umanjena za jedan ekran: kad je vrh odjeljka na
    // vrhu ekrana `--p` je 0, a kad njegovo dno dođe do dna ekrana `--p` je 1.
    const runway = rect.height - window.innerHeight;
    if (runway <= 0) return;

    const p = Math.min(Math.max(-rect.top / runway, 0), 1);
    node.style.setProperty('--p', p.toFixed(4));

    // Naslov i dugmad su na trećini scene već nevidljivi. Nevidljivo dugme i
    // dalje hvata klikove i tabulator, pa se tu mora skloniti — ali tek na
    // prelazu, a ne u svakom kadru.
    const past = p > 0.3;
    if (past !== wasPast.current) {
      wasPast.current = past;
      if (past) node.dataset.past = 'true';
      else delete node.dataset.past;
    }
  }, !reduced);

  return (
    <section ref={ref} id={id} className={className} style={{ '--p': 0 } as React.CSSProperties}>
      {children}
    </section>
  );
}
