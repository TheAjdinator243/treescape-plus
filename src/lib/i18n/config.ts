/**
 * Jezici sajta — spisak, smjer pisanja i prepoznavanje posjetiočevog jezika.
 *
 * Ovdje namjerno nema nijednog prevoda: datoteku uvoze i preglednik i server i
 * `proxy.ts`, pa mora ostati sitna i bez ijedne zavisnosti.
 */

export const LOCALES = ['bs', 'en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

/** Bosanski je jezik kuće — njega vidi svako ko nije rekao drugačije. */
export const DEFAULT_LOCALE: Locale = 'bs';

/** Kolačić u kojem stoji izbor posjetioca. Nije osjetljiv, pa ga postavlja i preglednik. */
export const LOCALE_COOKIE = 'treescape_jezik';

/** Godinu dana — izbor jezika nije nešto što se pita pri svakoj posjeti. */
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

export type Direction = 'ltr' | 'rtl';

const DIRECTIONS: Record<Locale, Direction> = {
  bs: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};

export function directionOf(locale: Locale): Direction {
  return DIRECTIONS[locale];
}

/**
 * Oznake za `Intl` (novac, množina) i za `lang` atribut.
 *
 * Arapski namjerno ide sa `-u-nu-latn`, dakle sa "našim" ciframa. Razlog je
 * praktičan: datume ispisuje date-fns, koji arapsko-indijske cifre (٣٤٥) ne
 * koristi, pa bi iznos od 345 KM i datum 5.8.2026. bili pisani dvjema različitim
 * vrstama cifara na istom ekranu. IBAN i poziv na broj se ionako prepisuju u
 * aplikaciju banke, gdje samo latinične cifre imaju smisla.
 */
const INTL_TAGS: Record<Locale, string> = {
  bs: 'bs-BA',
  en: 'en-GB',
  ar: 'ar-u-nu-latn',
};

export function intlTag(locale: Locale): string {
  return INTL_TAGS[locale];
}

/** Oznaka za Open Graph (`og:locale`). */
export const OG_LOCALES: Record<Locale, string> = {
  bs: 'bs_BA',
  en: 'en_GB',
  ar: 'ar_AR',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * 'en-US', 'EN', ' ar ' → 'en', 'en', 'ar'. Sve ostalo → `null`.
 *
 * Prima i pune BCP-47 oznake jer tako dolaze i iz kolačića starijih verzija i
 * iz `Accept-Language` zaglavlja.
 */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const base = value.trim().toLowerCase().split('-')[0];
  return isLocale(base) ? base : null;
}

/**
 * Prvi jezik iz `Accept-Language` koji sajt zaista govori, po težini (`q`).
 *
 * Preglednik šalje npr. `ar,en-GB;q=0.9,en;q=0.8`. Bez sortiranja bi jezik s
 * najmanjom težinom mogao pobijediti samo zato što je prvi na spisku.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const wanted = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';').map((s) => s.trim());
      const q = params
        .map((p) => /^q=([\d.]+)$/i.exec(p))
        .find((m): m is RegExpExecArray => m !== null);
      return { tag, quality: q ? Number(q[1]) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.quality) && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const entry of wanted) {
    const locale = normalizeLocale(entry.tag);
    if (locale) return locale;
  }

  return null;
}

/** Vrijednost jednog kolačića iz sirovog `Cookie` zaglavlja. */
function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }

  return null;
}

/**
 * Jezik za API rute i sve ostalo što u ruci ima goli `Request`.
 *
 * Izričit izbor iz kolačića uvijek pobjeđuje ono što preglednik nagađa —
 * ko je jednom kliknuo "English", ne želi poruku o grešci na bosanskom.
 */
export function localeFromRequest(request: Request): Locale {
  return (
    normalizeLocale(cookieValue(request.headers.get('cookie'), LOCALE_COOKIE)) ??
    localeFromAcceptLanguage(request.headers.get('accept-language')) ??
    DEFAULT_LOCALE
  );
}
