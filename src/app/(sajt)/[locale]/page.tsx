import type { Metadata } from 'next';

import { PlusAbout } from '@/components/plus/PlusAbout';
import { PlusBooking } from '@/components/plus/PlusBooking';
import { PlusCta } from '@/components/plus/PlusCta';
import { PlusExtras } from '@/components/plus/PlusExtras';
import { PlusFaq } from '@/components/plus/PlusFaq';
import { PlusFooter } from '@/components/plus/PlusFooter';
import { PlusHero } from '@/components/plus/PlusHero';
import { PlusLocation } from '@/components/plus/PlusLocation';
import { PlusNav } from '@/components/plus/PlusNav';
import { PlusShowcase } from '@/components/plus/PlusShowcase';
import { PlusSteps } from '@/components/plus/PlusSteps';
import { getBookingContext } from '@/lib/data';
import { getLocale } from '@/lib/i18n/server';
import { firstFreeDate, lowestNightlyCents } from '@/lib/pricing';
import { localeAlternates } from '@/lib/seo';

/**
 * Početna stranica.
 *
 * Redoslijed odjeljaka nije slučajan: između "o kući" i fotografija stoji
 * objašnjenje kako rezervacija teče (`PlusSteps`), a prije podnožja
 * posljednji poziv (`PlusCta`) — oba odgovaraju na pitanja koja gost inače
 * postavi telefonom.
 *
 * Fotografija nosi svoj naslov i opis pored sebe (`PlusShowcase`), a ono što
 * nema fotografiju stoji u popisu ispod (`PlusExtras`) — jer se wifi i mašina
 * za veš slikom ionako ne dokazuju.
 *
 * `force-dynamic` jer se dostupnost termina mijenja u svakom trenutku:
 * unaprijed izgrađena stranica bi gostu pokazala kalendar od jučer.
 */
export const dynamic = 'force-dynamic';

/**
 * Naslov i opis stoje u korijenskom layoutu; ovdje se dodaje samo ono što
 * layout ne može znati — koja je adresa ove stranice i gdje su joj sestre na
 * druga dva jezika.
 */
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: localeAlternates(await getLocale()) };
}

export default async function Pocetna() {
  const context = await getBookingContext();
  const fromCents = lowestNightlyCents(context.periods, context.settings);

  // Prvi slobodan datum se računa OVDJE, a ne u heroju: hero je serverska
  // komponenta bez pristupa terminima, a ovako je i vidljivo da podatak dolazi
  // iz istog `context` iz kojeg se puni i kalendar.
  const firstFree = firstFreeDate(context.slots);

  return (
    <>
      <PlusNav />
      <main>
        <PlusHero
          fromCents={fromCents}
          symbol={context.settings.currency_symbol}
          firstFree={firstFree}
        />
        <PlusAbout />
        <PlusSteps />
        <PlusShowcase />
        <PlusExtras />
        <PlusBooking context={context} />
        <PlusLocation />
        <PlusFaq settings={context.settings} />
        <PlusCta />
      </main>
      <PlusFooter />
    </>
  );
}
