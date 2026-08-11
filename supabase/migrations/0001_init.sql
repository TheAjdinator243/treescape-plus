-- ═══════════════════════════════════════════════════════════════════════════
--  TreeScape — kompletna shema baze
--
--  JEDINA datoteka koju treba pokrenuti. Otvori Supabase → SQL Editor,
--  kopiraj cijeli sadržaj, zalijepi i klikni Run.
--
--  Očekivani odgovor je "Success. No rows returned" — to je uspjeh, migracije
--  ne vraćaju redove.
--
--  Bezbjedno je pokrenuti više puta: sve je pisano tako da drugo pokretanje
--  ništa ne pokvari i ništa ne obriše.
--
--  ── Šta ovdje živi ────────────────────────────────────────────────────────
--    1. rezervacije + zabrana dvostrukog bookinga
--    2. javna dostupnost (samo datumi, bez podataka o gostima)
--    3. sezonske cijene
--    4. postavke (jedan red)
--    5. evidencija uplata
--    6. oslobađanje isteklih termina
--    7. sigurnost (RLS)
--    8. Realtime
--    9. početni red postavki
--   10. osvježavanje keša sheme (bez ovoga aplikacija ne vidi nove kolone)
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  1. REZERVACIJE
--
--  Ključna ideja: NIKAKAV dvostruki booking nije moguć — to garantuje sama
--  baza kroz EXCLUDE ograničenje, a ne aplikacijski kod. Dvoje ljudi mogu
--  istovremeno stajati na formi za iste datume; provjera tipa "je li
--  slobodno?" u kodu bi izgubila tu utrku. Postgres je ne gubi.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.bookings (
  -- Interni ključ. Cijeli broj, a ne uuid: raste redom pa upisi lijepo padaju
  -- u indeks, zauzima 8 bajta umjesto 16, i lakši je za rad u administraciji.
  -- NIKADA ne ide u adresu — za to služi kolona ispod.
  id                  bigint generated always as identity primary key,

  -- Ono što ide u adresu potvrde: /rezervacija/<booking_public_link>
  --
  -- Mora biti nepogodivo. Da je u adresi stajao redni broj, svako bi ukucao
  -- /rezervacija/2 i čitao tuđe ime, email i telefon. uuid v4 nosi 122 bita
  -- slučajnosti, pa pogađanje nije izvodljivo.
  booking_public_link uuid        not null unique default gen_random_uuid(),

  -- Podaci gosta. NULL su samo kod ručnog blokiranja termina od vlasnika.
  guest_name          text,
  guest_email         text,
  guest_phone         text,
  guests              integer,
  note                text,

  -- Dolazak i odlazak. Boravak 01.08 → 05.08 = 4 dana, a 05.08 je slobodan
  -- sljedećem gostu (vidi '[)' ispod).
  start_date          date        not null,
  end_date            date        not null,

  stay                daterange   generated always as
                        (daterange(start_date, end_date, '[)')) stored,

  status              text        not null default 'pending_payment',
  payment_method      text        not null default 'none',

  total_cents         integer     not null default 0 check (total_cents >= 0),
  currency            text        not null default 'EUR',
  price_breakdown     jsonb,

  -- Neutralni nazivi, da sutra domaći procesor (Monri, WSPay) ne traži
  -- novu migraciju.
  payment_reference   text,
  payment_id          text,

  -- Dokad se termin drži dok se čeka uplata.
  hold_expires_at     timestamptz,

  admin_note          text,

  -- Jezik na kojem je gost rezervisao — na njemu mu stižu svi mailovi.
  -- Mora stajati ovdje jer potvrda ili odbijanje zahtjeva za gotovinu stižu
  -- danima kasnije, iz administracije, kad od gosta nema ni kolačića ni
  -- zaglavlja preglednika.
  locale              text        not null default 'bs',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint valid_stay     check (end_date > start_date),
  constraint guest_required check (
    status = 'blocked'
    or (guest_name is not null and guest_email is not null)
  )
);

-- ── Ako tabela VEĆ POSTOJI iz starije verzije ──────────────────────────────
--
--  `create table if not exists` iznad ne uradi ništa kad tabela već postoji —
--  pa ni kolone dodane kasnije ne bi nikad stigle. Zato se svaka takva kolona
--  dodaje i izričito. Na praznoj bazi ovi redovi ne rade ništa (kolone su već
--  tu), a na starijoj bazi je dovode u današnji oblik bez gubitka podataka.
--
--  Bez ovoga migracija pukne s "column ... does not exist" i baza ostane
--  na pola posla.

-- Nazivi iz vremena Stripe-a → neutralni.
--
--  Preimenovanje čuva podatke, za razliku od brisanja i ponovnog pravljenja.
--  Ali se radi SAMO ako novo ime još ne postoji: baza kroz koju je nekoliko
--  puta prošla i stara i nova shema zna imati oba imena istovremeno, i tada
--  `rename` pukne s "relation already exists". Tada se stari ostatak ostavlja
--  na miru — ništa se ne briše — samo mu se uključi RLS da ne bude javno
--  čitljiv kroz anon ključ.
do $$
declare
  has_old boolean;
  has_new boolean;
begin
  -- bookings.stripe_session_id → payment_reference
  select count(*) filter (where column_name = 'stripe_session_id') > 0,
         count(*) filter (where column_name = 'payment_reference') > 0
    into has_old, has_new
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bookings';

  if has_old and not has_new then
    alter table public.bookings rename column stripe_session_id to payment_reference;
  end if;

  -- bookings.stripe_payment_intent_id → payment_id
  select count(*) filter (where column_name = 'stripe_payment_intent_id') > 0,
         count(*) filter (where column_name = 'payment_id') > 0
    into has_old, has_new
    from information_schema.columns
   where table_schema = 'public' and table_name = 'bookings';

  if has_old and not has_new then
    alter table public.bookings rename column stripe_payment_intent_id to payment_id;
  end if;

  -- stripe_events → payment_events
  select count(*) filter (where table_name = 'stripe_events') > 0,
         count(*) filter (where table_name = 'payment_events') > 0
    into has_old, has_new
    from information_schema.tables
   where table_schema = 'public';

  if has_old and not has_new then
    alter table public.stripe_events rename to payment_events;
  elsif has_old and has_new then
    -- Obje postoje: ostatak ranijih pokušaja. Ne diramo ga, samo zatvaramo.
    execute 'alter table public.stripe_events enable row level security';
    raise notice 'Zatečena je i stara tabela stripe_events — ostavljena je netaknuta, samo joj je uključen RLS. Možeš je obrisati ručno kad se uvjeriš da je prazna.';
  end if;

  -- payment_events.event_id → external_id
  select count(*) filter (where column_name = 'event_id') > 0,
         count(*) filter (where column_name = 'external_id') > 0
    into has_old, has_new
    from information_schema.columns
   where table_schema = 'public' and table_name = 'payment_events';

  if has_old and not has_new then
    alter table public.payment_events rename column event_id to external_id;
  end if;
end;
$$;

alter table public.bookings
  add column if not exists payment_reference text,
  add column if not exists payment_id        text,
  add column if not exists locale            text not null default 'bs';


-- ── Stariji oblik: uuid `id` i tekstualni `public_token` ───────────────────
--
--  Ranije je `id` bio uuid, a javni dio adrese se zvao `public_token` i bio
--  nasumičan tekst. uuid kao primarni ključ razbacuje upise po indeksu i troši
--  duplo prostora, pa `id` postaje cijeli broj koji raste redom, a javni dio
--  se seli u `booking_public_link` tipa uuid.
--
--  Zamjena tipa primarnog ključa se ne može uraditi jednim `alter`: za njega
--  visi strani ključ iz `availability_slots`. Zato ide preko pomoćnih kolona,
--  uz preslikavanje starih uuid vrijednosti na nove brojeve — nijedan red se
--  ne gubi. Na svježoj bazi ovaj blok ne radi ništa.
do $$
begin
  -- 1. Javni link
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'bookings'
       and column_name = 'booking_public_link'
  ) then
    -- `execute` nije ukras: PL/pgSQL priprema obične naredbe prema shemi
    -- kakva je bila na ulasku u blok, pa `update` nad kolonom dodanom par
    -- redova iznad pukne s "column does not exist". Dinamički SQL se planira
    -- tek u trenutku izvršavanja, kad kolona već postoji.
    execute 'alter table public.bookings add column booking_public_link uuid';

    -- Stari `public_token` se ne pretvara u uuid — nije istog oblika. Već
    -- poslani linkovi ovom promjenom prestaju vrijediti, što je prihvatljivo:
    -- gost do rezervacije uvijek dođe i preko broja rezervacije i maila.
    execute 'update public.bookings set booking_public_link = gen_random_uuid()
              where booking_public_link is null';

    execute 'alter table public.bookings
               alter column booking_public_link set not null,
               alter column booking_public_link set default gen_random_uuid()';

    execute 'alter table public.bookings
               add constraint bookings_public_link_key unique (booking_public_link)';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'bookings'
       and column_name = 'public_token'
  ) then
    alter table public.bookings drop column public_token;
  end if;

  -- 2. `id` iz uuid u cijeli broj
  if (
    select data_type from information_schema.columns
     where table_schema = 'public' and table_name = 'bookings' and column_name = 'id'
  ) = 'uuid' then
    -- Isti razlog za `execute` kao gore: sve ovo dira kolone koje nastaju
    -- unutar ovog istog bloka.
    execute 'alter table public.bookings
               add column novi_id bigint generated always as identity';

    execute 'alter table public.availability_slots add column novi_booking_id bigint';
    execute 'update public.availability_slots s
                set novi_booking_id = b.novi_id
               from public.bookings b
              where b.id = s.booking_id';

    execute 'alter table public.availability_slots
               drop constraint if exists availability_slots_booking_id_fkey';
    execute 'alter table public.availability_slots
               drop constraint if exists availability_slots_pkey';
    execute 'alter table public.availability_slots drop column booking_id';
    execute 'alter table public.availability_slots
               rename column novi_booking_id to booking_id';
    execute 'alter table public.availability_slots
               alter column booking_id set not null';

    execute 'alter table public.bookings drop constraint if exists bookings_pkey cascade';
    execute 'alter table public.bookings drop column id';
    execute 'alter table public.bookings rename column novi_id to id';

    execute 'alter table public.bookings add primary key (id)';
    execute 'alter table public.availability_slots add primary key (booking_id)';
    execute 'alter table public.availability_slots
               add constraint availability_slots_booking_id_fkey
               foreign key (booking_id) references public.bookings(id) on delete cascade';

    raise notice 'bookings.id prebačen iz uuid u cijeli broj.';
  end if;
end;
$$;


-- Ograničenja se imenuju izričito, da se kasnije mogu naći i zamijeniti.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in (
    'pending_payment',   -- čeka online uplatu (kratko držanje)
    'pending_cash',      -- gotovina, čeka odobrenje vlasnika
    'pending_transfer',  -- čeka da uplata legne na račun (dugo držanje)
    'confirmed',
    'expired',
    'cancelled',
    'blocked'            -- vlasnik ručno zatvorio termin
  ));

alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method in ('card', 'cash', 'bank_transfer', 'test', 'none'));

alter table public.bookings drop constraint if exists bookings_locale_check;
alter table public.bookings
  add constraint bookings_locale_check
  check (locale in ('bs', 'en', 'ar'));


-- ── SRCE CIJELOG SISTEMA ───────────────────────────────────────────────────
--
--  Dva reda koja se preklapaju NE MOGU oba postojati ako su oba "aktivna".
--  Otkazane i istekle rezervacije nisu u WHERE dijelu, pa oslobađaju termin.
--
--  Insert koji bi napravio preklapanje pada s greškom 23P01, koju aplikacija
--  hvata i prikazuje kao "ovi datumi su upravo rezervisani".
--
--  Ako ovaj dio ikad nestane, dvoje ljudi može platiti isti termin, a to se
--  vidi tek na licu mjesta. Zato na dnu datoteke stoji provjera koja odbija
--  proći ako ograničenja nema.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (stay with &&)
  where (status in (
    'pending_payment', 'pending_cash', 'pending_transfer', 'confirmed', 'blocked'
  ));

create index if not exists bookings_status_idx     on public.bookings (status);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_start_date_idx on public.bookings (start_date);

drop index if exists bookings_holds_idx;
create index if not exists bookings_holds_idx
  on public.bookings (hold_expires_at)
  where status in ('pending_payment', 'pending_transfer');


-- ───────────────────────────────────────────────────────────────────────────
--  2. JAVNA DOSTUPNOST
--
--  Preglednik NIKADA ne čita tabelu `bookings` — tamo su imena, mailovi i
--  telefoni gostiju. Umjesto toga čita ovu tabelu, u kojoj su samo datumi.
--  Nju održava okidač, a preko nje ide i Realtime emitovanje.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.availability_slots (
  booking_id  bigint primary key references public.bookings(id) on delete cascade,
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

  if new.status in ('pending_payment', 'pending_cash', 'pending_transfer',
                    'confirmed', 'blocked') then
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
--
--  Rasponi datuma s vlastitom cijenom. Kod preklapanja pobjeđuje veći
--  `priority` (npr. Nova godina > zimska sezona).
--
--  Vikend NIJE ovdje — on se ponavlja svake sedmice, pa stoji kao postavka
--  (`settings.weekend_price_cents`). Sezonama bi to bilo pedeset i dva reda
--  godišnje, koje bi neko morao dopisivati svakog decembra.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.rate_periods (
  id                  uuid primary key default gen_random_uuid(),
  name                text        not null,
  start_date          date        not null,
  end_date            date        not null,
  nightly_price_cents integer     not null check (nightly_price_cents >= 0),
  min_nights          integer     check (min_nights is null or min_nights > 0),
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
--
--  Cijene su u centima: 12000 = 120,00. Za konvertibilnu marku postavi
--  currency='BAM' i currency_symbol='KM' kroz /admin → Cijene.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.settings (
  id                    integer primary key default 1 check (id = 1),

  default_nightly_cents integer not null default 12000,

  -- Subota i nedjelja. 0 znači "vikend nema posebnu cijenu".
  -- Sezona, gdje je postavljena, i dalje ima prednost nad vikendom.
  weekend_price_cents   integer not null default 30000,

  -- Naknade za čišćenje više nema; kolona ostaje da stari redovi ne pucaju.
  cleaning_fee_cents    integer not null default 0,

  currency              text    not null default 'EUR',
  currency_symbol       text    not null default '€',

  -- Minimalnog boravka nema — kuća se može uzeti i za jedan jedini dan.
  min_nights            integer not null default 1  check (min_nights > 0),
  max_nights            integer not null default 30 check (max_nights > 0),
  max_guests            integer not null default 8  check (max_guests > 0),

  checkin_time          text    not null default '15:00',
  checkout_time         text    not null default '11:00',

  hold_minutes          integer not null default 15 check (hold_minutes > 0),

  -- Bankovni podaci — gost ih vidi na potvrdi i u mailu kad plaća na račun.
  -- Dok je IBAN prazan, plaćanje na račun se gostima uopće ne nudi.
  bank_account_name     text    not null default '',
  bank_name             text    not null default '',
  bank_iban             text    not null default '',
  transfer_days         integer not null default 3
                          check (transfer_days > 0 and transfer_days <= 30),

  updated_at            timestamptz not null default now()
);

-- Isti razlog kao kod `bookings`: na starijoj bazi ovih kolona nema.
alter table public.settings
  add column if not exists weekend_price_cents integer not null default 30000,
  add column if not exists cleaning_fee_cents  integer not null default 0,
  add column if not exists bank_account_name   text    not null default '',
  add column if not exists bank_name           text    not null default '',
  add column if not exists bank_iban           text    not null default '',
  add column if not exists transfer_days       integer not null default 3;

alter table public.settings drop constraint if exists settings_weekend_price_check;
alter table public.settings
  add constraint settings_weekend_price_check
  check (weekend_price_cents >= 0);


-- ───────────────────────────────────────────────────────────────────────────
--  5. EVIDENCIJA UPLATA (idempotentnost)
--
--  Procesori uplata umiju poslati istu obavijest više puta dok ne dobiju 200.
--  Bez ovoga bi se ista rezervacija mogla obraditi dvaput.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.payment_events (
  external_id text primary key,
  type        text not null,
  -- Ko je obradio uplatu ('bank_transfer', 'test', kasnije i procesor).
  provider    text not null default 'nepoznato',
  received_at timestamptz not null default now()
);

-- Na starijoj bazi ove kolone nema (vidi isto obrazloženje gore).
alter table public.payment_events
  add column if not exists provider text not null default 'nepoznato';


-- ───────────────────────────────────────────────────────────────────────────
--  6. OSLOBAĐANJE ISTEKLIH TERMINA
--
--  Ne može biti dio EXCLUDE uslova jer `now()` nije immutable, pa se poziva
--  izričito: prije svakog čitanja dostupnosti i prije svakog upisa.
--  Vercel Cron je samo dodatna mreža, nije jedina odbrana.
--
--  Online uplata se drži minutama, uplata na račun danima — oba se oslobode
--  kad im istekne `hold_expires_at`.
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
   where status in ('pending_payment', 'pending_transfer')
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
--  Anon ključ (onaj u pregledniku) smije čitati SAMO datume, cjenovnik i
--  postavke. Svako pisanje ide kroz server sa service role ključem, koji
--  zaobilazi RLS.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.bookings           enable row level security;
alter table public.availability_slots enable row level security;
alter table public.rate_periods       enable row level security;
alter table public.settings           enable row level security;
alter table public.payment_events     enable row level security;

-- bookings / payment_events: bez ijedne politike → nedostupno iz preglednika.

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
--  Samo jedan red postavki, s podrazumijevanim vrijednostima iz tabele iznad.
--  Sezone se NE upisuju: primjeri s tvrdo upisanim datumima bi tiho mijenjali
--  cijene na živom sajtu i zastarjeli bi već sljedeće godine. Sezonu dodaj
--  kroz /admin → Cijene, kad ti zatreba.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.settings (id) values (1)
on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
--  10. OSVJEŽAVANJE KEŠA SHEME  ← NE BRIŠI OVAJ DIO
--
--  Aplikacija ne razgovara s Postgresom direktno nego preko PostgREST-a, a
--  on drži KEŠIRANU sliku sheme. Kad se tabeli doda kolona, taj keš zna
--  ostati star — i tada `select('*')` vrati red BEZ nove kolone. Bez greške,
--  bez ijednog traga.
--
--  Tako je `weekend_price_cents` jednom stajao u bazi na 30000, SQL Editor ga
--  je uredno pokazivao, a sajt je subotu i dalje naplaćivao po osnovnoj
--  cijeni. Nijedno ponovno pokretanje migracije to nije moglo popraviti, jer
--  problem nije bio u bazi nego u sloju iznad nje.
--
--  Ovaj jedan red mu kaže da ponovo pročita shemu.
-- ───────────────────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';


-- ───────────────────────────────────────────────────────────────────────────
--  11. PROVJERA
--
--  Ako je ovdje sve prošlo, u izlazu piše "TreeScape: shema je spremna."
--  Ako nešto fali, migracija pukne s jasnom porukom umjesto da tiho ostavi
--  bazu u pola posla.
-- ───────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_no_overlap') then
    raise exception 'Ograničenje bookings_no_overlap nedostaje — dvostruki booking bi bio moguć!';
  end if;

  if not exists (select 1 from public.settings where id = 1) then
    raise exception 'Nema početnog reda u tabeli settings.';
  end if;

  raise notice 'TreeScape: shema je spremna.';
end;
$$;
