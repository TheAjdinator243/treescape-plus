'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';

/**
 * Osvježi stranicu sa servera kad se promijeni zauzetost termina.
 *
 * Sluša se `availability_slots`, a NE `bookings` — i to je namjerna odluka koja
 * se ponavlja kroz cijeli sajt. Ta tabela je već javna i već u Realtime objavi
 * (zbog kalendara), a u njoj su samo goli datumi. Tabela `bookings` nosi imena,
 * mailove i telefone gostiju; da bi se slušala, morala bi se otvoriti prema
 * `anon` ključu — a to se ne radi zbog jednog osvježavanja.
 *
 * Poruka je samo zvono. Prave podatke i dalje dovlači server, gdje RLS ne važi.
 *
 * Isti okidač pokriva oba slučaja koja nas zanimaju:
 *   • odobrenje  → red u `availability_slots` se promijeni (pending → booked)
 *   • odbijanje  → red se obriše
 *
 * @param bookingId Ako je zadan, osvježava se SAMO kad se promijeni taj termin.
 *                  Bez njega osvježava svaka promjena (tako radi administracija).
 */
/**
 * Tiče li se ova poruka baš našeg termina.
 *
 * Kod IZMJENE (odobrenje) red stiže u `new`, a kod BRISANJA (odbijanje) u
 * `old` — i to je cijela caka. Da se gleda samo `new`, odbijanje se ne bi
 * primijetilo: tamo je `new` prazan, pa bi gostu zauvijek pisalo da se čeka
 * odluka koja je odavno donesena.
 *
 * (Da `old` uopće nosi podatke, tabela u shemi ima `replica identity full`.)
 */
export function concernsBooking(
  payload: { new?: unknown; old?: unknown },
  bookingId: number
): boolean {
  for (const record of [payload.new, payload.old]) {
    if (record && typeof record === 'object' && 'booking_id' in record) {
      if ((record as { booking_id?: unknown }).booking_id === bookingId) return true;
    }
  }
  return false;
}

export function useSlotRefresh(bookingId?: number): void {
  const router = useRouter();

  useEffect(() => {
    // Povratak na karticu je pojas i tregeri: pokrije slučaj da je WebSocket
    // pao dok je telefon bio zaključan.
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);

    const supabase = supabaseBrowser();

    if (!supabase) {
      return () => window.removeEventListener('focus', onFocus);
    }

    const channel = supabase
      .channel(bookingId ? `termin-${bookingId}` : 'termini-uzivo')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability_slots' },
        (payload) => {
          if (!bookingId) {
            router.refresh();
            return;
          }

          if (concernsBooking(payload, bookingId)) router.refresh();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [router, bookingId]);
}
