import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-guard';
import { describeIssues, invalidInput, readJson, requireDatabase } from '@/lib/api-helpers';
import { blockDates } from '@/lib/booking-service';
import { localeFromRequest } from '@/lib/i18n';
import { blockDatesSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ručno zatvaranje termina (održavanje, lični boravak, dogovor van sajta). */
export async function POST(request: Request) {
  const locale = localeFromRequest(request);

  const denied = await requireAdmin(request, locale);
  if (denied) return denied;

  const notReady = requireDatabase(locale);
  if (notReady) return notReady;

  const parsed = blockDatesSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidInput(locale, describeIssues(parsed.error));

  const result = await blockDates(
    parsed.data.start_date,
    parsed.data.end_date,
    parsed.data.reason,
    locale
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
