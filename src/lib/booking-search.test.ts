import { describe, expect, it } from 'vitest';

import { matchesBookingSearch, searchBookings } from './booking-search';
import type { Booking } from './types';

function napravi(over: Partial<Booking> = {}): Booking {
  return {
    id: 42,
    booking_public_link: 'a1b2c3d4-1111-4222-8333-444444444444',
    guest_name: 'Amina Hodžić',
    guest_email: 'amina@primjer.ba',
    guest_phone: '+387 61 234 567',
    guests: 4,
    note: null,
    start_date: '2026-09-10',
    end_date: '2026-09-14',
    status: 'confirmed',
    payment_method: 'cash',
    total_cents: 100000,
    currency: 'BAM',
    price_breakdown: null,
    payment_reference: null,
    payment_id: null,
    hold_expires_at: null,
    admin_note: null,
    locale: 'bs',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  } as Booking;
}

const gost = napravi();

describe('pretraga po imenu', () => {
  it('nalazi po dijelu imena', () => {
    expect(matchesBookingSearch(gost, 'amina')).toBe(true);
    expect(matchesBookingSearch(gost, 'hodz')).toBe(true);
  });

  it('ne mari za velika i mala slova', () => {
    expect(matchesBookingSearch(gost, 'AMINA')).toBe(true);
  });

  /**
   * Ovo je razlog zbog kojeg pretraga uopšte normalizuje tekst: domaćin kuca
   * bez kvačica jer je brže, a ime u bazi ih ima.
   */
  it('nalazi i kad se kvačice ne kucaju', () => {
    expect(matchesBookingSearch(gost, 'hodzic')).toBe(true);
    expect(matchesBookingSearch(gost, 'Hodžić')).toBe(true);
  });

  it('radi i obrnuto — kvačica u upitu, bez nje u bazi', () => {
    const bezKvacice = napravi({ guest_name: 'Amina Hodzic' });
    expect(matchesBookingSearch(bezKvacice, 'hodžić')).toBe(true);
  });

  it('nalazi i đ, koje NFD ne rastavlja', () => {
    const djuro = napravi({ guest_name: 'Đuro Đurić' });
    expect(matchesBookingSearch(djuro, 'duro')).toBe(true);
    expect(matchesBookingSearch(djuro, 'đuro')).toBe(true);
  });

  it('ne nalazi ono čega nema', () => {
    expect(matchesBookingSearch(gost, 'petar')).toBe(false);
  });
});

describe('pretraga po broju rezervacije i id-u', () => {
  it('nalazi po broju koji gost čita preko telefona', () => {
    // bookingReference = prvih 8 znakova javnog linka, velikim slovima
    expect(matchesBookingSearch(gost, 'A1B2C3D4')).toBe(true);
    expect(matchesBookingSearch(gost, 'a1b2c3d4')).toBe(true);
  });

  it('nalazi po dijelu broja rezervacije', () => {
    expect(matchesBookingSearch(gost, 'b2c3')).toBe(true);
  });

  it('nalazi po punom javnom linku', () => {
    expect(matchesBookingSearch(gost, gost.booking_public_link)).toBe(true);
  });

  it('nalazi po internom id-u', () => {
    expect(matchesBookingSearch(gost, '42')).toBe(true);
  });
});

describe('pretraga po kontaktu', () => {
  it('nalazi po email adresi', () => {
    expect(matchesBookingSearch(gost, 'amina@primjer.ba')).toBe(true);
    expect(matchesBookingSearch(gost, 'primjer.ba')).toBe(true);
  });

  /**
   * Broj u bazi ima razmake i pozivni znak, a domaćin ga s ekrana telefona
   * prepisuje bez ijednog razmaka. Bez poređenja golih cifara pretraga bi
   * baš tu zakazala.
   */
  it('nalazi broj telefona kucан bez razmaka', () => {
    expect(matchesBookingSearch(gost, '61234567')).toBe(true);
    expect(matchesBookingSearch(gost, '38761234567')).toBe(true);
  });

  it('nalazi broj i onako kako je zapisan', () => {
    expect(matchesBookingSearch(gost, '+387 61 234 567')).toBe(true);
  });

  /**
   * Cifre preko razmaka su cijeli razlog za poređenje golih cifara: "62999"
   * se u zapisu "+387 62 999 888" ne pojavljuje doslovno, jer je između
   * razmak. Obična pretraga podniza bi tu promašila.
   */
  it('nalazi cifre koje u zapisu razdvaja razmak', () => {
    const drugi = napravi({ guest_phone: '+387 62 999 888', guest_name: 'Emir', id: 7 });
    expect(matchesBookingSearch(drugi, '62999')).toBe(true);
    expect(matchesBookingSearch(drugi, '999888')).toBe(true);
  });

  it('cifre kojih u broju nema ne pogađaju', () => {
    const drugi = napravi({
      guest_phone: '+387 62 999 888',
      guest_name: 'Emir',
      guest_email: 'emir@primjer.ba',
      id: 7,
      booking_public_link: 'ffffffff-1111-4222-8333-444444444444',
      start_date: '2026-11-01',
      end_date: '2026-11-03',
    });
    expect(matchesBookingSearch(drugi, '55555')).toBe(false);
  });
});

describe('više riječi', () => {
  it('sve riječi moraju odgovarati', () => {
    expect(matchesBookingSearch(gost, 'amina 2026')).toBe(true);
    expect(matchesBookingSearch(gost, 'amina 2030')).toBe(false);
  });

  it('svaka riječ smije pogoditi drugo polje', () => {
    expect(matchesBookingSearch(gost, 'hodzic primjer.ba')).toBe(true);
  });

  it('višak razmaka ne smeta', () => {
    expect(matchesBookingSearch(gost, '   amina    hodzic  ')).toBe(true);
  });
});

describe('rubni slučajevi', () => {
  it('prazan upit prihvata sve', () => {
    expect(matchesBookingSearch(gost, '')).toBe(true);
    expect(matchesBookingSearch(gost, '   ')).toBe(true);
  });

  it('blokada bez podataka o gostu se nađe po napomeni', () => {
    const blokada = napravi({
      guest_name: null,
      guest_email: null,
      guest_phone: null,
      admin_note: 'krečenje',
      status: 'blocked',
    });
    expect(matchesBookingSearch(blokada, 'krecenje')).toBe(true);
    expect(matchesBookingSearch(blokada, 'amina')).toBe(false);
  });

  it('nedostajuća polja ne ruše pretragu', () => {
    const prazan = napravi({ guest_name: null, guest_email: null, guest_phone: null });
    expect(() => matchesBookingSearch(prazan, 'bilo šta')).not.toThrow();
    expect(matchesBookingSearch(prazan, 'bilo šta')).toBe(false);
  });

  it('nalazi po datumu termina', () => {
    expect(matchesBookingSearch(gost, '2026-09-10')).toBe(true);
    expect(matchesBookingSearch(gost, '09-14')).toBe(true);
  });
});

describe('searchBookings', () => {
  const lista = [
    gost,
    napravi({ id: 43, guest_name: 'Emir Begić', guest_email: 'emir@primjer.ba', guest_phone: '+387 62 111 222' }),
    napravi({ id: 44, guest_name: 'Lejla Kovač', guest_email: 'lejla@drugi.com', guest_phone: '+387 63 333 444' }),
  ];

  it('prazan upit vraća isti niz, bez kopiranja', () => {
    expect(searchBookings(lista, '')).toBe(lista);
    expect(searchBookings(lista, '  ')).toBe(lista);
  });

  it('filtrira na pogodak', () => {
    expect(searchBookings(lista, 'emir').map((b) => b.id)).toEqual([43]);
    expect(searchBookings(lista, 'primjer.ba').map((b) => b.id)).toEqual([42, 43]);
  });

  it('bez pogotka vraća prazno', () => {
    expect(searchBookings(lista, 'nepostojeci')).toEqual([]);
  });
});
