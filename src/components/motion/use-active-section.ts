'use client';

import { useEffect, useState } from 'react';

/**
 * Koji je odjeljak trenutno na ekranu — da ga navigacija može označiti.
 *
 * Prati se pojas oko GORNJE trećine ekrana (`rootMargin`), a ne cijeli ekran.
 * Bez toga bi na visokim odjeljcima dva bila vidljiva istovremeno, pa bi
 * oznaka poskakivala naprijed-nazad dok gost mirno skrola.
 *
 * Ovdje se React stanje koristi namjerno, za razliku od ostatka animacija:
 * rezultat mijenja SADRŽAJ navigacije (`aria-current`), a ne samo izgled, pa
 * mora proći kroz iscrtavanje da bi ga čitač ekrana uopće vidio.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    /** Šta se trenutno vidi. Set, jer odjeljci ulaze i izlaze nezavisno. */
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // Uvijek se bira PRVI po redu na stranici, a ne prvi koji se javio —
        // inače bi oznaka zavisila od toga kojim je smjerom gost skrolao.
        setActive(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
