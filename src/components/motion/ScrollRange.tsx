'use client';

import { useRef } from 'react';

import { useScrollTicker } from './scroll-ticker';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Koliko je element prošao kroz ekran, kao broj od 0 do 1 u CSS-u.
 *
 * Piše jednu jedinu varijablu — `--q` — na svoj korijen:
 *
 *   0   donja ivica ekrana tek dodiruje vrh elementa (ulazi odozdo)
 *   0.5 sredina elementa je na sredini ekrana
 *   1   element je potpuno izašao iznad ekrana
 *
 * Sve ostalo je CSS. Komponenta ne zna ništa o zumu, paralaksi ni zatamnjenju
 * — samo javlja GDJE je element, a `globals.css` iz toga računa i uvećanje
 * fotografije i pomak teksta. Zato se izgled mijenja bez diranja JavaScripta.
 *
 * ── Zašto samo jedan broj ─────────────────────────────────────────────────
 * Prvi pokušaj je iz JS-a pisao gotov `transform` na svaki sloj. To znači
 * onoliko upisa u DOM po kadru koliko ima slojeva, i izgled zaključan u kodu.
 * Ovako je jedan upis po elementu, a CSS iz njega izvuče koliko god pokreta
 * treba — grafička kartica ostatak odradi sama.
 *
 * ── Uz `prefers-reduced-motion` ───────────────────────────────────────────
 * Petlja se ne pokreće, `--q` ostaje na početnih 0.5 (postavljeno u CSS-u),
 * pa sve stoji tačno onako kako izgleda kad je element na sredini ekrana —
 * dakle u svom najmirnijem, "poravnatom" stanju.
 */
export function ScrollRange({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'section';
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const last = useRef(-1);

  useScrollTicker(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const vh = window.innerHeight;

    // Put koji element pređe od "tek ušao" do "sasvim izašao" je njegova
    // visina plus visina ekrana — zato se dijeli s tim zbirom, a ne samo
    // visinom elementa.
    const span = rect.height + vh;
    const raw = (vh - rect.top) / span;
    const q = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    // Van ekrana je `q` prikovan na 0 ili 1 i ne mijenja se. Bez ove provjere
    // bi se ista vrijednost upisivala u svakom kadru, za svaku fotografiju na
    // stranici — a to je posao koji ništa ne mijenja.
    const rounded = Math.round(q * 1000) / 1000;
    if (rounded === last.current) return;
    last.current = rounded;

    node.style.setProperty('--q', String(rounded));
  }, !reduced);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
