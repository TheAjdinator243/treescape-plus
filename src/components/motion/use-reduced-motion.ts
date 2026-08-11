'use client';

import { useSyncExternalStore } from 'react';

/**
 * Da li posjetilac traži da se animacije smanje.
 *
 * U `globals.css` već stoji `@media (prefers-reduced-motion: reduce)` koje
 * svaki CSS prijelaz svede na nulu — ali to ne pomaže animacijama koje vodi
 * JavaScript (brojači, paralaksa). One ne "trepere" nego se STVARNO vrte, pa
 * ih treba preskočiti u kodu, a ne u stilu.
 *
 * `useSyncExternalStore`, a ne `useState` + `useEffect`: postavka je vanjski
 * izvor istine koji se mijenja bez našeg znanja, i ovo je jedini način da se
 * pročita bez dodatnog iscrtavanja odmah nakon prvog. Serverski snimak je
 * uvijek `false` — server ne zna šta posjetilac ima podešeno, a svaka druga
 * vrijednost bi napravila neslaganje pri hidraciji.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
