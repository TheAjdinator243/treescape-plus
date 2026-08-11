/**
 * Ograničavanje broja zahtjeva — jednostavno, u memoriji procesa.
 *
 * Šta ovo JESTE: prepreka skripti koja u petlji gađa pristupni kod ili u
 * minuti napravi tri stotine rezervacija. To zaustavlja.
 *
 * Šta ovo NIJE: potpuna zaštita. Brojači žive u memoriji jedne instance, pa se
 * na Vercelu gube pri hladnom startu i ne dijele između instanci — napadač koji
 * pogodi više instanci dobija više pokušaja. Prava odbrana pristupnog koda je
 * njegova dužina (vidi `MIN_ACCESS_CODE_LENGTH` u `admin-auth.ts`); ovo je
 * samo prvi sloj. Ako sajt ikad naraste, ovo se mijenja za Upstash/Redis, a
 * pozivaoci ostaju isti.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Gornja granica broja ključeva.
 *
 * Bez nje bi sama zaštita postala rupa: dovoljno je slati zahtjeve s hiljadu
 * različitih adresa i mapa raste dok procesu ne ponestane memorije. Kad se
 * granica dostigne, prvo se izbace istekli unosi; ako ni to ne pomogne, mapa
 * se prazni u cijelosti — brojanje kreće ispočetka, ali proces preživi.
 */
const MAX_KEYS = 10_000;

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Koliko sekundi do sljedećeg pokušaja — ide u `Retry-After`. */
  retryAfter: number;
};

/**
 * Broji jedan pokušaj i kaže smije li proći.
 *
 * Prozor je fiksan: prvi pokušaj ga otvara, `limit` pokušaja stane unutra, a
 * nakon `windowMs` brojač kreće od nule. Namjerno se NE produžava pri svakom
 * odbijenom pokušaju — inače napadač koji kuca bez prestanka sam sebi drži
 * kaznu vječno otvorenom, a to je isto što i trajna blokada te adrese.
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      prune(now);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfter: 0 };
}

/** Uspješna prijava briše brojač — pogrešan kod jednom ne smije smetati sutra. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Samo za testove: čisto stanje između slučajeva. */
export function __clearRateLimits(): void {
  buckets.clear();
}
