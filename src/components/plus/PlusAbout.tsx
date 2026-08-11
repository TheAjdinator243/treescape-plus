import Image from 'next/image';

import { Counter } from '@/components/motion/Counter';
import { LineReveal } from '@/components/motion/LineReveal';
import { Parallax } from '@/components/motion/Parallax';
import { Reveal } from '@/components/motion/Reveal';
import { ABOUT_IMAGE } from '@/lib/gallery';
import { getServerStrings } from '@/lib/i18n/server';

/**
 * O kući.
 *
 * Raspored je namjerno nesimetričan — slika je uža od teksta i spuštena za
 * jedan korak. Dvije jednake kolone poravnate po vrhu izgledaju kao tabela;
 * pomak od jednog koraka izgleda kao stranica iz časopisa.
 *
 * Brojevi se odbroje kad dođu na ekran, ali se serverski ispisuju već gotovi
 * (vidi `motion/Counter.tsx`) — i Google i čitač ekrana vide "8", a ne "0".
 */
export async function PlusAbout() {
  const { t } = await getServerStrings();

  const stats = [
    { value: 8, label: t.about.stats.guests },
    { value: 2, label: t.about.stats.bedrooms },
    { value: 2, label: t.about.stats.bathrooms },
  ];

  return (
    <section id="o-kuci" className="plus-surface">
      <div className="plus-section grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Reveal>
            <p className="plus-eyebrow">{t.site.tagline}</p>
          </Reveal>
          <LineReveal as="h2" className="plus-title" text={t.about.heading} />
          <LineReveal as="p" className="plus-lead" text={t.about.lead} delay={120} stagger={70} />

          <Reveal delay={80}>
            <div className="mt-8 space-y-5 text-base leading-[1.8] plus-dim md:text-[1.05rem]">
              {t.about.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <dl className="mt-12 grid grid-cols-3 gap-x-4 border-t plus-rule pt-8">
              {stats.map((stat) => (
                // flex-col-reverse: u kodu prvo ide <dt> (kako HTML i traži),
                // a na ekranu se broj vidi iznad opisa.
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="mt-2 text-sm plus-dimmer">{stat.label}</dt>
                  <dd
                    className="text-4xl plus-accent md:text-5xl"
                    style={{ fontFamily: 'var(--font-plus-display)' }}
                  >
                    <Counter value={stat.value} className="tabular-nums" />
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* `lg:pt-16` je taj jedan korak spuštanja. Ispod `lg` ga nema — tamo je
            slika ionako ispod teksta, pa bi bio samo praznina. */}
        <Reveal delay={120} variant="clip" className="lg:col-span-5 lg:pt-16">
          <div className="relative aspect-[4/5] overflow-hidden rounded-panel shadow-raise">
            {/* Slika je viša od okvira (`-inset-y-12`) da se pri pomjeranju ne
                vidi rub ispod nje. Sporija je od hero fotografije: ovo je
                unutar kartice, pa i mali pomak izgleda veliko. */}
            <Parallax speed={0.07} className="absolute -inset-y-12 inset-x-0">
              <Image
                src={ABOUT_IMAGE}
                alt={t.about.imageAlt}
                fill
                placeholder="blur"
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </Parallax>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
