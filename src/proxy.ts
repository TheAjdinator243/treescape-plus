import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_COOKIE, isValidSession } from '@/lib/admin-session';
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  getStrings,
  localeFromPathname,
  localeFromRequest,
  localePath,
  normalizeLocale,
} from '@/lib/i18n';

/**
 * Čuvar administracije i pravila o sadržaju (CSP).
 *
 * (U Next.js-u 16 se ovo zove `proxy`; ranije se isti mehanizam zvao
 * `middleware`.)
 *
 * Dvije stvari, jedno mjesto — jer obje moraju vidjeti svaki zahtjev prije
 * nego se odgovor sastavi.
 */

/**
 * Jednokratni potpis za skripte.
 *
 * Bez njega bi CSP morao dozvoliti `'unsafe-inline'` za skripte, a to je isto
 * što i nemati CSP: ubačena skripta se izvršava kao i svaka druga. Next.js
 * svoje skripte ubacuje direktno u stranicu (tako prenosi podatke iz servera u
 * preglednik), pa im treba propusnica — ovaj broj je ta propusnica. Pravi se
 * nanovo za svaki zahtjev, pa je napadač ne može unaprijed pogoditi i upisati
 * u svoju skriptu.
 *
 * Next.js ga sam pokupi kad `Content-Security-Policy` vidi među ZAGLAVLJIMA
 * ZAHTJEVA — zato se isto zaglavlje postavlja i tamo, ne samo u odgovoru.
 */
function csp(nonce: string): string {
  const dev = process.env.NODE_ENV !== 'production';

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    // Klikjacking: stranica se ne smije otvoriti u tuđem okviru. Bez ovoga
    // napadač preko providnog okvira navede vlasnika da klikne "Otkaži".
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Stilovi ostaju s `'unsafe-inline'`: Next.js i Tailwind ih ubacuju u
    // stranicu, a ubačeni stil ne može izvršiti kod — samo skripta može.
    "style-src 'self' 'unsafe-inline'",
    // `'strict-dynamic'`: skripta koja je prošla s propusnicom smije učitati
    // svoje dijelove. Bez toga Next.js ne može dovući ostatak koda stranice.
    // `'unsafe-eval'` traži Fast Refresh i postoji SAMO u razvoju.
    dev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Kalendar sluša promjene uživo preko Supabase-a, i to WebSocket-om.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    /*
     * Karta lokacije je OpenStreetMap okvir.
     *
     * Bez ovog reda važi `default-src 'self'`, pa preglednik odbije okvir s
     * porukom "Refused to frame 'https://www.openstreetmap.org/'" — a gost na
     * mjestu karte vidi praznu plohu. Tako je i bilo, na sve tri verzije
     * sajta, sve dok se to nije izmjerilo.
     *
     * Dozvola je uska koliko može biti: jedan domen, i to samo za okvir.
     * `frame-ancestors 'none'` iznad i dalje brani da NAS neko uokviri —
     * ovo su dva različita smjera i ne poništavaju se.
     */
    'frame-src https://www.openstreetmap.org',
    'upgrade-insecure-requests',
  ].join('; ');
}

function withSecurityHeaders(response: NextResponse, policy: string): NextResponse {
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

/**
 * Jezik u adresi: /bs, /en, /ar.
 *
 * Dvije stvari se ovdje rješavaju, obje samo za javni dio sajta:
 *
 * 1. Adresa BEZ jezika se preusmjerava na onu s jezikom. To pokriva i golo `/`,
 *    i stare linkove (`/uslovi`, `/rezervacija/<token>`) koji su već otišli u
 *    mailove i poruke — oni moraju nastaviti raditi.
 *
 * 2. Adresa S jezikom nastavlja dalje, ali se jezik ubaci u zaglavlja zahtjeva.
 *    Korijenski `layout.tsx` piše `lang` i `dir` na <html>, a `params` iz
 *    `[locale]` ne vidi (vidi `LOCALE_HEADER`).
 *
 * Šta odlučuje jezik pri preusmjeravanju: prvo izričit izbor iz kolačića, pa
 * `Accept-Language`, pa bosanski. Ko je jednom kliknuo "English", ne završava
 * na bosanskoj verziji zato što je otvorio goli domen.
 */
function withLocale(request: NextRequest, headers: Headers, policy: string): NextResponse {
  const { pathname, search } = request.nextUrl;

  const inPath = localeFromPathname(pathname);

  if (inPath) {
    headers.set(LOCALE_HEADER, inPath);
    return withSecurityHeaders(NextResponse.next({ request: { headers } }), policy);
  }

  // Goli `/` je raskrsnica: ko je jezik već birao, prolazi kroz nju bez
  // zaustavljanja; ko nije, dobija pitanje. Ovdje se, dakle, gleda SAMO
  // kolačić — nagađanje iz preglednika ne smije preskočiti pitanje.
  if (pathname === '/') {
    const chosen = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
    if (!chosen) return withSecurityHeaders(NextResponse.next({ request: { headers } }), policy);

    return withSecurityHeaders(
      NextResponse.redirect(new URL(localePath(chosen) + search, request.url)),
      policy
    );
  }

  // Sve ostalo bez jezika u adresi su stari linkovi — `/uslovi`,
  // `/rezervacija/<token>` iz mailova koji su odavno poslani. Oni moraju
  // nastaviti raditi, pa se prevode na verziju s jezikom.
  const target = new URL(localePath(localeFromRequest(request), pathname) + search, request.url);
  return withSecurityHeaders(NextResponse.redirect(target), policy);
}

/**
 * Provjera stoji ispred svake admin stranice i svake admin API rute, pa nijedna
 * nova ruta ne može slučajno ostati nezaštićena — dovoljno je da putanja počinje
 * sa /admin ili /api/admin.
 *
 * `/api/admin/login` je jedini izuzetak: to su vrata na koja se kuca.
 *
 * OVO NIJE JEDINA BRAVA. Svaka admin API ruta istu stvar provjerava i sama,
 * kroz `requireAdmin`. Razlog stoji ispisan u `admin-guard.ts`: čuvar na jednom
 * mjestu pada zajedno s jednom omaškom u `matcher`-u ispod, a ono što bi tada
 * ispalo su imena, mailovi i telefoni gostiju.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const policy = csp(nonce);

  // Next.js čita propusnicu odavde i upisuje je u svoje skripte.
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);

  const proceed = () => withSecurityHeaders(NextResponse.next({ request: { headers } }), policy);

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isApi = pathname.startsWith('/api/');

  if (!isAdminPath && !isApi) return withLocale(request, headers, policy);

  if (!isAdminPath && !isAdminApi) return proceed();

  if (pathname === '/api/admin/login') return proceed();

  const authorized = await isValidSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (authorized) return proceed();

  // API rute dobijaju 401; stranice se vraćaju na /admin, koja bez sesije
  // prikaže polje za unos koda.
  if (isAdminApi) {
    const t = getStrings(localeFromRequest(request));
    return withSecurityHeaders(
      NextResponse.json({ error: t.errors.NOT_ALLOWED }, { status: 401 }),
      policy
    );
  }

  if (pathname !== '/admin') {
    return withSecurityHeaders(NextResponse.redirect(new URL('/admin', request.url)), policy);
  }

  return proceed();
}

export const config = {
  /**
   * Sve osim onoga što se servira kao gotova datoteka.
   *
   * CSP mora stići uz SVAKU stranicu, ne samo uz administraciju — zato je
   * matcher širok. Statičke datoteke (`_next/static`, slike) su izuzete: kroz
   * njih se ne izvršava ništa, a svaki suvišan prolazak kroz ovaj kod usporava
   * učitavanje.
   */
  /*
   * `opengraph-image` mora ostati IZUZET, i to nije kozmetika.
   *
   * Next.js sliku za pregled linka servira na jednoj jedinoj adresi, u
   * korijenu (`/opengraph-image.jpg`), a jezične stranice u svoje zaglavlje
   * upisuju baš nju. Da prolazi kroz ovaj kod, pravilo o jeziku bi je —
   * kao adresu bez jezika — preusmjerilo na `/bs/opengraph-image.jpg`, gdje
   * ničega nema. Instagram i WhatsApp bi tada opet pokazivali link bez slike,
   * ovaj put s ispravnim zaglavljem, pa bi se uzrok teško našao.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|opengraph-image|twitter-image|images/).*)',
  ],
};
