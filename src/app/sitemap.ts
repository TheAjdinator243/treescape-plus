import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { LOCALES, localePath } from '@/lib/i18n';

/**
 * Stranice koje smiju u pretragu, i koliko se koja mijenja.
 *
 * Potvrde (`/rezervacija/<token>`) i administracija ovdje namjerno ne stoje —
 * to su tuđi podaci, a ne izlog.
 */
const PAGES = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
  // Pravni tekstovi se rijetko mijenjaju i nisu ono što se traži preko
  // pretraživača, ali moraju biti pronalazivi — i Googleu i onome ko
  // provjerava da sajt ima politiku privatnosti.
  { path: '/privatnost', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/uslovi', changeFrequency: 'yearly' as const, priority: 0.3 },
];

/**
 * Svaka stranica se prijavljuje TRI puta — po jednom za svaki jezik — i uz
 * svaku stoje adrese ostale dvije (`alternates.languages`).
 *
 * Bez toga bi Google tri jezične verzije vidio kao tri odvojene stranice sa
 * sličnim sadržajem i sam birao koju će pokazati. Ovako zna da su iste, pa
 * gostu iz Emirata ponudi arapsku, a domaćem bosansku.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const languages = (path: string) =>
    Object.fromEntries(
      LOCALES.map((locale) => [locale, `${env.siteUrl}${localePath(locale, path)}`])
    );

  return PAGES.flatMap(({ path, changeFrequency, priority }) =>
    LOCALES.map((locale) => ({
      url: `${env.siteUrl}${localePath(locale, path)}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: languages(path) },
    }))
  );
}
