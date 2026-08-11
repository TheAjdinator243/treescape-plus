import 'server-only';

import { NextResponse } from 'next/server';

import { ADMIN_COOKIE, isValidSession } from './admin-session';
import { requireSameOrigin } from './csrf';
import { DEFAULT_LOCALE, getStrings, type Locale } from './i18n';

/**
 * Provjera ovlaštenja NA SAMOJ RUTI.
 *
 * `proxy.ts` već stoji ispred svega pod /api/admin i to ostaje — ali biti
 * jedini čuvar je previše posla za jedno mjesto. Dovoljna je jedna omaška u
 * `matcher`-u, jedna ruta premještena van tog stabla ili jedna greška u samom
 * okviru, i podaci gostiju su vani. Ne bi bilo ni greške u logu: ruta bi
 * jednostavno odgovorila svakome ko pita.
 *
 * Isti mehanizam je već bio probijen u stvarnom svijetu — u Next.js-u se
 * krajem 2025. pokazalo da se provjera u međusloju može preskočiti podmetnutim
 * zaglavljem (CVE-2025-29927). Verzija ovdje je zakrpljena, ali pouka ostaje:
 * ruta koja čuva tuđe ime, email i telefon mora sama znati ko je pozvao.
 *
 * Zato svaka admin ruta počinje sa:
 *
 *     const denied = await requireAdmin(request, locale);
 *     if (denied) return denied;
 *
 * Provjeravaju se dvije stvari, i obje moraju proći:
 *   1. sesija  — potpisan kolačić koji nije istekao,
 *   2. porijeklo — zahtjev je krenuo s našeg sajta, a ne s tuđe stranice
 *      koja se vozi na vlasnikovoj otvorenoj sesiji (vidi `csrf.ts`).
 */

/** Čita jedan kolačić iz zaglavlja, bez oslanjanja na kontekst okvira. */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;

    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }

  return undefined;
}

export async function requireAdmin(
  request: Request,
  locale: Locale = DEFAULT_LOCALE
): Promise<NextResponse | null> {
  const t = getStrings(locale);

  const authorized = await isValidSession(readCookie(request, ADMIN_COOKIE));
  if (!authorized) {
    return NextResponse.json({ error: t.errors.NOT_ALLOWED }, { status: 401 });
  }

  return requireSameOrigin(request, locale);
}
