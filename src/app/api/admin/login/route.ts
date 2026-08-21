import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  createSessionToken,
  isValidAccessCode,
  MIN_ACCESS_CODE_LENGTH,
  sessionCookieOptions,
  type AuthMethod,
} from '@/lib/admin-auth';
import { readJson } from '@/lib/api-helpers';
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

/**
 * Ukupno pokušaja prijave na jednoj instanci, bez obzira ko ih šalje.
 * Namjerno visoko: ovo nije granica za čovjeka nego za skriptu.
 */
const MAX_GLOBAL_ATTEMPTS = 100;
const GLOBAL_WINDOW_MS = 30 * 60_000;
const GLOBAL_KEY = 'admin-login:ukupno';

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

  /*
   * Dva brojača, i drugi postoji zbog rupe u prvom.
   *
   * Prvi broji po adresi. To je pravo ponašanje prema stvarnim ljudima —
   * jedan pogrešan unos ne smije zaključati sve ostale. Ali adresa se čita iz
   * zaglavlja, a zaglavlje piše onaj ko šalje zahtjev. Iza Vercela to nije
   * problem: platforma upisuje `x-vercel-forwarded-for` i klijentovu vrijednost
   * pregazi. Postavi li se sajt igdje gdje tog posrednika nema — goli
   * `next start` na serveru, posrednik koji zaglavlje prosljeđuje kako je
   * stiglo — napadač mijenja `X-Forwarded-For` u svakom zahtjevu i svaki put
   * dobija svjež brojač. Provjereno: pet pokušaja s iste adrese daju 429, a
   * tri pokušaja s tri izmišljene adrese prolaze sva tri.
   *
   * Drugi brojač zato ne gleda ko pita. Broji SVE pokušaje prijave na ovoj
   * instanci — i uspjele i neuspjele, jer se u trenutku brojanja ishod još ne
   * zna — i staje na stotinu u pola sata. Vlasnik se ne prijavljuje stotinu
   * puta u pola sata; skripta koja rotira adrese pređe tu granicu za nekoliko
   * sekundi.
   *
   * Ovo ne zamjenjuje dužinu koda — dvanaest znakova iz `admin-auth.ts` ostaje
   * prava odbrana. Ovo je sloj koji stoji kad ta pretpostavka o posredniku
   * padne, a padne tiho.
   */
  const globalLimit = consumeRateLimit(GLOBAL_KEY, MAX_GLOBAL_ATTEMPTS, GLOBAL_WINDOW_MS);
  if (!globalLimit.allowed) {
    return NextResponse.json(
      { error: t.admin.gateLocked },
      { status: 429, headers: { 'Retry-After': String(globalLimit.retryAfter) } }
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

  // Kroz `readJson`, a ne kroz goli `request.json()`: tako i ova ruta dobija
  // gornju granicu veličine tijela. Prijava je meta na koju se šalje najviše
  // smeća, pa je zadnja koja bi smjela raščlanjivati šta god stigne.
  const parsed = adminLoginSchema.safeParse(await readJson(request));

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
