'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useSlotRefresh } from './useSlotRefresh';

/** Koliko često se pita je li domaćin odlučio. */
const POLL_MS = 15_000;

/**
 * Stranica s potvrdom koja se sama osvježi kad domaćin odluči.
 *
 * Gost nakon slanja zahtjeva ostane ovdje i čeka. Bez ovoga bi tu pisalo "čeka
 * odobrenje" sve dok on sam ne pritisne osvježi — a on ne zna da treba, pa
 * zaključi da se ništa nije desilo i zove telefonom.
 *
 * DVA nezavisna puta, namjerno:
 *
 * 1. Realtime preko WebSocketa — trenutan, ali visi o stvarima izvan koda:
 *    je li tabela u objavi, prolazi li WebSocket kroz mrežu gosta, je li
 *    projekat uspavan. Kad radi, promjena se vidi za sekundu.
 * 2. Obično pitanje svakih petnaest sekundi — spor, ali ga ništa ne može
 *    zaustaviti. Ovo je ono što zaista garantuje da gost neće ostati na
 *    zastarjeloj stranici.
 *
 * Prvi put je bio jedini, i pokazalo se da nije stigao do gosta. Zato drugi.
 *
 * Pita se za STANJE, a ne povlači cijela stranica: odgovor je stotinjak bajta,
 * pa je i cjelonoćno čekanje bezopasno. Cijela stranica se traži tek kad se
 * stanje zaista promijeni.
 */
export function LiveStatus({
  bookingId,
  token,
  status,
}: {
  bookingId: number;
  token: string;
  status: string;
}) {
  const router = useRouter();

  // Brz put: čim se termin promijeni u bazi.
  useSlotRefresh(bookingId);

  /**
   * Zadnje stanje koje stranica prikazuje.
   *
   * Drži se u ref-u, a ne u zavisnostima mjerača: da je u zavisnostima, svaka
   * promjena bi gasila i palila mjerač ispočetka. Upisuje se u efektu, jer se
   * ref ne smije dirati dok se komponenta iscrtava.
   */
  const known = useRef(status);

  useEffect(() => {
    known.current = status;
  }, [status]);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const res = await fetch(`/api/booking/status?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const data = (await res.json()) as { status?: string };
        if (!stopped && data.status && data.status !== known.current) router.refresh();
      } catch {
        // Mreža je pala — sljedeće pitanje za petnaest sekundi. Nema razloga
        // da gost zbog toga vidi bilo kakvu grešku; on samo čeka odluku.
      }
    }

    const timer = setInterval(() => void check(), POLL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [router, token]);

  return null;
}
