import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Migracija se testira na PRAVOM Postgresu (PGlite = Postgres preveden u WASM),
 * a ne na izmišljenom modelu.
 *
 * Ovo je najvažniji test u projektu. Zabrana dvostrukog bookinga ne živi u
 * TypeScript-u nego u EXCLUDE ograničenju baze — da je to pogrešno napisano,
 * dvoje ljudi bi moglo platiti isti termin, a tek bi se na licu mjesta vidjelo.
 * Ovdje se to provjeri za sekundu, bez ijednog otvorenog naloga.
 */

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');
const FIXTURES_DIR = path.resolve(import.meta.dirname, '__fixtures__');
const MIGRATION = '0001_init.sql';

/**
 * PGlite nema Supabase-ove role (anon/authenticated) ni publikaciju
 * supabase_realtime. Ta dva mjesta izbacujemo; sve ostalo — tabele,
 * ograničenja, okidači, funkcije — testira se tačno onako kako će raditi.
 */
const prepare = (sql: string) =>
  sql
    .replace(/do \$\$\s*begin\s*alter publication[\s\S]*?end;\s*\$\$;/i, '')
    .replace(/^\s*to anon, authenticated\s*$/gim, '');

let db: PGlite;

/**
 * Rezervacija gosta — potvrđena ako se ne kaže drugačije.
 *
 * `booking_public_link` se namjerno ne prosljeđuje: generiše ga baza, pa se
 * usput provjerava i da podrazumijevana vrijednost radi.
 */
function guest(
  start: string,
  end: string,
  status:
    | 'confirmed'
    | 'pending_payment'
    | 'pending_cash'
    | 'pending_transfer' = 'confirmed'
) {
  return db.query<{ id: number; booking_public_link: string }>(
    `insert into bookings
       (guest_name, guest_email, start_date, end_date, status, payment_method, total_cents)
     values ('Test Gost', 'test@primjer.ba', $1, $2, $3, 'card', 50000)
     returning id, booking_public_link`,
    [start, end, status]
  );
}

async function isRejected(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return false;
  } catch (error) {
    // 23P01 = povreda EXCLUDE ograničenja
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('no_overlap') || message.includes('23P01');
  }
}

beforeAll(async () => {
  db = new PGlite();

  await db.exec(prepare(readFileSync(path.join(MIGRATIONS_DIR, MIGRATION), 'utf8')));
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe('nadogradnja sa starije sheme', () => {
  /**
   * Najopasniji slučaj u praksi: baza već postoji, ali je iz ranije verzije
   * projekta. `create table if not exists` tada ne uradi NIŠTA, pa kolone
   * dodane kasnije (locale, weekend_price_cents, bankovni podaci) ne bi
   * nikad stigle — a ograničenja ispod ih traže.
   *
   * Prije nego je ovo napisano, shema je u tom slučaju pucala s
   * `column "locale" does not exist` i ostavljala bazu na pola posla.
   */
  it('stara baza s podacima se podigne na današnji oblik', async () => {
    const old = new PGlite();

    await old.exec(prepare(readFileSync(path.join(FIXTURES_DIR, 'stara-shema.sql'), 'utf8')));

    await old.query(
      `insert into bookings
         (public_token, guest_name, guest_email, start_date, end_date, status, payment_method, total_cents)
       values ('stari-gost','Gost','g@primjer.ba','2030-01-01','2030-01-05','confirmed','cash',50000)`
    );

    await old.exec(prepare(readFileSync(path.join(MIGRATIONS_DIR, MIGRATION), 'utf8')));

    // Rezervacija iz stare baze je preživjela i dobila podrazumijevani jezik.
    // Red se traži po gostu: migracija je starom tokenu dodijelila nov,
    // nasumičan `booking_public_link`.
    const booking = await old.query<{
      locale: string;
      payment_reference: string | null;
      id: number;
      booking_public_link: string;
    }>(
      `select locale, payment_reference, id, booking_public_link
         from bookings where guest_email = 'g@primjer.ba'`
    );
    expect(booking.rows).toHaveLength(1);
    expect(booking.rows[0]?.locale).toBe('bs');

    // `id` je iz uuid prešao u cijeli broj, a javni dio adrese je sada uuid.
    expect(typeof booking.rows[0]?.id).toBe('number');
    expect(booking.rows[0]?.booking_public_link).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Nove kolone su stigle, s ispravnim podrazumijevanim vrijednostima.
    const settings = await old.query<{ weekend_price_cents: number; bank_iban: string }>(
      'select weekend_price_cents, bank_iban from settings where id = 1'
    );
    expect(settings.rows[0]?.weekend_price_cents).toBe(30000);
    expect(settings.rows[0]?.bank_iban).toBe('');

    // Stripe naziva više nema, ali su podaci preimenovani, ne obrisani.
    const stripe = await old.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and column_name like '%stripe%'`
    );
    expect(stripe.rows).toHaveLength(0);

    // I dalje se ne može dvaput rezervisati isti termin.
    await expect(
      old.query(
        `insert into bookings
           (guest_name, guest_email, start_date, end_date, status, payment_method)
         values ('Drugi','d@primjer.ba','2030-01-02','2030-01-04','confirmed','cash')`
      )
    ).rejects.toThrow();

    await old.close();
  }, 60_000);

  /**
   * Baza kroz koju je nekoliko puta prošla i stara i nova shema zna imati
   * OBA imena istovremeno — i `stripe_events` i `payment_events`. Tada
   * `rename` pukne s "relation payment_events already exists" i migracija
   * stane na pola.
   *
   * Dovoljno je pokrenuti staru shemu, preimenovati, pa pokrenuti staru
   * ponovo: `create table if not exists` opet napravi stripe_events.
   */
  it('preživi bazu koja ima i staro i novo ime tabele', async () => {
    const messy = new PGlite();
    const stara = prepare(readFileSync(path.join(FIXTURES_DIR, 'stara-shema.sql'), 'utf8'));

    await messy.exec(stara);
    await messy.exec('alter table public.stripe_events rename to payment_events');
    await messy.exec(stara);

    const before = await messy.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name like '%events%'`
    );
    expect(before.rows).toHaveLength(2);

    // Ovo je puklo prije nego su preimenovanja dobila i provjeru odredišta.
    await expect(
      messy.exec(prepare(readFileSync(path.join(MIGRATIONS_DIR, MIGRATION), 'utf8')))
    ).resolves.toBeDefined();

    const settings = await messy.query<{ weekend_price_cents: number }>(
      'select weekend_price_cents from settings where id = 1'
    );
    expect(settings.rows[0]?.weekend_price_cents).toBe(30000);

    // Ostatak se ne briše, ali ne smije ostati javno čitljiv.
    const rls = await messy.query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where relname = 'stripe_events'`
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);

    await messy.close();
  }, 60_000);
});

describe('migracija', () => {
  it('može se pokrenuti dva puta bez štete', async () => {
    // Vlasnik ne mora pamtiti je li već pokrenuo — a ni backup ne smije
    // obrisati ono što u bazi već stoji.
    await db.query(
      `insert into bookings
         (guest_name, guest_email, start_date, end_date, status, payment_method)
       values ('Gost','g@primjer.ba','2030-05-01','2030-05-03','confirmed','cash')`
    );

    await db.exec(prepare(readFileSync(path.join(MIGRATIONS_DIR, MIGRATION), 'utf8')));

    const { rows } = await db.query<{ count: string }>(
      `select count(*) from bookings where start_date = date '2030-05-01'`
    );
    expect(Number(rows[0]?.count)).toBe(1);

    // Postavke i dalje imaju tačno jedan red
    const settings = await db.query<{ count: string }>('select count(*) from settings');
    expect(Number(settings.rows[0]?.count)).toBe(1);

    await db.query(`delete from bookings where start_date = date '2030-05-01'`);
  });

  it('kreira sve tabele', async () => {
    const { rows } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' order by table_name`
    );
    expect(rows.map((r) => r.table_name)).toEqual([
      'availability_slots',
      'bookings',
      'payment_events',
      'rate_periods',
      'settings',
    ]);
  });

  it('nigdje nije ostalo ništa vezano za Stripe', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and column_name like '%stripe%'`
    );
    expect(rows).toHaveLength(0);
  });

  it('bankovni podaci su dio postavki', async () => {
    const { rows } = await db.query<{ bank_iban: string; transfer_days: number }>(
      'select bank_iban, transfer_days from settings where id = 1'
    );
    expect(rows[0]?.bank_iban).toBe('');
    expect(rows[0]?.transfer_days).toBe(3);
  });

  it('rezervacija pamti jezik gosta', async () => {
    const { rows } = await db.query<{ locale: string }>(
      `select locale from bookings where start_date = date '2029-06-01'`
    );
    // Red se upisuje u testu ispod; ovdje se provjerava samo da kolona postoji
    // i da ima podrazumijevanu vrijednost.
    expect(rows).toHaveLength(0);

    await db.query(
      `insert into bookings
         (guest_name, guest_email, start_date, end_date, status, payment_method)
       values ('Gost','g@primjer.ba','2029-06-01','2029-06-03','confirmed','cash')`
    );

    const inserted = await db.query<{ locale: string }>(
      `select locale from bookings where start_date = date '2029-06-01'`
    );
    expect(inserted.rows[0]?.locale).toBe('bs');
  });

  it('odbija jezik koji sajt ne govori', async () => {
    await expect(
      db.query(
        `insert into bookings
           (guest_name, guest_email, start_date, end_date, status, payment_method, locale)
         values ('Gost','g@primjer.ba','2029-07-01','2029-07-03','confirmed','cash','de')`
      )
    ).rejects.toThrow();
  });

  it('prima sva tri jezika sajta', async () => {
    for (const [i, locale] of ['bs', 'en', 'ar'].entries()) {
      await expect(
        db.query(
          `insert into bookings
             (guest_name, guest_email, start_date, end_date, status, payment_method, locale)
           values ('Gost','g@primjer.ba',$1,$2,'confirmed','cash',$3)`,
          [`2029-08-0${i * 2 + 1}`, `2029-08-0${i * 2 + 2}`, locale]
        )
      ).resolves.toBeDefined();
    }
  });

  it('vikend cijena je dio postavki', async () => {
    const { rows } = await db.query<{ weekend_price_cents: number }>(
      'select weekend_price_cents from settings where id = 1'
    );
    expect(rows[0]?.weekend_price_cents).toBe(30000);
  });

  it('vikend cijena ne može biti negativna', async () => {
    await expect(
      db.query('update settings set weekend_price_cents = -1 where id = 1')
    ).rejects.toThrow();
  });

  it('nula je dozvoljena i znači "vikend nema posebnu cijenu"', async () => {
    await expect(
      db.query('update settings set weekend_price_cents = 0 where id = 1')
    ).resolves.toBeDefined();
    await db.query('update settings set weekend_price_cents = 30000 where id = 1');
  });

  it('upisuje početni red postavki', async () => {
    const { rows } = await db.query<{ count: string }>('select count(*) from settings');
    expect(Number(rows[0]?.count)).toBe(1);
  });
});

describe('dvostruki booking je nemoguć', () => {
  beforeAll(async () => {
    await guest('2027-08-10', '2027-08-15');
  });

  it.each([
    ['identičan termin', '2027-08-10', '2027-08-15'],
    ['preklapa početak', '2027-08-08', '2027-08-12'],
    ['preklapa kraj', '2027-08-14', '2027-08-20'],
    ['obuhvata postojeći', '2027-08-01', '2027-08-30'],
    ['pada unutar postojećeg', '2027-08-11', '2027-08-13'],
  ])('baza odbija: %s', async (_name, start, end) => {
    expect(await isRejected(guest(start, end))).toBe(true);
  });

  it('zahtjev za gotovinu također blokira termin', async () => {
    expect(await isRejected(guest('2027-08-12', '2027-08-14', 'pending_cash'))).toBe(
      true
    );
  });

  it('nezavršena uplata također blokira termin', async () => {
    expect(await isRejected(guest('2027-08-12', '2027-08-14', 'pending_payment'))).toBe(
      true
    );
  });

  it('bankovni transfer koji se čeka također blokira termin', async () => {
    expect(
      await isRejected(guest('2027-08-12', '2027-08-14', 'pending_transfer'))
    ).toBe(true);
  });
});

describe('bankovni transfer', () => {
  it('rezervacija koja čeka uplatu odmah zauzima kalendar', async () => {
    const { rows } = await guest('2028-03-01', '2028-03-05', 'pending_transfer');
    const slot = await db.query<{ kind: string }>(
      'select kind from availability_slots where booking_id = $1',
      [rows[0]!.id]
    );
    expect(slot.rows[0]?.kind).toBe('pending');
  });

  it('neplaćen transfer istekne i oslobodi termin', async () => {
    await db.query(
      `insert into bookings
         (guest_name, guest_email, start_date, end_date, status, payment_method, hold_expires_at)
       values ('Spor','s@e.ba','2028-04-01','2028-04-05','pending_transfer','bank_transfer', now() - interval '1 day')`
    );

    await db.query('select release_expired_holds()');

    const { rows } = await db.query<{ status: string }>(
      `select status from bookings where start_date = date '2028-04-01'`
    );
    expect(rows[0]?.status).toBe('expired');

    // …i termin je opet slobodan za nekog drugog
    await expect(guest('2028-04-01', '2028-04-05')).resolves.toBeDefined();
  });

  it('potvrda uplate mijenja termin u "booked"', async () => {
    const { rows } = await guest('2028-05-01', '2028-05-05', 'pending_transfer');
    await db.query(`update bookings set status='confirmed' where id=$1`, [rows[0]!.id]);

    const slot = await db.query<{ kind: string }>(
      'select kind from availability_slots where booking_id = $1',
      [rows[0]!.id]
    );
    expect(slot.rows[0]?.kind).toBe('booked');
  });
});

describe('dan odlaska pripada sljedećem gostu', () => {
  it('dolazak na dan tuđeg odlaska prolazi', async () => {
    await expect(guest('2027-08-15', '2027-08-18')).resolves.toBeDefined();
  });

  it('odlazak na dan tuđeg dolaska prolazi', async () => {
    await expect(guest('2027-08-06', '2027-08-10')).resolves.toBeDefined();
  });
});

describe('otkazivanje oslobađa termin', () => {
  it('otkazan termin se može ponovo rezervisati', async () => {
    const { rows } = await guest('2027-10-01', '2027-10-05');
    await db.query(`update bookings set status='cancelled' where id=$1`, [rows[0]!.id]);
    await expect(guest('2027-10-01', '2027-10-05')).resolves.toBeDefined();
  });
});

describe('availability_slots prati bookings', () => {
  it('zahtjev za gotovinu odmah zauzima termin', async () => {
    const { rows } = await guest('2027-11-01', '2027-11-04', 'pending_cash');
    const slot = await db.query<{ kind: string }>(
      'select kind from availability_slots where booking_id=$1',
      [rows[0]!.id]
    );
    expect(slot.rows[0]?.kind).toBe('pending');
  });

  it('odobrenje mijenja vrstu u booked, a odbijanje briše red', async () => {
    const { rows } = await guest('2027-11-10', '2027-11-14', 'pending_cash');
    const id = rows[0]!.id;

    await db.query(`update bookings set status='confirmed' where id=$1`, [id]);
    let slot = await db.query<{ kind: string }>(
      'select kind from availability_slots where booking_id=$1',
      [id]
    );
    expect(slot.rows[0]?.kind).toBe('booked');

    await db.query(`update bookings set status='cancelled' where id=$1`, [id]);
    slot = await db.query('select kind from availability_slots where booking_id=$1', [id]);
    expect(slot.rows).toHaveLength(0);
  });

  it('ne izlaže nijedan podatak o gostu', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_name = 'availability_slots' order by column_name`
    );
    expect(rows.map((r) => r.column_name)).toEqual([
      'booking_id',
      'end_date',
      'kind',
      'start_date',
    ]);
  });
});

describe('vlasnik može blokirati termin', () => {
  it('blokiran termin odbija goste', async () => {
    await db.query(
      `insert into bookings (start_date, end_date, status, payment_method, admin_note)
       values ('2027-12-01','2027-12-10','blocked','none','krečenje')`
    );
    expect(await isRejected(guest('2027-12-05', '2027-12-08'))).toBe(true);
  });
});

describe('release_expired_holds', () => {
  it('oslobađa samo istekle, a svježe ostavlja', async () => {
    await db.query(
      `insert into bookings (guest_name, guest_email, start_date, end_date, status, payment_method, hold_expires_at)
       values ('A','a@b.ba','2028-01-01','2028-01-05','pending_payment','card', now() - interval '1 hour'),
              ('B','b@b.ba','2028-02-01','2028-02-05','pending_payment','card', now() + interval '10 minutes')`
    );

    const { rows } = await db.query<{ n: number }>('select release_expired_holds() as n');
    expect(rows[0]?.n).toBe(1);

    const stale = await db.query<{ status: string }>(
      `select status from bookings where start_date = date '2028-01-01'`
    );
    expect(stale.rows[0]?.status).toBe('expired');

    const fresh = await db.query<{ status: string }>(
      `select status from bookings where start_date = date '2028-02-01'`
    );
    expect(fresh.rows[0]?.status).toBe('pending_payment');

    // Napušten termin je opet slobodan…
    await expect(guest('2028-01-01', '2028-01-05')).resolves.toBeDefined();
    // …a onaj koji još traje i dalje drži svoj.
    expect(await isRejected(guest('2028-02-01', '2028-02-05'))).toBe(true);
  });
});

describe('ograničenja podataka', () => {
  it('odbija odlazak isti kao dolazak', async () => {
    await expect(guest('2027-09-10', '2027-09-10')).rejects.toThrow();
  });

  it('odbija odlazak prije dolaska', async () => {
    await expect(guest('2027-09-10', '2027-09-05')).rejects.toThrow();
  });

  it('odbija rezervaciju gosta bez imena i maila', async () => {
    await expect(
      db.query(
        `insert into bookings (start_date, end_date, status, payment_method)
         values ('2029-01-01','2029-01-05','confirmed','card')`
      )
    ).rejects.toThrow();
  });

  it('dozvoljava blokadu bez podataka o gostu', async () => {
    await expect(
      db.query(
        `insert into bookings (start_date, end_date, status, payment_method)
         values ('2029-03-01','2029-03-05','blocked','none')`
      )
    ).resolves.toBeDefined();
  });

  it('ne dozvoljava dva reda u tabeli postavki', async () => {
    await expect(db.query('insert into settings (id) values (2)')).rejects.toThrow();
  });
});
