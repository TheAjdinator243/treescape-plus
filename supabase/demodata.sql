-- ═══════════════════════════════════════════════════════════════════════════
--  TreeScape — DEMO PODACI (samo za testiranje)
--
--  Pokreni TEK NAKON `migrations/0001_init.sql`.
--
--  ⚠  NE POKRETATI NA BAZI KOJA IMA PRAVE GOSTE.
--     Sve što ovo upiše nosi `admin_note = 'DEMO'` ili naziv koji počinje s
--     "DEMO", pa se lako obriše — komande za brisanje su na dnu datoteke.
--
--  Datumi su relativni na današnji dan, pa demo podaci nikad ne zastare.
--
--  Provjeri lokalno prije nego pustiš u oblak:   npm run db:check
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  1. Postavke za testiranje
--
--  Bankovni podaci su OČIGLEDNO lažni. Da su prazni, ne bi se moglo testirati
--  plaćanje na račun; da liče na prave, neko bi mogao stvarno uplatiti.
-- ───────────────────────────────────────────────────────────────────────────

update public.settings set
  default_nightly_cents = 25000,   -- 250,00 KM po danu
  weekend_price_cents   = 30000,   -- 300,00 KM subotom i nedjeljom
  cleaning_fee_cents    = 0,
  currency              = 'BAM',
  currency_symbol       = 'KM',
  min_nights            = 1,
  max_nights            = 30,
  max_guests            = 8,
  checkin_time          = '11:00',
  checkout_time         = '09:00',
  bank_account_name     = 'DEMO — NIJE PRAVI RAČUN',
  bank_name             = 'Demo banka d.d.',
  bank_iban             = 'BA000000000000000000',
  transfer_days         = 3
where id = 1;


-- ───────────────────────────────────────────────────────────────────────────
--  2. Sezonske cijene
--
--  Nova godina se preklapa sa zimom, ali ima veći prioritet — služi da se
--  provjeri da obračun bira skuplju sezonu.
-- ───────────────────────────────────────────────────────────────────────────

delete from public.rate_periods where name like 'DEMO%';

insert into public.rate_periods (name, start_date, end_date, nightly_price_cents, priority)
values
  ('DEMO ljetna sezona',
   date_trunc('year', current_date)::date + interval '5 months 14 days',
   date_trunc('year', current_date)::date + interval '8 months 15 days',
   18000, 10),

  ('DEMO zimska sezona',
   date_trunc('year', current_date)::date + interval '11 months 14 days',
   date_trunc('year', current_date)::date + interval '12 months 15 days',
   20000, 10),

  ('DEMO Nova godina',
   date_trunc('year', current_date)::date + interval '11 months 28 days',
   date_trunc('year', current_date)::date + interval '12 months 2 days',
   32000, 20);


-- ───────────────────────────────────────────────────────────────────────────
--  3. Rezervacije
--
--  Pokrivaju svako stanje kroz koje rezervacija može proći i sva tri jezika,
--  da se u administraciji i kalendaru vidi kako svako od njih izgleda.
--
--  `booking_public_link` se ne upisuje — generiše ga baza.
-- ───────────────────────────────────────────────────────────────────────────

delete from public.bookings where admin_note = 'DEMO';

insert into public.bookings
  (guest_name, guest_email, guest_phone, guests, note,
   start_date, end_date, status, payment_method, total_cents, currency,
   hold_expires_at, locale, admin_note)
values
  -- Potvrđeno — u kalendaru sivo i prekriženo
  ('Amina Hodžić', 'amina@primjer.ba', '+387 61 111 111', 4, null,
   current_date + 6, current_date + 10,
   'confirmed', 'cash', 100000, 'BAM', null, 'bs', 'DEMO'),

  -- Čeka odobrenje vlasnika — vidi se u /admin pod "Zahtjevi"
  ('Emir Begić', 'emir@primjer.ba', '+387 62 222 222', 2,
   'Dolazimo s malim psom, javili smo se ranije.',
   current_date + 15, current_date + 17,
   'pending_cash', 'cash', 50000, 'BAM', null, 'bs', 'DEMO'),

  -- Čeka uplatu na račun — rok istječe za 2 dana
  ('Lejla Kovač', 'lejla@primjer.ba', '+387 63 333 333', 6, null,
   current_date + 22, current_date + 26,
   'pending_transfer', 'bank_transfer', 100000, 'BAM',
   now() + interval '2 days', 'bs', 'DEMO'),

  -- Rezervacija jednog dana, bez noćenja
  ('Tarik Suljić', 'tarik@primjer.ba', '+387 64 444 444', 8,
   'Rođendan, dolazimo ujutro i idemo do večeri.',
   current_date + 30, current_date + 31,
   'confirmed', 'cash', 25000, 'BAM', null, 'bs', 'DEMO'),

  -- Gost s engleskog sajta — mailovi mu idu na engleskom
  ('John Miller', 'john@example.com', '+44 7700 900123', 3, 'Late arrival, around 22h.',
   current_date + 34, current_date + 37,
   'pending_cash', 'cash', 75000, 'BAM', null, 'en', 'DEMO'),

  -- Gost s arapskog sajta
  ('أحمد المنصوري', 'ahmed@example.com', '+971 50 123 4567', 5, null,
   current_date + 60, current_date + 64,
   'confirmed', 'bank_transfer', 100000, 'BAM', null, 'ar', 'DEMO'),

  -- Vlasnik ručno zatvorio termin
  (null, null, null, null, null,
   current_date + 40, current_date + 44,
   'blocked', 'none', 0, 'BAM', null, 'bs', 'DEMO'),

  -- Otkazano — NE zauzima termin, služi da se to i dokaže
  ('Nedim Alić', 'nedim@primjer.ba', '+387 65 555 555', 3, null,
   current_date + 50, current_date + 53,
   'cancelled', 'cash', 75000, 'BAM', null, 'bs', 'DEMO'),

  -- Isteklo — takođe ne zauzima termin
  ('Sara Mujić', 'sara@primjer.ba', '+387 66 666 666', 2, null,
   current_date + 55, current_date + 57,
   'expired', 'bank_transfer', 50000, 'BAM',
   now() - interval '1 day', 'bs', 'DEMO');


-- ───────────────────────────────────────────────────────────────────────────
--  4. Provjera da su demo podaci tačni
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  aktivnih integer;
  zauzetih integer;
begin
  -- Otkazana i istekla NE drže termin; sve ostalo drži.
  select count(*) into aktivnih from public.bookings
   where admin_note = 'DEMO'
     and status in ('pending_payment','pending_cash','pending_transfer','confirmed','blocked');

  select count(*) into zauzetih from public.availability_slots;

  if aktivnih <> zauzetih then
    raise exception 'Okidač ne radi: % aktivnih rezervacija, a % zauzetih termina',
      aktivnih, zauzetih;
  end if;

  raise notice 'Demo podaci upisani: % rezervacija drži termin.', aktivnih;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  BRISANJE DEMO PODATAKA
--
--  Kad završiš s testiranjem, pokreni ove tri linije. Prave rezervacije
--  ostaju netaknute jer nemaju `admin_note = 'DEMO'`.
--
--    delete from public.bookings where admin_note = 'DEMO';
--    delete from public.rate_periods where name like 'DEMO%';
--    update public.settings set bank_account_name='', bank_name='', bank_iban='' where id=1;
-- ═══════════════════════════════════════════════════════════════════════════
