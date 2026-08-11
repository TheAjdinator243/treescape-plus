/**
 * Adresa s koje je zahtjev stvarno došao.
 *
 * Ovo je važnije nego što izgleda: po ovoj vrijednosti se broje pokušaji
 * pogađanja pristupnog koda. Ako se uzme pogrešno zaglavlje, brojanje se
 * zaobilazi jednim retkom u `curl`-u i ograničenje prestaje postojati.
 *
 * `x-forwarded-for` je LISTA, a ne jedna adresa: svaki posrednik na putu
 * dopiše svoj unos zdesna. Lijevi kraj liste dolazi od klijenta i on ga smije
 * izmisliti — `X-Forwarded-For: 1.2.3.4` u zahtjevu završi baš tamo. Zato se
 * uzima DESNI kraj (posljednji posrednik, onaj kojem se vjeruje), a ne lijevi.
 *
 * Prije liste se gledaju zaglavlja koja upisuje sama platforma i koja klijent
 * ne može podmetnuti — Vercelova su prva jer ovaj sajt tamo živi.
 */
export function clientIp(request: Request): string | null {
  const platform =
    request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-real-ip');

  if (platform?.trim()) return platform.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (!forwarded) return null;

  const hops = forwarded
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);

  return hops.at(-1) ?? null;
}

/**
 * Ključ za brojanje pokušaja.
 *
 * Kad adrese nema (lokalni razvoj, neobičan hosting), vraća se `null` umjesto
 * neke zamjenske vrijednosti tipa 'nepoznato'. Razlog: takva zamjena bi sve
 * posjetioce svijeta strpala u jedan te isti brojač, pa bi jedan napadač
 * zaključao pristup svima ostalima. Pozivalac tada sam bira šta radi.
 */
export function rateLimitKey(request: Request, scope: string): string | null {
  const ip = clientIp(request);
  return ip ? `${scope}:${ip}` : null;
}
