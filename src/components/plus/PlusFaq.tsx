import { LineReveal } from '@/components/motion/LineReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getServerStrings } from '@/lib/i18n/server';
import type { Settings } from '@/lib/types';

/**
 * Česta pitanja.
 *
 * Harmonika je izvedena preko <details>/<summary> — preglednik već zna kako se
 * to otvara, zatvara i čita čitačem ekrana, pa ovdje nema ni reda JS-a.
 *
 * Sama pitanja žive u rječnicima: dio odgovora zavisi od postavki (vrijeme
 * prijave, broj gostiju), pa `faq.items` prima te podatke i vraća gotov tekst.
 *
 * Naslov s lijeve strane je ljepljiv i stoji dok pitanja prolaze pored njega —
 * na dugom spisku to je jedina stvar koja gostu govori gdje se nalazi.
 */
export async function PlusFaq({ settings }: { settings: Settings }) {
  const { t } = await getServerStrings();

  const items = t.faq.items({
    checkinTime: settings.checkin_time,
    checkoutTime: settings.checkout_time,
    maxGuests: settings.max_guests,
  });

  return (
    <section id="pitanja" className="border-t plus-rule plus-surface">
      <div className="plus-section grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <p className="plus-eyebrow">{t.nav.faq}</p>
          <LineReveal as="h2" className="plus-title" text={t.faq.heading} />
          <LineReveal as="p" className="plus-lead" text={t.faq.lead} delay={120} stagger={70} />
        </Reveal>

        <div className="border-t plus-rule">
          {items.map((item, i) => (
            <Reveal key={item.q} delay={Math.min(i, 5) * 50}>
              <details className="group border-b plus-rule">
                <summary className="plus-sans flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-start text-lg font-medium plus-ink transition-colors hover:plus-accent [&::-webkit-details-marker]:hidden">
                  {item.q}

                  {/* Plus koji se pri otvaranju okrene u minus: uspravna crta
                      se skupi po visini. Jedan pokret, bez druge ikone. */}
                  <span
                    className="relative h-4 w-4 shrink-0 plus-link transition-transform duration-300 ease-[var(--ease-out-expo)] group-open:rotate-180"
                    aria-hidden="true"
                  >
                    <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-current" />
                    <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 ease-[var(--ease-out-expo)] group-open:scale-y-0" />
                  </span>
                </summary>

                <p className="max-w-2xl pb-6 pe-10 text-base leading-relaxed plus-dim">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
