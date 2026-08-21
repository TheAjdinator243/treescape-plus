import 'server-only';

import { createHash } from 'node:crypto';

import { supabaseAdmin } from './supabase/admin';
import { clientIp } from './client-ip';
import { env } from './env';

/**
 * Brojanje posjeta — bez kolačića, bez praćenja osobe kroz vrijeme.
 *
 * ── Kako se broji "osoba" bez kolačića ────────────────────────────────────
 * Kolačić bi bio najlakši i tražio bi baner. Umjesto njega, svaki posjetilac
 * dobija dnevni sažetak: jednosmjerni hash adrese i preglednika, posoljen
 * vrijednošću koja se MIJENJA SVAKI DAN.
 *
 * Posljedica je namjerna: isti čovjek se u istom danu prepozna (pa se zna
 * razlika između "sto pregleda" i "sto ljudi"), a sutra više ne — jučerašnji i
 * današnji sažetak istog čovjeka nemaju nikakve veze. Time ovo prestaje biti
 * lični podatak i postaje brojač. To je isti pristup koji koriste servisi koji
 * se reklamiraju kao "bez kolačića".
 *
 * ── Odakle so ─────────────────────────────────────────────────────────────
 * Iz servisnog ključa baze i datuma. Ključ je ionako obavezan da bi se išta
 * upisalo, nikad ne napušta server, a hash o njemu ne odaje ništa. Tako nema
 * nove varijable okruženja koju bi neko morao postaviti — a zaboravljena
 * varijabla ovdje bi značila da so nikad ne rotira.
 */
function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${env.supabase.serviceRoleKey ?? 'bez-kljuca'}:${day}`)
    .digest('hex');
}

export function visitorHash(request: Request): string {
  const ip = clientIp(request) ?? 'bez-adrese';
  const agent = request.headers.get('user-agent') ?? 'bez-agenta';

  return createHash('sha256').update(`${dailySalt()}:${ip}:${agent}`).digest('hex').slice(0, 32);
}

/**
 * Domen s kojeg je posjetilac došao — nikad puna adresa.
 *
 * Puna adresa zna nositi i ono što je neko ukucao u pretragu. Za izvještaj je
 * dovoljno "google.com" ili "instagram.com"; sve iza toga je tuđa stvar.
 */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    // Dolazak s vlastitog sajta nije "izvor" nego kretanje kroz stranice.
    return host === new URL(env.siteUrl).hostname.replace(/^www\./, '') ? null : host;
  } catch {
    return null;
  }
}

export interface PageViewInput {
  path: string;
  locale: string | null;
  device: string | null;
  referrer: string | null;
}

/** Upis jedne posjete. Nikad ne baca — brojač ne smije srušiti stranicu. */
export async function recordPageView(request: Request, input: PageViewInput): Promise<void> {
  try {
    await supabaseAdmin()
      .from('page_views')
      .insert({
        path: input.path.slice(0, 200),
        locale: input.locale?.slice(0, 5) ?? null,
        device: input.device,
        referrer_host: referrerHost(input.referrer),
        visitor_hash: visitorHash(request),
      });
  } catch (error) {
    console.error('[treescape] posjeta nije zabilježena:', error);
  }
}

export interface TrafficSummary {
  /** Različitih posjetilaca i pregleda, po rasponima. */
  visitorsToday: number;
  viewsToday: number;
  visitors30: number;
  views30: number;
  visitors365: number;
  views365: number;
  /** Posljednjih 30 dana, redom — za crtanje trake. */
  daily: { day: string; visitors: number; views: number }[];
  topPaths: { path: string; views: number }[];
  topReferrers: { host: string; views: number }[];
  languages: { locale: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
}

const EMPTY: TrafficSummary = {
  visitorsToday: 0,
  viewsToday: 0,
  visitors30: 0,
  views30: 0,
  visitors365: 0,
  views365: 0,
  daily: [],
  topPaths: [],
  topReferrers: [],
  languages: [],
  devices: [],
};

interface Row {
  day: string;
  path: string;
  locale: string | null;
  visitor_hash: string;
  referrer_host: string | null;
  device: string | null;
}

/**
 * Sve brojke o posjetama, iz jednog čitanja.
 *
 * Namjerno se povlači godina dana sirovih redova pa se broji u memoriji,
 * umjesto desetak zasebnih upita s `group by`. Za ovaj obim — jedna kuća,
 * nekoliko hiljada posjeta godišnje — to je jedno čitanje umjesto deset, i
 * jedno mjesto na kojem se logika brojanja može pročitati. Ako tabela ikad
 * naraste preko stotinu hiljada redova, ovo se mijenja za poglede u bazi.
 */
export async function getTrafficSummary(): Promise<TrafficSummary> {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin()
    .from('page_views')
    .select('day, path, locale, visitor_hash, referrer_host, device')
    .gte('day', since)
    .limit(200_000);

  if (error) {
    console.error('[treescape] čitanje posjeta nije uspjelo:', error.message);
    return EMPTY;
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return EMPTY;

  const today = new Date().toISOString().slice(0, 10);
  const day30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const uniq = (list: Row[]) => new Set(list.map((r) => r.visitor_hash)).size;
  const inRange = (from: string) => rows.filter((r) => r.day >= from);

  const todayRows = rows.filter((r) => r.day === today);
  const rows30 = inRange(day30);

  // Trideset dana unazad, uključujući i one bez ijedne posjete — inače traka
  // izgleda kao da je posjeta bilo svaki dan.
  const daily: TrafficSummary['daily'] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const dayRows = rows.filter((r) => r.day === day);
    daily.push({ day, visitors: uniq(dayRows), views: dayRows.length });
  }

  const tally = <T>(list: Row[], pick: (r: Row) => T | null, unique: boolean) => {
    const map = new Map<T, Set<string> | number>();
    for (const row of list) {
      const key = pick(row);
      if (key === null || key === undefined || key === '') continue;

      if (unique) {
        const set = (map.get(key) as Set<string> | undefined) ?? new Set<string>();
        set.add(row.visitor_hash);
        map.set(key, set);
      } else {
        map.set(key, ((map.get(key) as number | undefined) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .map(([key, value]) => ({
        key,
        count: value instanceof Set ? value.size : value,
      }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    visitorsToday: uniq(todayRows),
    viewsToday: todayRows.length,
    visitors30: uniq(rows30),
    views30: rows30.length,
    visitors365: uniq(rows),
    views365: rows.length,
    daily,
    topPaths: tally(rows30, (r) => r.path, false)
      .slice(0, 8)
      .map((e) => ({ path: e.key, views: e.count })),
    topReferrers: tally(rows30, (r) => r.referrer_host, false)
      .slice(0, 8)
      .map((e) => ({ host: e.key, views: e.count })),
    languages: tally(rows30, (r) => r.locale, true).map((e) => ({
      locale: e.key,
      visitors: e.count,
    })),
    devices: tally(rows30, (r) => r.device, true).map((e) => ({
      device: e.key,
      visitors: e.count,
    })),
  };
}
