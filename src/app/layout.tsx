import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Serif, Inter, Manrope, Noto_Sans_Arabic } from 'next/font/google';

import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { env } from '@/lib/env';
import { LOCALES, OG_LOCALES, directionOf, getStrings } from '@/lib/i18n';
import { getLocale } from '@/lib/i18n/server';

import './globals.css';

const display = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const sans = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * Ni Inter ni Fraunces nemaju arapsko pismo — bez ovoga bi arapska verzija
 * pala na ono što posjetilac slučajno ima instalirano.
 *
 * `preload: false` je ovdje bitan, i to mjerljivo: dok ga nije bilo, Next je
 * ovaj font preuzimao SVAKOM posjetiocu, jer je njegova promjenljiva stajala
 * na <html> bez obzira na jezik. To je bilo 162 KB od ukupno 361 KB stranice —
 * skoro polovina, za pismo koje bosanski i engleski gost nikad ne vide.
 *
 * Sada se promjenljiva dodaje samo arapskoj stranici (vidi `RootLayout`), pa
 * font preuzme samo onaj kome zaista treba.
 */
/**
 * Pismo ovog sajta.
 *
 * Instrument Serif ima jedan jedini rez (400) i to je namjeran izbor, ne
 * ograničenje: pismo je već visokokontrastno i usko, pa mu podebljanje samo
 * kvari crtež. Sve što treba da bude jače ide u Manrope, koji ima raspon.
 */
const plusDisplay = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
  weight: ['400'],
});

const plusSans = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
});

const arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '500', '600'],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getStrings(locale);

  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: `${t.site.name} — ${t.site.tagline}`,
      template: `%s · ${t.site.name}`,
    },
    description: t.site.description,
    keywords: [...t.site.keywords],
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[locale],
      // Ostale dvije verzije — da onaj ko link podijeli u razgovoru na drugom
      // jeziku dobije pregled na tom jeziku.
      alternateLocale: LOCALES.filter((other) => other !== locale).map(
        (other) => OG_LOCALES[other]
      ),
      siteName: t.site.name,
      title: `${t.site.name} — ${t.site.tagline}`,
      description: t.site.description,
      url: env.siteUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${t.site.name} — ${t.site.tagline}`,
      description: t.site.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#1f4436',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Zajednički okvir za sve stranice.
 *
 * Jezik ovdje dolazi iz adrese (/bs, /en, /ar), i to okolnim putem: korijenski
 * layout ne dobija `params` ugniježđenih segmenata, pa mu `proxy.ts` jezik
 * prosljeđuje kroz zaglavlje zahtjeva. Detalji stoje uz `LOCALE_HEADER`.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      // Arapski se piše zdesna nalijevo. Sve ostalo — raspored, strelice u
      // galeriji, poravnanje u tabelama — visi o ovom jednom atributu, pa se
      // po komponentama nigdje ne provjerava koji je jezik u pitanju.
      dir={directionOf(locale)}
      // Arapski font ide u paket samo arapskoj stranici — vidi `preload: false` gore.
      className={[
        display.variable,
        sans.variable,
        plusDisplay.variable,
        plusSans.variable,
        locale === 'ar' && arabic.variable,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <head>
        {/* Bez JavaScripta nema ni animacije pojavljivanja — sadržaj se
            mora vidjeti odmah, a ne ostati na opacity: 0. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
          {/* Bez JavaScripta se redovi naslova nikad ne izmjere, pa bi ostali
              na `opacity: 0` — tekst bi jednostavno nestao. */}
          <style>{`.line-reveal-word { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      {/*
        `suppressHydrationWarning` stoji SAMO na <body>, i to namjerno.

        Proširenja u pregledniku (antivirusi, upravljači lozinkama) ubacuju svoje
        atribute u <body> prije nego React stigne da poveže stranicu, pa React
        prijavi da se server i klijent ne slažu. To nije greška u kodu i ne može
        se popraviti s naše strane — jedino se može reći Reactu da atribute na
        ovom jednom elementu ne poredi. Djeca se i dalje provjeravaju normalno.
      */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
