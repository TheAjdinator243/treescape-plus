import 'server-only';

import { addDaysStr, todayStr } from './dates';
import { DEMO_SETTINGS, demoPeriods, demoSlots } from './demo-data';
import { env, isDatabaseConfigured } from './env';
import { availableMethods } from './payments';
import { supabaseAdmin } from './supabase/admin';
import type { AvailabilitySlot, BookingContext, RatePeriod, Settings } from './types';

/**
 * Koliko najmanje vremena mora proći između dva čišćenja isteklih termina.
 *
 * Bez ovoga se pri SVAKOM učitavanju stranice išlo do baze i pokretao UPDATE.
 * Trenutno taj UPDATE ne može pogoditi nijedan red — `hold_expires_at` postavlja
 * samo način plaćanja koji ima rok, a gotovina ga nema (`holdHours: null`) —
 * pa je to bio odlazak preko mreže koji svakom posjetiocu doda kašnjenje, a ne
 * uradi ništa.
 *
 * Minuta je bezopasna: rokovi se mjere satima i danima, a dnevni cron ostaje
 * kao druga mreža.
 */
const HOLD_SWEEP_MS = 60_000;

/**
 * Kad je čišćenje zadnji put pokrenuto — po instanci servera.
 *
 * Na Vercelu svaka instanca ima svoje pamćenje i gubi ga pri hladnom startu.
 * To je u redu: gubitak pamćenja znači jedno čišćenje viška, nikad manjak.
 */
let lastHoldSweep = 0;

/**
 * Oslobađa termine kojima je istekao rok — online uplate koje gost nije
 * dovršio i eventualne buduće uplate s rokom.
 *
 * Zove se prije čitanja dostupnosti i prije svakog upisa. Ne oslanjamo se samo
 * na cron: da cron zakaže, termin bi ostao zaključan zauvijek, a ovako ga
 * oslobodi prvi sljedeći posjetilac stranice.
 *
 * `force` preskače ograničenje — upis rezervacije ga koristi, jer tamo tačnost
 * u toj sekundi vrijedi više od jednog odlaska do baze.
 */
export async function releaseExpiredHolds(force = false): Promise<void> {
  if (!isDatabaseConfigured) return;

  const now = Date.now();
  if (!force && now - lastHoldSweep < HOLD_SWEEP_MS) return;
  lastHoldSweep = now;

  const { error } = await supabaseAdmin().rpc('release_expired_holds');
  if (error) {
    // Nije razlog da stranica padne — u najgorem slučaju je kalendar
    // nakratko konzervativniji nego što mora biti.
    console.error('[treescape] release_expired_holds nije uspio:', error.message);
  }
}

/** Zauzeti termini od danas pa dvije godine unaprijed. */
export async function getAvailability(): Promise<AvailabilitySlot[]> {
  if (!isDatabaseConfigured) return demoSlots();

  await releaseExpiredHolds();

  const horizon = addDaysStr(todayStr(), 730);

  const { data, error } = await supabaseAdmin()
    .from('availability_slots')
    .select('booking_id, start_date, end_date, kind')
    .gte('end_date', todayStr())
    .lte('start_date', horizon)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[treescape] čitanje dostupnosti nije uspjelo:', error.message);
    return [];
  }

  return (data ?? []) as AvailabilitySlot[];
}

export async function getRatePeriods(): Promise<RatePeriod[]> {
  if (!isDatabaseConfigured) return demoPeriods();

  const { data, error } = await supabaseAdmin()
    .from('rate_periods')
    .select('id, name, start_date, end_date, nightly_price_cents, min_nights, priority')
    .order('priority', { ascending: false });

  if (error) {
    console.error('[treescape] čitanje cjenovnika nije uspjelo:', error.message);
    return [];
  }

  return (data ?? []) as RatePeriod[];
}

/**
 * Postavke iz baze, s popunjenim rupama i glasnom prijavom ako ih ima.
 *
 * ── Zašto ovo postoji ──────────────────────────────────────────────────────
 * `select('*')` ne pita Postgres direktno nego PostgREST, koji drži KEŠIRANU
 * sliku sheme. Kad se tabeli doda kolona, taj keš zna ostati star — i tada
 * `*` vrati red BEZ nove kolone. Bez greške, bez ijednog traga u logu.
 *
 * To se već desilo: `weekend_price_cents` je u bazi stajao na 30000, SQL
 * Editor ga je uredno pokazivao, a aplikacija ga nije vidjela. Posljedica je
 * bila `undefined > 0` → `false`, pa je vikend tiho išao po osnovnoj cijeni.
 * Gost je plaćao 250 umjesto 300, a nigdje se nije imalo šta pročitati.
 *
 * Zato se svaka vrijednost sada provjerava. Ako je nema, uzima se
 * podrazumijevana (da sajt radi ispravno) i ispisuje se tačno koja kolona
 * fali i šta uraditi (da se problem vidi, umjesto da se plaća).
 */
function normalizeSettings(row: Record<string, unknown>): Settings {
  const missing: string[] = [];

  function pick<K extends keyof Settings>(key: K): Settings[K] {
    const value = row[key as string];
    const expected = typeof DEMO_SETTINGS[key];

    if (typeof value === expected && value !== null) return value as Settings[K];

    missing.push(key as string);
    return DEMO_SETTINGS[key];
  }

  const settings: Settings = {
    id: pick('id'),
    default_nightly_cents: pick('default_nightly_cents'),
    weekend_price_cents: pick('weekend_price_cents'),
    cleaning_fee_cents: pick('cleaning_fee_cents'),
    currency: pick('currency'),
    currency_symbol: pick('currency_symbol'),
    min_nights: pick('min_nights'),
    max_nights: pick('max_nights'),
    max_guests: pick('max_guests'),
    checkin_time: pick('checkin_time'),
    checkout_time: pick('checkout_time'),
    hold_minutes: pick('hold_minutes'),
    bank_account_name: pick('bank_account_name'),
    bank_name: pick('bank_name'),
    bank_iban: pick('bank_iban'),
    transfer_days: pick('transfer_days'),
  };

  if (missing.length > 0) {
    console.error(
      `[treescape] POSTAVKE NEPOTPUNE — baza ne vraća kolone: ${missing.join(', ')}.\n` +
        '  Umjesto njih su uzete podrazumijevane vrijednosti, pa cijene možda nisu one koje si postavio.\n' +
        '  1) Pokreni supabase/migrations/0001_init.sql u Supabase → SQL Editor\n' +
        "  2) Pa pokreni: notify pgrst, 'reload schema';\n" +
        '  (Druga stavka je bitna: PostgREST drži keširanu shemu i ne vidi nove kolone dok mu se ne kaže.)'
    );
  }

  return settings;
}

export async function getSettings(): Promise<Settings> {
  if (!isDatabaseConfigured) return DEMO_SETTINGS;

  const { data, error } = await supabaseAdmin().from('settings').select('*').eq('id', 1).single();

  if (error || !data) {
    console.error('[treescape] čitanje postavki nije uspjelo:', error?.message);
    return DEMO_SETTINGS;
  }

  return normalizeSettings(data as Record<string, unknown>);
}

/** Sve što kalendaru treba za prvi prikaz — u jednom prolazu. */
export async function getBookingContext(): Promise<BookingContext> {
  const [slots, periods, settings] = await Promise.all([
    getAvailability(),
    getRatePeriods(),
    getSettings(),
  ]);

  // Spisak načina plaćanja se pravi na SERVERU. Preglednik ga samo iscrtava,
  // a koji je stvarno dozvoljen ponovo se provjerava pri upisu rezervacije.
  const paymentMethods = availableMethods(settings, env.enableTestPayments).map((m) => m.id);

  return { slots, periods, settings, paymentMethods };
}
