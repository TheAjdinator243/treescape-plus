import { notFound } from 'next/navigation';

import { PageView } from '@/components/analytics/PageView';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { LOCALES, isLocale, type Locale } from '@/lib/i18n';

/**
 * Koža javnog dijela sajta, ispod jezika u adresi.
 *
 * `plus` uključuje IZGLED (pismo, razmake, oblike), a `data-skin` bira BOJE
 * tog izgleda. Nijedna komponenta ne piše boju u svom JSX-u — sve idu preko
 * imena poslova (`plus-ink`, `plus-surface`, `plus-rule`, `plus-ink-on`), pa
 * se cijeli sajt presvlači ovom jednom riječju. Izbaci li se `data-skin`,
 * vraća se svijetla, papirnata varijanta.
 *
 * Stoji ovdje, a ne na <body>, iz jednog razloga: administracija ne smije
 * naslijediti ni pismo ni boje javnog sajta. Ona je alat, a ne izlog.
 */

/**
 * Tri jezika, tri adrese — Next.js ih zna unaprijed.
 *
 * Stranice su ionako `force-dynamic` (dostupnost termina), pa se ovdje ništa
 * ne gradi unaprijed; spisak služi da Next.js zna da drugih vrijednosti nema.
 */
export function generateStaticParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function SajtLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Do ovdje `proxy.ts` pušta samo poznate jezike, ali provjera stoji i ovdje:
  // proxy se može zaobići (npr. `next start` bez njega), a /xyz ne smije
  // završiti kao stranica na bosanskom pod tuđom adresom.
  if (!isLocale(locale)) notFound();

  return (
    <div data-skin="onyx" className="plus">
      {/* Glatki skrol s inercijom — samo onome ko nije tražio manje animacija. */}
      <SmoothScroll />
      {/* Brojač posjeta. Bez kolačića i bez praćenja kroz vrijeme — vidi
          `lib/analytics.ts`. Stoji ovdje, u rasporedu jezika, pa hvata sve
          stranice sajta i nijednu iz administracije. */}
      <PageView locale={locale} />
      {children}
    </div>
  );
}
