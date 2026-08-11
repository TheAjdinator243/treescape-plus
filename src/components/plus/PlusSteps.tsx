import { LineReveal } from '@/components/motion/LineReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getServerStrings } from '@/lib/i18n/server';

/**
 * Kako rezervacija teče, u tri koraka.
 *
 * Postoji zbog jednog pitanja koje gost inače postavi telefonom: "jesam li ja
 * ovo sad rezervisao ili nisam?". Odgovor stoji i u čestim pitanjima, ali tamo
 * ga pročita tek onaj ko dotle skrola — a ovo je stvar koju treba znati PRIJE
 * nego se otvori kalendar, ne poslije.
 *
 * Ništa ovdje nije obećanje: sva tri koraka opisuju tačno ono što kod stvarno
 * radi — kalendar uživo, zaključavanje termina pri slanju zahtjeva, i mail s
 * odlukom domaćina.
 */
export async function PlusSteps() {
  const { t } = await getServerStrings();

  return (
    <section id="kako-ide" className="border-y plus-rule plus-surface-alt">
      <div className="plus-section">
        <Reveal>
          <p className="plus-eyebrow">{t.steps.eyebrow}</p>
        </Reveal>
        <LineReveal as="h2" className="plus-title" text={t.steps.heading} />
        <LineReveal as="p" className="plus-lead" text={t.steps.lead} delay={120} stagger={70} />

        <ol className="mt-14 grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
          {t.steps.items.map((step, i) => (
            <Reveal
              key={step.title}
              as="li"
              delay={i * 110}
              className="plus-card-lift flex h-full flex-col p-7 lg:p-8"
            >
              <span
                className="plus-sans inline-flex h-10 w-10 items-center justify-center rounded-full plus-badge text-sm font-semibold tabular-nums"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              <h3
                className="mt-6 text-2xl plus-ink"
                style={{ fontFamily: 'var(--font-plus-display)' }}
              >
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed plus-dim">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
