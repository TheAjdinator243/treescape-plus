import { describe, expect, it } from 'vitest';

import { readJson } from './api-helpers';
import { esc } from './email';
import { quoteStay, validateStay } from './pricing';
import type { RatePeriod, Settings } from './types';
import {
  adminLoginSchema,
  bookingRequestSchema,
  guestCancelSchema,
  ratePeriodSchema,
  settingsSchema,
} from './validation';

/**
 * Testovi napisani iz ugla napadača, ne korisnika.
 *
 * Svaki od njih odgovara na jedno pitanje oblika "šta ako neko pošalje ovo
 * direktno API-ju, mimo sučelja". Sučelje ovdje ne postoji — ove funkcije su
 * ono što ostane kad se ono zaobiđe.
 */

const settings: Settings = {
  id: 1,
  default_nightly_cents: 25000,
  weekend_price_cents: 30000,
  cleaning_fee_cents: 0,
  currency: 'BAM',
  currency_symbol: 'KM',
  min_nights: 1,
  max_nights: 21,
  max_guests: 8,
  checkin_time: '15:00',
  checkout_time: '11:00',
  hold_minutes: 60,
  bank_account_name: '',
  bank_name: '',
  bank_iban: '',
  transfer_days: 3,
};

const periods: RatePeriod[] = [];

/** Datum dovoljno u budućnosti da test ne istekne s vremenom. */
const FUTURE = '2099-03-01';
const FUTURE_END = '2099-03-04';

function stay(over: Partial<Record<string, unknown>> = {}) {
  return {
    start_date: FUTURE,
    end_date: FUTURE_END,
    guests: 2,
    guest_name: 'Ime Prezime',
    guest_email: 'gost@primjer.ba',
    guest_phone: '+387 61 000 000',
    payment_method: 'cash',
    ...over,
  };
}

describe('cijena se ne prima od klijenta', () => {
  it('shema odbacuje total_cents — polje ni ne postoji', () => {
    const parsed = bookingRequestSchema.parse(stay({ total_cents: 1 }));
    expect(parsed).not.toHaveProperty('total_cents');
  });

  it('shema odbacuje podmetnuti status', () => {
    const parsed = bookingRequestSchema.parse(stay({ status: 'confirmed' }));
    expect(parsed).not.toHaveProperty('status');
  });

  it('shema odbacuje podmetnuti booking_public_link', () => {
    const parsed = bookingRequestSchema.parse(stay({ booking_public_link: 'moj-token' }));
    expect(parsed).not.toHaveProperty('booking_public_link');
  });

  it('iznos dolazi iz cjenovnika na serveru', () => {
    // Tri dana po 250 — bez obzira šta klijent misli da košta.
    const quote = quoteStay('2099-03-02', '2099-03-05', periods, settings);
    expect(quote.totalCents).toBe(75000);
  });
});

describe('datumi', () => {
  it('odbija datum u prošlosti', () => {
    expect(validateStay('2020-01-01', '2020-01-03', 2, periods, settings).ok).toBe(false);
  });

  it('odbija odlazak prije dolaska', () => {
    expect(validateStay(FUTURE_END, FUTURE, 2, periods, settings).ok).toBe(false);
  });

  it('odbija isti dan kao dolazak i odlazak', () => {
    expect(validateStay(FUTURE, FUTURE, 2, periods, settings).ok).toBe(false);
  });

  it('odbija nepostojeći datum (31. februar)', () => {
    expect(bookingRequestSchema.safeParse(stay({ start_date: '2099-02-31' })).success).toBe(false);
  });

  it('odbija datum pogrešnog oblika', () => {
    for (const bad of ['01/03/2099', '2099-3-1', 'sutra', '2099-03-01T00:00:00Z', '']) {
      expect(bookingRequestSchema.safeParse(stay({ start_date: bad })).success).toBe(false);
    }
  });

  it('odbija boravak duži od dozvoljenog', () => {
    expect(validateStay('2099-03-01', '2099-12-01', 2, periods, settings).ok).toBe(false);
  });
});

describe('broj gostiju', () => {
  it('odbija nulu i negativan broj', () => {
    for (const guests of [0, -1, -999]) {
      expect(bookingRequestSchema.safeParse(stay({ guests })).success).toBe(false);
    }
  });

  it('odbija decimalan broj', () => {
    expect(bookingRequestSchema.safeParse(stay({ guests: 2.5 })).success).toBe(false);
  });

  it('odbija više gostiju nego kuća prima', () => {
    expect(validateStay(FUTURE, FUTURE_END, 9, periods, settings).ok).toBe(false);
  });

  it('odbija besmisleno velik broj', () => {
    expect(bookingRequestSchema.safeParse(stay({ guests: 1e9 })).success).toBe(false);
  });
});

describe('tekstualna polja', () => {
  it('odbija predugo ime i predugu napomenu', () => {
    expect(bookingRequestSchema.safeParse(stay({ guest_name: 'a'.repeat(121) })).success).toBe(
      false
    );
    expect(bookingRequestSchema.safeParse(stay({ note: 'a'.repeat(501) })).success).toBe(false);
  });

  it('odbija neispravnu email adresu', () => {
    for (const bad of ['bez-monkey', 'a@', '@b.com', 'a b@c.com']) {
      expect(bookingRequestSchema.safeParse(stay({ guest_email: bad })).success).toBe(false);
    }
  });

  /**
   * Zlonamjeran tekst se NE odbija — i to je namjerno.
   *
   * Ime "Ana <script>" je čudno, ali nije napad sve dok negdje ne bude
   * ispisano kao HTML. Odbijanje po sadržaju bi odbijalo i prezimena s
   * apostrofom i adrese s ampersandom. Odbrana stoji na mjestu ISPISA —
   * `esc()` u `email.ts` i React u sučelju — a ovdje se samo potvrđuje da
   * takav unos prolazi u bazu kao običan tekst, bez ikakvog posebnog značenja.
   */
  it('prima specijalne znakove kao običan tekst', () => {
    const parsed = bookingRequestSchema.safeParse(
      stay({ guest_name: `O'Brien & <b>Sin</b>`, note: '"; drop table bookings; --' })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guest_name).toBe(`O'Brien & <b>Sin</b>`);
    }
  });
});

describe('način plaćanja', () => {
  it('odbija izmišljen način', () => {
    expect(bookingRequestSchema.safeParse(stay({ payment_method: 'besplatno' })).success).toBe(
      false
    );
  });
});

describe('administracija — granice unosa', () => {
  it('odbija negativnu cijenu', () => {
    const base = {
      name: 'Sezona',
      start_date: FUTURE,
      end_date: FUTURE_END,
      nightly_price_cents: -1,
      min_nights: null,
      priority: 0,
    };
    expect(ratePeriodSchema.safeParse(base).success).toBe(false);
  });

  it('odbija negativne iznose u postavkama', () => {
    expect(settingsSchema.safeParse({ default_nightly_cents: -1 }).success).toBe(false);
  });

  it('odbija prekratak i predug pristupni kod', () => {
    expect(adminLoginSchema.safeParse({ code: '' }).success).toBe(false);
    expect(adminLoginSchema.safeParse({ code: 'a'.repeat(201) }).success).toBe(false);
  });

  it('otkazivanje traži token razumne dužine i razlog', () => {
    expect(guestCancelSchema.safeParse({ token: 'kratko', reason: 'ok' }).success).toBe(false);
    expect(guestCancelSchema.safeParse({ token: 'a'.repeat(36), reason: '' }).success).toBe(false);
  });
});

describe('podaci gosta u HTML mailu', () => {
  /**
   * Mail se sastavlja lijepljenjem stringova, pa je ovo jedina brana između
   * onoga što gost upiše i onoga što se izvrši u domaćinovom pretincu.
   */
  it('neutrališe oznake', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('neutrališe podmetnuti link', () => {
    expect(esc('<a href="https://negdje-drugo">Potvrdi</a>')).not.toContain('<a');
  });

  it('neutrališe navodnike koji bi razbili style atribut', () => {
    expect(esc('" style="display:none')).toBe('&quot; style=&quot;display:none');
  });

  it('ampersand ide prvi, da se već escapovano ne escapuje dvaput naopako', () => {
    expect(esc('Ana & Marko')).toBe('Ana &amp; Marko');
    expect(esc('<')).toBe('&lt;');
  });

  it('prazno i nedostajuće daju prazan niz, ne "undefined"', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('obično ime ostaje čitljivo', () => {
    expect(esc('Emina Hadžić')).toBe('Emina Hadžić');
  });
});

describe('veličina tijela zahtjeva', () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request('https://primjer.ba/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });

  it('prima normalan zahtjev', async () => {
    await expect(readJson(post('{"a":1}'))).resolves.toEqual({ a: 1 });
  });

  it('odbija tijelo veće od granice', async () => {
    const big = JSON.stringify({ note: 'x'.repeat(20_000) });
    await expect(readJson(post(big))).resolves.toBeNull();
  });

  /**
   * Prijavljena dužina se ne uzima zdravo za gotovo.
   *
   * Zahtjev smije lagati o `content-length` ili ga uopće ne poslati, pa se
   * tijelo mjeri i nakon čitanja — inače bi granica postojala samo za one
   * koji je poštuju.
   */
  it('odbija i kad content-length laže', async () => {
    const big = JSON.stringify({ note: 'x'.repeat(20_000) });
    await expect(readJson(post(big, { 'content-length': '10' }))).resolves.toBeNull();
  });

  it('neispravan JSON vraća null umjesto da ruši rutu', async () => {
    await expect(readJson(post('{ovo nije json'))).resolves.toBeNull();
  });

  it('prazno tijelo vraća null', async () => {
    await expect(readJson(post(''))).resolves.toBeNull();
  });
});
