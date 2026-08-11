'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

import { useReducedMotion } from './use-reduced-motion';

/**
 * Glatki skrol s inercijom — stranica "klizi" umjesto da skače.
 *
 * Jedina biblioteka na cijelom sajtu (Lenis, oko 4 KB), i to zato što ovo
 * jedno ne može ni CSS ni pedeset redova vlastitog koda: treba presresti
 * kotačić miša, pretvoriti ga u cilj, svaki kadar se približiti tom cilju, a
 * pritom ne pokvariti tastaturu, ugniježdene skrolabilne elemente, traku za
 * skrolanje i dodirni ekran. Sve ostale animacije su i dalje pisane ovdje.
 *
 * Uključuje se SAMO na /treescapeproplus (stoji u tom rasporedu), pa osnovni
 * sajt skrola kao i prije.
 *
 * ── Tri stvari bez kojih ovo ne valja ─────────────────────────────────────
 *
 * 1. `prefers-reduced-motion`. Ko traži manje animacija, ne dobija NIŠTA od
 *    ovoga — Lenis se ni ne pokreće. Otimanje skrola je najagresivnija
 *    animacija na stranici i baš ona najčešće izaziva mučninu.
 *
 * 2. `scroll-behavior: smooth` iz `globals.css` mora privremeno u `auto`.
 *    Inače se dva glatka skrola tuku oko iste vrijednosti i stranica poskakuje.
 *    Vraća se pri napuštanju stranice.
 *
 * 3. Sidra (`#rezervacija`) idu kroz `lenis.scrollTo`. Da ne idu, preglednik
 *    bi skočio sam, Lenis bi to primijetio tek poslije i "sustizao" ga —
 *    vidi se kao trzaj na svaki klik u navigaciji.
 */

/**
 * Koliko iznad odjeljka staje skrol.
 *
 * NULA, i to namjerno: razmak za plutajuću navigaciju već drži
 * `scroll-padding-top: 5rem` u `globals.css`, i Lenis ga poštuje. Prvi
 * pokušaj je ovdje imao -88 "za navigaciju" i odjeljak je stajao 168px od
 * vrha — tačno tih 88 plus 80 iz `scroll-padding`. Razmak se određuje na
 * jednom mjestu; ovo je samo mjesto gdje se može dodati iznimka.
 */
const NAV_OFFSET = 0;

export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    const lenis = new Lenis({
      // Trajanje je namjerno kratko. Duže "klizanje" izgleda dobro na snimku
      // od deset sekundi, a na stranici koju neko stvarno čita znači da sadržaj
      // stiže kasnije nego što je zatražen — i to se osjeti kao sporost, ne
      // kao elegancija.
      duration: 1.05,
      // Eksponencijalno usporavanje: brzo krene, pa mekano stane.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      /**
       * Dodir se NE otima.
       *
       * Na telefonu prst već pomjera stranicu, i to onako kako je operativni
       * sistem naučio korisnika. Svako "poboljšanje" tu se osjeti kao da
       * ekran kasni za prstom. Glatki skrol je stvar kotačića miša.
       */
      syncTouch: false,
      touchMultiplier: 1,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    /**
     * Klik na sidro unutar stranice.
     *
     * Sluša se na dokumentu, a ne po linku: linkova ima u navigaciji, u
     * heroju, u podnožju i u završnom pozivu, a neki od njih se pojave tek
     * kad se meni otvori. Jedan slušalac pokriva i one koji još ne postoje.
     */
    const onClick = (event: MouseEvent) => {
      // Srednji klik, Ctrl+klik i sl. otvaraju novu karticu — to nije naš posao.
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      const href = anchor?.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: NAV_OFFSET });
    };

    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.style.scrollBehavior = previousBehavior;
    };
  }, [reduced]);

  return null;
}
