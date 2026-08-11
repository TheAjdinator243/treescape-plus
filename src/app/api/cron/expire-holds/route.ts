import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { env, isDatabaseConfigured } from '@/lib/env';
import { getStrings } from '@/lib/i18n';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Poređenje tajne u konstantnom vremenu — iz istog razloga kao kod pristupnog
 * koda: obični `!==` stane na prvom različitom znaku, pa se iz trajanja
 * odgovora tajna može pogađati znak po znak. Sažetak izjednačava dužine.
 */
function matchesCronSecret(header: string | null, secret: string): boolean {
  if (!header) return false;

  const a = createHash('sha256').update(header, 'utf8').digest();
  const b = createHash('sha256').update(`Bearer ${secret}`, 'utf8').digest();

  return timingSafeEqual(a, b);
}

/**
 * Oslobađa termine kojima je istekao rok — nezavršene uplate i bankovne
 * transfere koji nikad nisu legli na račun.
 *
 * Ovo je REZERVNA mreža, ne glavna odbrana: iste termine oslobađa i svako
 * čitanje dostupnosti (vidi `releaseExpiredHolds`), pa i svaki upis nove
 * rezervacije. Zato zastoj crona ne može zaključati termin — najgore što se
 * desi je da baza nakratko nosi redove koje niko ne gleda.
 *
 * Zbog toga je i raspored u `vercel.json` samo jednom dnevno: češće nije
 * potrebno, a Vercel na besplatnom planu ionako dozvoljava samo dnevni cron.
 */
export async function GET(request: Request) {
  // Ovu rutu zove Vercel Cron, ne gost — poruke idu na jeziku kuće.
  const t = getStrings();

  /**
   * Vercel Cron šalje `Authorization: Bearer <CRON_SECRET>`.
   *
   * Ranije je provjera stajala unutar `if (env.cronSecret)`, pa je ruta bila
   * OTVORENA SVIMA dok varijabla nije postavljena — a to je stanje u kojem
   * sajt prvi put ode u zrak. Sada je obrnuto: bez tajne se ruta ne izvršava.
   * Zaključavanje pri zaboravljenoj varijabli ništa ne lomi, jer istekle
   * termine oslobađa i svako čitanje dostupnosti (vidi bilješku iznad).
   */
  if (!env.cronSecret) {
    console.error('[treescape] CRON_SECRET nije postavljen — cron ruta je zatvorena.');
    return NextResponse.json({ error: t.errors.NOT_ALLOWED }, { status: 401 });
  }

  if (!matchesCronSecret(request.headers.get('authorization'), env.cronSecret)) {
    return NextResponse.json({ error: t.errors.NOT_ALLOWED }, { status: 401 });
  }

  if (!isDatabaseConfigured) {
    return NextResponse.json({ error: t.errors.DATABASE_MISSING }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin().rpc('release_expired_holds');

  if (error) {
    console.error('[treescape] cron oslobađanje nije uspjelo:', error.message);
    return NextResponse.json({ error: t.errors.SERVER_ERROR }, { status: 500 });
  }

  return NextResponse.json({ released: data ?? 0 });
}
