import { NextResponse } from 'next/server';

import { readJson, requireDatabase } from '@/lib/api-helpers';
import { recordPageView } from '@/lib/analytics';
import { rateLimitKey } from '@/lib/client-ip';
import { requireSameOrigin } from '@/lib/csrf';
import { localeFromRequest } from '@/lib/i18n';
import { consumeRateLimit } from '@/lib/rate-limit';
import { trackSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Koliko upisa smije jedna adresa.
 *
 * Ruta je javna i piše u bazu, pa je najprivlačnija meta na sajtu: bez granice
 * jedna petlja napuni tabelu za nekoliko minuta i pokvari sve brojke, a
 * usput potroši kvotu baze.
 *
 * Šezdeset u minuti je iznad svega što pravi posjetilac može napraviti —
 * stranica javlja jednom po otvaranju, ne po skrolu — a daleko ispod onoga
 * što skripti treba da bi bila korisna.
 */
const MAX_EVENTS = 60;
const WINDOW_MS = 60_000;

/**
 * Bilježenje jedne posjete.
 *
 * ── Zašto se javlja iz preglednika, a ne broji na serveru ─────────────────
 * Brojanje pri iscrtavanju stranice djeluje jednostavnije, ali broji i ono što
 * nije posjetilac: pretraživače, provjere dostupnosti, Vercelove interne
 * pozive i unaprijed učitane stranice koje niko nije ni vidio. Poziv iz
 * preglednika znači da je stranica stvarno otvorena.
 *
 * ── Šta ovdje NE ulazi ───────────────────────────────────────────────────
 * Ništa što klijent pošalje ne završava u bazi kako je stiglo. Adresa
 * stranice se svodi na putanju bez upitnika, izvor na goli domen, a sam
 * posjetilac na dnevni sažetak koji sutra više ne vrijedi. Vidi `analytics.ts`.
 */
export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  // Brojač posjeta na tuđem sajtu ne bi bio brojač nego smetnja.
  const wrongOrigin = requireSameOrigin(request, locale);
  if (wrongOrigin) return wrongOrigin;

  const key = rateLimitKey(request, 'track');
  if (key) {
    const limit = consumeRateLimit(key, MAX_EVENTS, WINDOW_MS);
    // Prekoračenje se ne javlja greškom: brojač nije usluga koju posjetilac
    // traži, pa ga njegov odgovor ne smije ni zanimati.
    if (!limit.allowed) return new NextResponse(null, { status: 204 });
  }

  const notReady = requireDatabase(locale);
  if (notReady) return new NextResponse(null, { status: 204 });

  const parsed = trackSchema.safeParse(await readJson(request));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  await recordPageView(request, {
    path: parsed.data.path,
    locale: parsed.data.locale ?? null,
    device: parsed.data.device ?? null,
    // Izvor se čita iz zaglavlja, ne iz tijela — zaglavlje piše preglednik,
    // tijelo piše stranica.
    referrer: request.headers.get('referer'),
  });

  // Prazan odgovor: stranica ne čeka ništa i nema šta prikazati.
  return new NextResponse(null, { status: 204 });
}
