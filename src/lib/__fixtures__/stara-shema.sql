-- ═══════════════════════════════════════════════════════════════════════════
--  TreeScape — inicijalna shema baze
--
--  Pokreni ovu datoteku u Supabase → SQL Editor (kopiraj/zalijepi sve).
--  Sve je idempotentno gdje je moguće, ali je predviđeno za praznu bazu.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  1. REZERVACIJE
--
--  Ključna ideja: NIKAKAV dvostruki booking nije moguć — to garantuje sama
--  baza kroz EXCLUDE ograničenje, a ne aplikacijski kod. Dvije osobe mogu
--  istovremeno biti na Stripe stranici za iste datume; provjera tipa
--  "je li slobodno?" u kodu bi izgubila tu utrku. Postgres je ne gubi.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.bookings (
  id                        uuid primary key default gen_random_uuid(),

  -- Nasumični token koji ide u URL potvrde (/rezervacija/<token>).
  -- Namjerno nije `id` — da se tuđe rezervacije ne mogu pogađati.
  public_token              text        not null unique,

  -- Podaci gosta. NULL su samo kod ručnog blokiranja termina od vlasnika.
  guest_name                text,
  guest_email               text,
  guest_phone               text,
  guests                    integer,
  note                      text,

  -- Datum dolaska i odlaska. Boravak 01.08 → 05.08 = 4 noćenja,
  -- a 05.08 je slobodan za sljedećeg gosta (vidi '[)' ispod).
  start_date                date        not null,
  end_date                  date        not null,

  stay                      daterange   generated always as
                              (daterange(start_date, end_date, '[)')) stored,

  status                    text        not null default 'pending_payment'
                              check (status in (
                                'pending_payment',  -- čeka uplatu karticom (drži termin)
                                'pending_cash',     -- gotovina, čeka odobrenje vlasnika
                                'confirmed',        -- potvrđeno
                                'expired',          -- gost nije platio na vrijeme
                                'cancelled',        -- otkazano / odbijeno
                                'blocked'           -- vlasnik ručno blokirao termin
                              )),

  payment_method            text        not null default 'none'
                              check (payment_method in ('card', 'cash', 'none')),

  total_cents               integer     not null default 0 check (total_cents >= 0),
  currency                  text        not null default 'EUR',
  price_breakdown           jsonb,

  stripe_session_id         text,
  stripe_payment_intent_id  text,

  -- Dokad drži termin dok gost stoji na Stripe stranici.
  hold_expires_at           timestamptz,

  admin_note                text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint valid_stay      check (end_date > start_date),
  constraint guest_required  check (
    status = 'blocked'
    or (guest_name is not null and guest_email is not null)
  )
);

-- ── SRCE CIJELOG SISTEMA ───────────────────────────────────────────────────
-- Dva reda koja se preklapaju NE MOGU oba postojati ako su oba "aktivna".
-- Otkazane i istekle rezervacije nisu u WHERE dijelu, pa oslobađaju termin.
-- Insert koji bi napravio preklapanje pada s greškom 23P01, koju aplikacija
-- hvata i prikazuje kao "ovi datumi su upravo rezervisani".
alter table public.bookings
  drop constraint if exists bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (stay with &&)
  where (status in ('pending_payment', 'pending_cash', 'confirmed', 'blocked'));

create index if not exists bookings_status_idx      on public.bookings (status);
create index if not exists bookings_created_at_idx  on public.bookings (created_at desc);
create index if not exists bookings_start_date_idx  on public.bookings (start_date);
create index if not exists bookings_holds_idx
  on public.bookings (hold_expires_at)
  where status = 'pending_payment';


-- ───────────────────────────────────────────────────────────────────────────
--  2. JAVNA DOSTUPNOST
--
--  Preglednik NIKADA ne čita tabelu `bookings` — tamo su imena, mailovi i
--  telefoni gostiju. Umjesto toga čita ovu tabelu, u kojoj su samo datumi.
--  Nju održava okidač, a preko nje ide i Realtime emitovanje.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.availability_slots (
  booking_id  uuid primary key references public.bookings(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  kind        text not null check (kind in ('booked', 'pending', 'blocked'))
);

create index if not exists availability_slots_range_idx
  on public.availability_slots (start_date, end_date);

create or replace function public.sync_availability_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.availability_slots where booking_id = old.id;
    return old;
  end if;

  if new.status in ('pending_payment', 'pending_cash', 'confirmed', 'blocked') then
    insert into public.availability_slots (booking_id, start_date, end_date, kind)
    values (
      new.id,
      new.start_date,
      new.end_date,
      case new.status
        when 'confirmed' then 'booked'
        when 'blocked'   then 'blocked'
        else 'pending'
      end
    )
    on conflict (booking_id) do update
      set start_date = excluded.start_date,
          end_date   = excluded.end_date,
          kind       = excluded.kind;
  else
    -- expired / cancelled → termin se oslobađa
    delete from public.availability_slots where booking_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_availability on public.bookings;
create trigger bookings_sync_availability
  after insert or update or delete on public.bookings
  for each row execute function public.sync_availability_slot();


-- ───────────────────────────────────────────────────────────────────────────
--  3. SEZONSKE CIJENE
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rate_periods (
  id                  uuid primary key default gen_random_uuid(),
  name                text        not null,
  start_date          date        not null,
  end_date            date        not null,
  nightly_price_cents integer     not null check (nightly_price_cents >= 0),
  min_nights          integer     check (min_nights is null or min_nights > 0),
  -- Kod preklapanja perioda pobjeđuje veći priority (npr. praznici > ljeto).
  priority            integer     not null default 0,
  created_at          timestamptz not null default now(),

  constraint valid_period check (end_date > start_date)
);

create index if not exists rate_periods_range_idx
  on public.rate_periods (start_date, end_date);


-- ───────────────────────────────────────────────────────────────────────────
--  4. POSTAVKE (jedan jedini red)
--
--  Ovdje idu SAMO javni podaci — ovu tabelu čita i preglednik.
--  Vlasnikov email i sve tajne žive u varijablama okruženja, ne ovdje.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.settings (
  id                    integer primary key default 1 check (id = 1),
  default_nightly_cents integer not null default 12000,
  cleaning_fee_cents    integer not null default 3000,
  currency              text    not null default 'EUR',
  currency_symbol       text    not null default '€',
  min_nights            integer not null default 2 check (min_nights > 0),
  max_nights            integer not null default 30 check (max_nights > 0),
  max_guests            integer not null default 8 check (max_guests > 0),
  checkin_time          text    not null default '15:00',
  checkout_time         text    not null default '11:00',
  -- Koliko minuta se termin drži dok je gost na Stripe stranici.
  hold_minutes          integer not null default 15 check (hold_minutes > 0),
  updated_at            timestamptz not null default now()
);


-- ───────────────────────────────────────────────────────────────────────────
--  5. STRIPE DOGAĐAJI (idempotentnost)
--
--  Stripe ponavlja slanje webhooka dok ne dobije 200. Bez ovoga bi se ista
--  rezervacija mogla obraditi više puta.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.stripe_events (
  event_id    text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);


-- ───────────────────────────────────────────────────────────────────────────
--  6. OSLOBAĐANJE ISTEKLIH REZERVACIJA
--
--  Ne može biti dio EXCLUDE uslova jer `now()` nije immutable, pa se poziva
--  eksplicitno: prije svakog čitanja dostupnosti i prije svakog inserta.
--  Vercel Cron je samo dodatna mreža, nije jedina odbrana.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released integer;
begin
  update public.bookings
     set status     = 'expired',
         updated_at = now()
   where status = 'pending_payment'
     and hold_expires_at is not null
     and hold_expires_at < now();

  get diagnostics released = row_count;
  return released;
end;
$$;


-- ── automatski updated_at ──────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
  before update on public.bookings
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.settings;
create trigger settings_touch_updated_at
  before update on public.settings
  for each row execute function public.touch_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  7. SIGURNOST (RLS)
--
--  Pravilo: sve je zabranjeno osim onoga što je izričito dozvoljeno.
--  Anon ključ (onaj u pregledniku) smije čitati SAMO datume i cjenovnik.
--  Svako pisanje ide kroz server sa service role ključem, koji zaobilazi RLS.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.bookings           enable row level security;
alter table public.availability_slots enable row level security;
alter table public.rate_periods       enable row level security;
alter table public.settings           enable row level security;
alter table public.stripe_events      enable row level security;

-- bookings / stripe_events: bez ijedne politike → nedostupno iz preglednika.

drop policy if exists "javno citanje dostupnosti" on public.availability_slots;
create policy "javno citanje dostupnosti"
  on public.availability_slots for select
  to anon, authenticated
  using (true);

drop policy if exists "javno citanje cjenovnika" on public.rate_periods;
create policy "javno citanje cjenovnika"
  on public.rate_periods for select
  to anon, authenticated
  using (true);

drop policy if exists "javno citanje postavki" on public.settings;
create policy "javno citanje postavki"
  on public.settings for select
  to anon, authenticated
  using (true);


-- ───────────────────────────────────────────────────────────────────────────
--  8. REALTIME
--
--  Čim se rezervacija potvrdi, okidač upiše red u availability_slots, a
--  Supabase to emituje svim otvorenim preglednicima — kalendar se osivi
--  bez osvježavanja stranice.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.availability_slots replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.availability_slots;
exception
  when duplicate_object then null;  -- već dodana, u redu je
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
--  9. POČETNI PODACI
--
--  Cijene su u centima (12000 = 120,00 €). Vlasnik ih mijenja kroz /admin.
--  Za konvertibilnu marku: currency='BAM', currency_symbol='KM'.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.settings (id) values (1)
on conflict (id) do nothing;

insert into public.rate_periods (name, start_date, end_date, nightly_price_cents, min_nights, priority)
select * from (values
  ('Ljetna sezona 2026',   date '2026-06-15', date '2026-09-16', 18000, 3, 10),
  ('Zimska sezona 2026',   date '2026-12-15', date '2027-01-16', 20000, 3, 10),
  ('Nova godina 2027',     date '2026-12-29', date '2027-01-03', 26000, 4, 20)
) as v(name, start_date, end_date, nightly_price_cents, min_nights, priority)
where not exists (select 1 from public.rate_periods);
