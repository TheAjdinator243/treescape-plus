'use client';

import { useEffect, useRef } from 'react';

/**
 * Pozovi nešto kad element PRVI PUT uđe u vidno polje.
 *
 * Jedan te isti `IntersectionObserver` obrazac koristi sve što se pokreće pri
 * skrolanju — pojavljivanje odjeljaka, brojači, isjecanje slika. Da je
 * prepisan po komponentama, prva izmjena praga ostavila bi ostale sa starim.
 *
 * Zove se JEDNOM i onda se prestaje pratiti: sadržaj koji se pri svakom
 * prolazu ponovo pojavljuje i nestaje je ukras koji smeta, a ne pomaže.
 *
 * Namjerno nema React stanja nego samo poziv — pozivalac onda piše pravo u
 * DOM. Animacija je čista prezentacija, pa nema razloga da pri svakom skrolu
 * pokreće ponovno iscrtavanje komponente.
 *
 * Sam čvor stiže KAO ARGUMENT, iako ga pozivalac ima i u vraćenom `ref`-u.
 * Razlog je praktičan: `const ref = useOnceInView(() => ref.current...)` čita
 * promjenljivu koja se tek dodjeljuje, pa se na to s pravom žali i React
 * Compiler. Ovako pozivalac nema šta ni da traži.
 *
 * Preglednik bez `IntersectionObserver`-a dobija poziv odmah — animacija je
 * ukras, sadržaj je poenta.
 */
export function useOnceInView<T extends HTMLElement>(
  onEnter: (node: T) => void,
  options?: { threshold?: number; rootMargin?: string }
) {
  const ref = useRef<T>(null);

  /**
   * Poziv se drži u ref-u, a ne u zavisnostima efekta: pozivaoci ga pišu
   * inline, pa bi svako iscrtavanje pravilo novu funkciju i time gasilo i
   * palilo osmatrač ispočetka — a on treba da radi tačno jednom.
   */
  const latest = useRef(onEnter);
  useEffect(() => {
    latest.current = onEnter;
  });

  const threshold = options?.threshold ?? 0.12;
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px';

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      latest.current(node);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        latest.current(node);
        observer.disconnect();
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}
