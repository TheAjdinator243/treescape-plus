import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  createSessionToken,
  isValidAccessCode,
  MIN_ACCESS_CODE_LENGTH,
  sessionCookieOptions,
  type AuthMethod,
} from '@/lib/admin-auth';
import { rateLimitKey } from '@/lib/client-ip';
import { requireSameOrigin } from '@/lib/csrf';
import { env } from '@/lib/env';
import { getStrings, localeFromRequest } from '@/lib/i18n';
import { consumeRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { markTotpUsed, verifyTotp } from '@/lib/totp';
import { adminLoginSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Usporavanje napada grubom silom: pet pokušaja u minuti po adresi.
 *
 * Brojanje ide preko `rateLimitKey`, a ne preko golog `x-forwarded-for`.
 * Razlika je bitna: to zaglavlje je lista kojoj klijent sam piše lijevi kraj,
 * pa je ranije bilo dovoljno uz svaki pokušaj poslati izmišljenu adresu i
 * brojač se nikad ne bi napunio. Sada se uzima ono što upisuje platforma.
 *
 * Kad adrese uopće nema, pokušaji se broje na zajedničkom ključu. To je grubo,
 * ali ide u sigurnu stranu — bez toga bi izostanak zaglavlja bio prolaz.
 *
 * Ograničenje i dalje živi u memoriji jedne instance i nije potpuna zaštita.
 * Prava odbrana je dovoljno dug ADMIN_ACCESS_CODE — vidi `admin-auth.ts`.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const locale = localeFromRequest(request);
  const t = getStrings(locale);

  // Prijava je stanje koje se mijenja, pa i nju se tiče provjera porijekla.
  const wrongOrigin = requireSameOrigin(request, locale);
  if (wrongOrigin) return wrongOrigin;

  if (!env.admin.accessCode || !env.admin.sessionSecret) {
    return NextResponse.json({ error: t.errors.ADMIN_MISSING }, { status: 503 });
  }

  /**
   * Prekratak kod se odbija PRIJE brojanja pokušaja i s jasnom porukom.
   * Bez ovoga bi vlasnik dobijao samo "Pogrešan kod" na kod koji sigurno zna da
   * je tačan, i tražio grešku na pogrešnom mjestu.
   */
  if (env.admin.accessCode.length < MIN_ACCESS_CODE_LENGTH) {
    return NextResponse.json(
      { error: t.errors.ADMIN_CODE_WEAK(MIN_ACCESS_CODE_LENGTH) },
      { status: 503 }
    );
  }

  const key = rateLimitKey(request, 'admin-login') ?? 'admin-login:bez-adrese';
  const limit = consumeRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: t.admin.gateLocked },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: t.errors.INVALID_INPUT }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(payload);

  /**
   * OBA faktora se provjeravaju prije nego se išta odgovori, i neuspjeh bilo
   * kojeg daje ISTU poruku.
   *
   * Zato se ne izlazi čim pristupni kod ne valja: razlika između "pogrešan
   * kod" i "kod je dobar, ali fali broj s telefona" napadaču bi potvrdila da
   * je pogodio prvi faktor — a to je upravo ono što drugi faktor treba da
   * sakrije. Ovako mu jedan pogrešan unos ne kaže ništa o drugom.
   */
  const codeOk = parsed.success && isValidAccessCode(parsed.data.code);

  const methods: AuthMethod[] = ['pwd'];
  let secondFactorOk = true;
  let usedCounter: number | null = null;

  if (env.admin.totpSecret) {
    const entered = parsed.success ? (parsed.data.totp ?? '') : '';
    const result = verifyTotp(env.admin.totpSecret, entered);

    secondFactorOk = result.ok;

    if (result.ok) {
      methods.push('otp');
      usedCounter = result.counter;
    } else {
      // Razlog ostaje u dnevniku vlasnika; korisnik dobija istu poruku u svakom
      // slučaju. "Kod je već iskorišten" bi značilo "pogodio si pravi broj".
      console.warn(`[treescape] prijava odbijena, drugi faktor: ${result.reason}`);
    }
  }

  if (!codeOk || !secondFactorOk) {
    return NextResponse.json({ error: t.admin.gateWrong }, { status: 401 });
  }

  /**
   * Kod s telefona se troši TEK ovdje — kad je prijava zaista uspjela.
   *
   * Da se trošio pri samoj provjeri, pogrešan pristupni kod uz tačan broj s
   * telefona spalio bi taj broj: vlasnik ispravi grešku, prepiše isti broj koji
   * mu još stoji na ekranu, i dobije "pogrešno" bez ijednog objašnjenja.
   */
  if (env.admin.totpSecret && usedCounter !== null) {
    markTotpUsed(env.admin.totpSecret, usedCounter);
  }

  resetRateLimit(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(methods), sessionCookieOptions);
  return response;
}

/** Odjava — briše kolačić sesije. */
export async function DELETE(request: Request) {
  const wrongOrigin = requireSameOrigin(request, localeFromRequest(request));
  if (wrongOrigin) return wrongOrigin;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
