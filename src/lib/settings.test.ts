import { describe, expect, it, vi } from 'vitest';

import { DEMO_SETTINGS } from './demo-data';
import { quoteStay } from './pricing';
import type { Settings } from './types';

/**
 * Ovo je test za grešku koja je stvarno pojela dvije večeri.
 *
 * Baza je imala `weekend_price_cents = 30000`, SQL Editor ga je uredno
 * pokazivao, a sajt je subotu i dalje naplaćivao 250 umjesto 300. Uzrok:
 * `select('*')` ne pita Postgres nego PostgREST, koji drži keširanu shemu.
 * Keš je bio star, kolone u odgovoru nije bilo, `undefined > 0` je `false`,
 * i vikend je tiho pao na osnovnu cijenu. Nigdje ni greške ni loga.
 */

/** Isti oblik reda kakav PostgREST vrati kad mu je keš sheme zastario. */
const REDAK_BEZ_VIKENDA = {
  id: 1,
  default_nightly_cents: 25000,
  cleaning_fee_cents: 0,
  currency: 'BAM',
  currency_symbol: 'KM',
  min_nights: 1,
  max_nights: 30,
  max_guests: 8,
  checkin_time: '11:00',
  checkout_time: '09:00',
  hold_minutes: 15,
  bank_account_name: '',
  bank_name: '',
  bank_iban: '',
  transfer_days: 3,
  // weekend_price_cents NAMJERNO fali
};

describe('nepotpune postavke iz baze', () => {
  it('vikend cijena koja fali ne smije tiho postati osnovna', () => {
    // Prije popravke: cijena subote = 25000. Poslije: podrazumijevanih 30000.
    const kakoJeBilo = { ...REDAK_BEZ_VIKENDA } as unknown as Settings;
    const subota = quoteStay('2026-10-10', '2026-10-11', [], kakoJeBilo);
    expect(subota.days[0]?.cents).toBe(25000); // ovo je bio simptom

    const popravljeno: Settings = {
      ...REDAK_BEZ_VIKENDA,
      weekend_price_cents: DEMO_SETTINGS.weekend_price_cents,
    };
    expect(quoteStay('2026-10-10', '2026-10-11', [], popravljeno).days[0]?.cents).toBe(30000);
  });

  it('10.10.2026. je zaista subota — da test ne mjeri pogrešan dan', () => {
    expect(new Date(2026, 9, 10).getDay()).toBe(6);
  });
});

describe('normalizeSettings', () => {
  /**
   * `data.ts` uvozi `server-only`, pa se ne može uvesti u test. Umjesto toga
   * se provjerava ugovor na koji se oslanja: DEMO_SETTINGS mora imati SVAKI
   * ključ iz `Settings`, jer se iz njega popunjavaju rupe.
   */
  it('DEMO_SETTINGS pokriva svaki ključ, pa rupe uvijek imaju čime da se popune', () => {
    const obavezni: (keyof Settings)[] = [
      'id',
      'default_nightly_cents',
      'weekend_price_cents',
      'cleaning_fee_cents',
      'currency',
      'currency_symbol',
      'min_nights',
      'max_nights',
      'max_guests',
      'checkin_time',
      'checkout_time',
      'hold_minutes',
      'bank_account_name',
      'bank_name',
      'bank_iban',
      'transfer_days',
    ];

    for (const key of obavezni) {
      expect(DEMO_SETTINGS[key], `DEMO_SETTINGS.${key}`).toBeDefined();
    }
  });

  it('podrazumijevani vikend je 300, isto kao u shemi baze', () => {
    // Ako se ovo razlikuje od `weekend_price_cents default 30000` u
    // 0001_init.sql, sajt i baza bi se tiho razišli.
    expect(DEMO_SETTINGS.weekend_price_cents).toBe(30000);
  });
});

describe('glasna prijava umjesto tihe pogrešne cijene', () => {
  it('nedostajuća kolona mora ostaviti trag u logu', () => {
    // Ovo je pravilo koje je nedostajalo: da je greška bila ispisana,
    // uzrok bi se vidio u prvom pogledu na Vercel log.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const missing: string[] = [];
    for (const key of Object.keys(DEMO_SETTINGS)) {
      if (!(key in REDAK_BEZ_VIKENDA)) missing.push(key);
    }
    if (missing.length > 0) console.error(`kolone fale: ${missing.join(', ')}`);

    expect(missing).toEqual(['weekend_price_cents']);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
