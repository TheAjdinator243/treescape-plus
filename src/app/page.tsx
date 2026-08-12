import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LanguageChooser } from '@/components/i18n/LanguageChooser';
import { getStrings, localePath } from '@/lib/i18n';
import { getChosenLocale, getLocale } from '@/lib/i18n/server';
import { localeAlternates } from '@/lib/seo';

/**
 * Goli `/` — raskrsnica prema tri jezične verzije.
 *
 * Sadržaj sajta ovdje ne stoji; on živi na /bs, /en i /ar. Ovdje se samo bira
 * kuda dalje, i to najčešće bez ijednog klika: ko je jednom birao, ide pravo
 * na svoj jezik (to riješi `proxy.ts`, prije nego se ova stranica uopće
 * iscrta). Ekran s pitanjem vidi samo onaj ko ovdje dolazi prvi put.
 *
 * Za pretraživače je ovo `x-default`: adresa na koju se šalje posjetilac čiji
 * jezik sajt ne govori.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getStrings(locale);

  return {
    title: `${t.site.name} — ${t.site.tagline}`,
    description: t.site.description,
    // Kanonska adresa ove stranice je ona sama, a ne nijedna jezična verzija —
    // zato se uzima samo spisak jezika, bez `canonical` iz pomoćnika.
    alternates: { canonical: '/', languages: localeAlternates(locale).languages },
  };
}

export default async function IzborJezika() {
  const chosen = await getChosenLocale();
  if (chosen) redirect(localePath(chosen));

  // Bez izbora se kruženje naslova započinje jezikom preglednika — to je
  // najbolje što se o posjetiocu zna prije nego išta klikne.
  const suggested = await getLocale();

  return <LanguageChooser suggested={suggested} />;
}
