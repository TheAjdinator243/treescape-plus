'use client';

import { useEffect, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';
import type { AvailabilitySlot } from '@/lib/types';

/**
 * Zauzeti termini, uživo.
 *
 * Početno stanje dolazi sa servera (pa je kalendar tačan već pri prvom
 * iscrtavanju, i vidi ga Google). Nakon toga Supabase Realtime šalje svaku
 * promjenu: čim neko plati, datumi se osive u SVIM otvorenim preglednicima,
 * bez osvježavanja stranice.
 *
 * Osvježavanje pri povratku na karticu je pojas i tregeri — pokrije slučaj
 * da je WebSocket u međuvremenu pao (uspavan laptop, tunel, loš wifi).
 */
export function useAvailability(initial: AvailabilitySlot[]) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initial);

  useEffect(() => {
    let cancelled = false;

    async function refetch() {
      try {
        const res = await fetch('/api/availability', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { slots?: AvailabilitySlot[] };
        if (!cancelled && Array.isArray(data.slots)) setSlots(data.slots);
      } catch {
        // Mreža je pukla — zadržavamo zadnje poznato stanje. Baza ionako
        // odbija svaku rezervaciju koja bi se preklopila.
      }
    }

    const onFocus = () => void refetch();
    window.addEventListener('focus', onFocus);

    const supabase = supabaseBrowser();

    // Bez Supabase ključeva nema živog kanala — ostaje osvježavanje na fokus.
    if (!supabase) {
      return () => {
        cancelled = true;
        window.removeEventListener('focus', onFocus);
      };
    }

    const channel = supabase
      .channel('availability-uzivo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_slots' },
        (payload) => {
          if (cancelled) return;

          setSlots((current) => {
            if (payload.eventType === 'DELETE') {
              const removed = payload.old as Partial<AvailabilitySlot>;
              return current.filter((s) => s.booking_id !== removed.booking_id);
            }

            const row = payload.new as AvailabilitySlot;
            if (!row?.booking_id) return current;

            const without = current.filter((s) => s.booking_id !== row.booking_id);
            return [...without, row].sort((a, b) => a.start_date.localeCompare(b.start_date));
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, []);

  return slots;
}
