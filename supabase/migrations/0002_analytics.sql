-- ════════════════════════════════════════════════════════════════════════
--  0002 — Posjete stranici
-- ════════════════════════════════════════════════════════════════════════
--
--  Zašto vlastita tabela, a ne Google Analytics ili sličan servis:
--
--  1. Podaci ostaju kod vlasnika, u istoj bazi kao i rezervacije. Nema
--     trećeg lica kojem se šalje ko je šta gledao.
--  2. Brojke se vide U ADMINISTRACIJI, uz zaradu, a ne na tuđoj kontrolnoj
--     ploči na koju se treba posebno prijavljivati.
--  3. Ne treba kolačić-baner. Vanjski servisi ga traže jer prate osobu kroz
--     vrijeme; ovdje se ne prati niko.
--
--  ── Šta se NE čuva ────────────────────────────────────────────────────
--  Ni IP adresa, ni cijeli user-agent, ni bilo šta po čemu se osoba može
--  prepoznati. `visitor_hash` je jednosmjerni sažetak koji se računa sa
--  soli koja se MIJENJA SVAKI DAN — vidi `lib/analytics.ts`. Zbog toga se
--  isti posjetilac sutra ne može povezati s današnjim, pa ovo nije lični
--  podatak nego brojač.

create table if not exists public.page_views (
  id            bigint generated always as identity primary key,

  -- Dan se zapisuje odvojeno od vremena, jer se po njemu grupiše svaki
  -- izvještaj. Bez toga bi svaka brojka tražila računanje datuma iz
  -- vremenske oznake nad cijelom tabelom.
  day           date not null default (now() at time zone 'utc')::date,

  path          text not null,
  locale        text,

  -- Dnevni sažetak posjetioca. Isti čovjek isti dan = isti sažetak, pa se
  -- razlikuje "posjeta" od "pregleda stranice". Sutra je drugi.
  visitor_hash  text not null,

  -- Samo domen s kojeg je došao (google.com, instagram.com), nikad puna
  -- adresa — ona zna sadržavati pretragu koju je neko ukucao.
  referrer_host text,

  -- 'phone' | 'tablet' | 'desktop'. Iz širine ekrana, ne iz user-agenta.
  device        text,

  created_at    timestamptz not null default now()
);

-- Svaki izvještaj počinje s "od kad do kad", pa indeks ide na dan.
create index if not exists page_views_day_idx on public.page_views (day desc);

-- Za "koliko različitih ljudi danas" — brojanje po sažetku unutar dana.
create index if not exists page_views_day_visitor_idx on public.page_views (day, visitor_hash);

-- ── Zaštita ─────────────────────────────────────────────────────────────
--
-- RLS uključen, POLITIKA NIJEDNA — isto kao nad `bookings`. Javni ključ
-- koji stoji u pregledniku ne može ovu tabelu ni pročitati ni pisati u nju.
-- Upisuje samo server, servisnim ključem, kroz `/api/track`.
alter table public.page_views enable row level security;

-- ── Čišćenje ────────────────────────────────────────────────────────────
--
-- Redovi stariji od godinu dana se brišu. Dvije koristi: tabela ne raste
-- bez kraja, i podaci se ne čuvaju duže nego što ikome trebaju. Poziva se
-- iz iste cron rute koja oslobađa istekle termine.
create or replace function public.prune_page_views()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.page_views
   where day < (now() at time zone 'utc')::date - interval '365 days';

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_page_views() from public, anon, authenticated;
