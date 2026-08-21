import type { Metadata } from 'next';
import Link from 'next/link';

import { getStrings, localePath } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';

/**
 * Stranica koje nema.
 *
 * Stoji u korijenu, pa hvata SVE promašaje — i one izvan `[locale]`, gdje
 * raspored s tamnom kožom nikad ne stigne da se iscrta. Dok je nije bilo,
 * Next je crtao svoju: čisto bijel ekran, engleski tekst, bez ijednog traga
 * kuće. Na nju se najlakše dolazi preko ostarjelog linka na rezervaciju, dakle
 * baš onda kad gost traži nešto svoje.
 *
 * Zato omotač stoji ovdje ručno: `<div data-skin="onyx" className="plus">` je
 * ono što ovoj stranici daje boje, pismo i teksturu sajta.
 *
 * Bez `SmoothScroll` — nema se šta skrolati.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NijeNadjeno() {
  const locale = await getLocale();
  const t = getStrings(locale);

  return (
    <div data-skin="onyx" className="plus">
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="plus-eyebrow justify-center">404</p>

        <h1 className="plus-ink text-3xl sm:text-4xl">{t.notFound.title}</h1>

        <p className="plus-dim max-w-[42ch] text-base leading-relaxed">{t.notFound.lead}</p>

        <Link href={localePath(locale)} className="plus-btn-accent mt-2 px-8 py-4">
          {t.notFound.home}
        </Link>
      </main>
    </div>
  );
}
