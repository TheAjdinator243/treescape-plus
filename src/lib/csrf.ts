import { NextResponse } from 'next/server';

import { env } from './env';
import { DEFAULT_LOCALE, getStrings, type Locale } from './i18n';

/**
 * Zaštita od zahtjeva koje je poslala tuđa stranica (CSRF).
 *
 * Napad ide ovako: vlasnik je prijavljen u administraciju, otvori bilo koju
 * drugu stranicu, a ta stranica u pozadini pošalje zahtjev na naš sajt.
 * Preglednik uz zahtjev uredno prilijepi kolačić sesije — jer kolačić ide po
 * odredištu, ne po tome ko je zahtjev pokrenuo — i server izvrši naredbu
 * misleći da ju je vlasnik tražio. Otkazana rezervacija, promijenjena cijena,
 * oslobođen termin: sve bez ijednog klika vlasnika.
 *
 * `SameSite=lax` na kolačiću ovo već uveliko sprječava, ali se oslanja na to
 * da preglednik radi svoj posao. Ovdje se isto pita i server, jer sesija čuva
 * tuđe ime, email i telefon, pa jedan sloj nije dovoljan.
 *
 * Provjera je jednostavna: `Origin` kaže s koje je stranice zahtjev krenuo, i
 * to zaglavlje JavaScript ne može promijeniti — postavlja ga sam preglednik.
 * Ako ne pokazuje na nas, zahtjev ne prolazi.
 */

/** Metode koje nešto mijenjaju — samo njih se ovo tiče. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostnameOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Imena domaćina kojima se vjeruje: adresa na koju je zahtjev stigao i ona
 * upisana u `NEXT_PUBLIC_SITE_URL`. Druga je tu zbog objava na kojima se
 * unutrašnja adresa razlikuje od one koju gost vidi.
 */
function allowedHostnames(request: Request): Set<string> {
  const allowed = new Set<string>();

  const self = hostnameOf(request.url);
  if (self) allowed.add(self);

  const configured = hostnameOf(env.siteUrl);
  if (configured) allowed.add(configured);

  return allowed;
}

export function isSameOrigin(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  /**
   * `Referer` je rezerva za `Origin`. Preglednici uz POST/PUT/DELETE šalju
   * `Origin` bez izuzetka, ali stariji i neobični klijenti znaju poslati samo
   * `Referer`, pa se i on prihvata.
   *
   * Ako nema nijednog, zahtjev se ODBIJA. To znači da `curl` bez zaglavlja ne
   * može dirati administraciju — namjerno: alat lako doda `-H "Origin: ..."`,
   * a napad iz preglednika ne može lagati o njemu.
   */
  const source =
    hostnameOf(request.headers.get('origin')) ??
    hostnameOf(request.headers.get('referer'));

  if (!source) return false;

  return allowedHostnames(request).has(source);
}

export function requireSameOrigin(
  request: Request,
  locale: Locale = DEFAULT_LOCALE
): NextResponse | null {
  if (isSameOrigin(request)) return null;

  return NextResponse.json({ error: getStrings(locale).errors.NOT_ALLOWED }, { status: 403 });
}
