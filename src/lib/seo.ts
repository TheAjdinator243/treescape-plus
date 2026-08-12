import { LOCALES, localePath, type Locale } from '@/lib/i18n';

/**
 * `hreflang` veze između tri jezične verzije iste stranice.
 *
 * Bez ovoga Google tri adrese s istim sadržajem na tri jezika vidi kao tri
 * odvojene stranice koje se međusobno takmiče, pa jednu odabere a ostale
 * potisne — najčešće baš onu koja gostu treba. Ovako zna da su to iste
 * stranice i svakom posjetiocu ponudi njegovu.
 *
 * `x-default` pokazuje na goli `/`, gdje se bira jezik: to je odgovor na
 * pitanje "a gdje da pošaljem nekoga čiji jezik ne govoriš".
 *
 * Adrese su relativne — Next.js ih razrješava kroz `metadataBase`, pa isti kod
 * radi i na localhostu i na pravom domenu.
 *
 * @param locale jezik STRANICE koja se upravo iscrtava (odatle `canonical`)
 * @param pathname putanja bez jezika, npr. '/uslovi'
 */
export function localeAlternates(
  locale: Locale,
  pathname = '/'
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = { 'x-default': '/' };

  for (const other of LOCALES) {
    languages[other] = localePath(other, pathname);
  }

  return { canonical: localePath(locale, pathname), languages };
}
