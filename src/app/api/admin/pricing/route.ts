import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-guard';
import {
  describeIssues,
  invalidInput,
  readJson,
  requireDatabase,
  serverError,
} from '@/lib/api-helpers';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ratePeriodSchema, settingsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Izmjena osnovnih postavki i cijena. */
export async function PUT(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidInput(locale, describeIssues(parsed.error));

  if (parsed.data.max_nights < parsed.data.min_nights) {
    return NextResponse.json({ error: getStrings(locale).errors.MAX_BELOW_MIN }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('settings').update(parsed.data).eq('id', 1);

  if (error) {
    console.error('[treescape] izmjena postavki nije uspjela:', error.message);
    return serverError(locale, error.message);
  }

  return NextResponse.json({ ok: true });
}

/** Dodavanje sezone. */
export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const parsed = ratePeriodSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidInput(locale, describeIssues(parsed.error));

  if (parsed.data.end_date <= parsed.data.start_date) {
    return NextResponse.json({ error: getStrings(locale).errors.INVALID_RANGE }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('rate_periods').insert(parsed.data);

  if (error) {
    console.error('[treescape] dodavanje sezone nije uspjelo:', error.message);
    return serverError(locale, error.message);
  }

  return NextResponse.json({ ok: true });
}

/** Brisanje sezone. */
export async function DELETE(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  /**
   * `rate_periods.id` je uuid. Provjerava se ovdje, a ne tek u bazi: bilo šta
   * drugo Postgres odbija greškom o tipu, koja se onda vraća pozivaocu kao
   * gola poruka iz baze umjesto uredne "neispravan zahtjev".
   */
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !UUID.test(id)) return invalidInput(locale);

  const { error } = await supabaseAdmin().from('rate_periods').delete().eq('id', id);

  if (error) {
    console.error('[treescape] brisanje sezone nije uspjelo:', error.message);
    return serverError(locale, error.message);
  }

  return NextResponse.json({ ok: true });
}
