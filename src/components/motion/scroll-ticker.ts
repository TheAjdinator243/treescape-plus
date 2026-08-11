'use client';

import { useEffect } from 'react';

/**
 * Jedan `requestAnimationFrame` za sve što se pomjera uz skrol.
 *
 * ── Zašto ne `window.addEventListener('scroll')` ───────────────────────────
 * Zato što na ovoj stranici skrol vodi Lenis, i to iz SVOG rAF-a. Kad on
 * pomjeri stranicu, preglednik tek onda javi `scroll`, a slušalac koji na to
 * zakaže još jedan rAF crta kadar kasnije. Razlika od jednog kadra se na
 * paralaksi vidi kao "plivanje" slojeva za sadržajem — najviše baš tamo gdje
 * je efekt trebao biti neprimjetan.
 *
 * Ovako svi pretplatnici rade u ISTOM kadru u kojem je stranica i pomjerena.
 *
 * ── Zašto jedan zajednički, a ne petlja po komponenti ──────────────────────
 * Pet slojeva paralakse znači pet rAF petlji koje se sve bude šezdeset puta u
 * sekundi i svaka za sebe pita gdje je stranica. Ovdje se to pita jednom.
 *
 * Petlja se pokreće kad se javi prvi pretplatnik i gasi kad ode zadnji, pa
 * stranice bez paralakse ne plaćaju ništa. Kad se skrol ne mijenja, ne radi se
 * ništa osim jednog poređenja brojeva.
 */

type Subscriber = (scrollY: number) => void;

const subscribers = new Set<Subscriber>();
let frame = 0;
let lastY = -1;

function tick() {
  const y = window.scrollY;

  // Miruje? Onda nema šta ni da se crta. Petlja i dalje radi (skrol može
  // krenuti u svakom trenutku), ali je jedan `if` po kadru.
  if (y !== lastY) {
    lastY = y;
    for (const run of subscribers) run(y);
  }

  frame = requestAnimationFrame(tick);
}

function subscribe(run: Subscriber): () => void {
  subscribers.add(run);

  if (frame === 0) {
    // `lastY` se resetuje da prvi pretplatnik dobije poziv odmah, i onda kad
    // stranica stoji na mjestu — inače bi sloj ostao na početnoj vrijednosti
    // sve dok se ne skrola.
    lastY = -1;
    frame = requestAnimationFrame(tick);
  }

  return () => {
    subscribers.delete(run);
    if (subscribers.size === 0 && frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

/**
 * Poziv u svakom kadru u kojem se stranica pomjerila.
 *
 * Poziv se drži u ref-u pretplate, a ne u zavisnostima efekta: komponente ga
 * pišu inline, pa bi svako iscrtavanje pravilo novu funkciju i time gasilo i
 * palilo pretplatu bez potrebe.
 */
export function useScrollTicker(run: Subscriber, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    return subscribe(run);
    // `run` namjerno nije u zavisnostima — vidi komentar iznad. Pozivaoci ga
    // pišu tako da ne zavisi od stanja koje se mijenja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
