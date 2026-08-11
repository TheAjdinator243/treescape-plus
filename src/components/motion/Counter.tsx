'use client';

import { useRef } from 'react';

import { useOnceInView } from './use-in-view';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Broj koji se odbroji kad dođe na ekran.
 *
 * Broj se upisuje pravo u DOM, bez React stanja: šezdeset iscrtavanja u
 * sekundi kroz React bi za tri brojke bilo tri stotine iscrtavanja stranice
 * ni za šta.
 *
 * Serverski se ispisuje ODMAH KONAČNA vrijednost, a ne nula. Tako je broj
 * tačan i za Google, i za čitač ekrana, i za posjetioca bez JavaScripta —
 * animacija ga samo, ako je moguća, vrati na nulu i dovede natrag.
 */
export function Counter({
  value,
  duration = 1100,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const done = useRef(false);

  const ref = useOnceInView<HTMLSpanElement>((node) => {
    if (done.current) return;
    done.current = true;

    // Ko je tražio manje animacija, dobija gotov broj — on tamo ionako već piše.
    if (reduced) return;

    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Isto usporavanje na kraju kao `--ease-out-soft` u CSS-u: brojevi i
      // sadržaj oko njih moraju stati u istom trenutku.
      const eased = 1 - Math.pow(1 - progress, 3);

      node.textContent = String(Math.round(value * eased));
      if (progress < 1 && node.isConnected) requestAnimationFrame(tick);
    };

    node.textContent = '0';
    requestAnimationFrame(tick);
  });

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
