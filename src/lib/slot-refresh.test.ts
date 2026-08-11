import { describe, expect, it } from 'vitest';

import { concernsBooking } from '@/components/booking/useSlotRefresh';

/**
 * Stranica s potvrdom sluša svoj termin i osvježava se sama kad domaćin odluči.
 *
 * Ovdje se testira jedini dio s pravom logikom: prepoznavanje da se poruka tiče
 * baš NAŠEG termina. Zamka je u tome što odobrenje i odbijanje stižu na dva
 * različita načina, pa je lako pokriti samo jedan i vjerovati da radi.
 */

const NAS = 101;
const TUDJI = 202;

describe('concernsBooking', () => {
  it('odobrenje: red stiže u `new`', () => {
    // pending → booked, kad domaćin odobri
    const poruka = { new: { booking_id: NAS, kind: 'booked' }, old: {} };
    expect(concernsBooking(poruka, NAS)).toBe(true);
  });

  it('odbijanje: red stiže u `old`, jer ga više nema', () => {
    // Ovo je slučaj zbog kojeg funkcija uopće postoji. Da se gleda samo `new`,
    // gostu bi zauvijek pisalo da se čeka odluka koja je donesena.
    const poruka = { new: {}, old: { booking_id: NAS, kind: 'pending' } };
    expect(concernsBooking(poruka, NAS)).toBe(true);
  });

  it('tuđi termin se ignoriše', () => {
    // Bez ovoga bi se stranica gosta osvježavala pri svakoj tuđoj rezervaciji.
    expect(concernsBooking({ new: { booking_id: TUDJI } }, NAS)).toBe(false);
    expect(concernsBooking({ old: { booking_id: TUDJI } }, NAS)).toBe(false);
  });

  it('prazna ili nepotpuna poruka ne ruši ništa', () => {
    expect(concernsBooking({}, NAS)).toBe(false);
    expect(concernsBooking({ new: null, old: null }, NAS)).toBe(false);
    expect(concernsBooking({ new: {}, old: {} }, NAS)).toBe(false);
  });

  it('ne pali se na nešto što samo liči na oznaku', () => {
    expect(concernsBooking({ new: { booking_id: undefined } }, NAS)).toBe(false);
    expect(concernsBooking({ new: { id: NAS } }, NAS)).toBe(false);
  });
});
