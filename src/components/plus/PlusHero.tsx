import Image from 'next/image';

import { Scene } from '@/components/motion/Scene';
import { TextReveal } from '@/components/motion/TextReveal';
import { formatLong, todayStr } from '@/lib/dates';
import { HERO_IMAGE } from '@/lib/gallery';
import { getServerStrings } from '@/lib/i18n/server';
import { formatMoney } from '@/lib/pricing';

import { CanopyTop, TreelineBottom } from './Treeline';

/**
 * Naslovna scena.
 *
 * Odjeljak je visok dva i po ekrana, a njegov sadržaj stoji na vrhu dok se
 * kroz njega skrola (`Scene`). Rezultat je da stranica naizgled stane, a
 * kamera krene naprijed: krošnja se diže, četinari se spuštaju, fotografija
 * raste, ime kuće se razmakne preko sredine, i sve se na kraju ispere u boju
 * papira — na kojoj počinje sljedeći odjeljak.
 *
 * ── Odakle dubina ─────────────────────────────────────────────────────────
 * Iz razlike brzina, ne iz uvećanja. Prednji slojevi rastu oko tri puta više
 * od fotografije, a nebo iza jedva primjetno. To oko čita kao KRETANJE
 * NAPRIJED; da svi rastu jednako, vidjelo bi se samo uvećavanje slike.
 *
 * Prednji slojevi su crteži, a ne fotografija, i to iz nužde: da bi kamera
 * mogla proći kroz nešto, taj sloj mora biti izrezan od pozadine, s
 * prozirnošću. Fotografija kuće je jedna ravna slika (vidi `Treeline.tsx`).
 *
 * ── Šta se NE gubi ────────────────────────────────────────────────────────
 * Cijeli tekst — naslov, cijena, podaci o kući i prvi slobodan termin — stoji
 * u HTML-u koji stiže sa servera, u prvom kadru scene. Google i čitač ekrana
 * ga vide bez obzira na to što ga animacija kasnije skloni.
 */
export async function PlusHero({
  fromCents,
  symbol,
  firstFree,
}: {
  fromCents: number;
  symbol: string;
  /** Prvi slobodan datum, ili `null` ako slobodnog nema u naredne dvije godine. */
  firstFree: string | null;
}) {
  const { locale, t } = await getServerStrings();

  const freeToday = firstFree === todayStr();

  const facts = [
    { value: '8', label: t.about.stats.guests },
    { value: '2', label: t.about.stats.bedrooms },
    { value: '2', label: t.about.stats.bathrooms },
  ];

  return (
    <Scene id="vrh" className="plus-scene plus-surface-deepest">
      <div className="plus-scene-pin">
        {/* ── Sloj 1: nebo ─────────────────────────────────────────────── */}
        <div
          className="scene-sky absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(120% 90% at 50% 15%, #24493a 0%, #12251d 55%, #081310 100%)',
          }}
        />

        {/* ── Sloj 2: fotografija kuće ─────────────────────────────────── */}
        <div className="scene-photo absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt={t.hero.imageAlt}
            fill
            // `priority` jer je ovo prvo što posjetilac vidi — ne smije kasniti.
            priority
            sizes="100vw"
            placeholder="blur"
            className="object-cover"
          />
          {/* Opna preko fotografije: bez nje su i bijeli tekst i tamna silueta
              nečitljivi na svijetlom dijelu slike. */}
          <div className="plus-photo-veil absolute inset-0" aria-hidden="true" />
        </div>

        {/* ── Sloj 3: ime kuće u prostoru ──────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p
            className="scene-ghost select-none whitespace-nowrap text-[13vw] leading-none text-paper-50/25"
            style={{ fontFamily: 'var(--font-plus-display)' }}
            aria-hidden="true"
          >
            {t.site.name}
          </p>
        </div>

        {/* ── Sloj 4: krošnja i četinari, prednji plan ─────────────────── */}
        <CanopyTop className="scene-canopy-top pointer-events-none absolute inset-x-0 top-0 h-[26svh] w-full plus-silhouette" />
        <TreelineBottom className="scene-trees-bottom pointer-events-none absolute inset-x-0 bottom-0 h-[34svh] w-full plus-silhouette" />

        {/* ── Sloj 5: tekst ────────────────────────────────────────────── */}
        <div className="scene-copy absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-32 sm:px-8 sm:pb-20 md:pb-24">
            <p className="animate-fade-rise plus-sans flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] plus-accent-on">
              <span className="plus-accent-line h-px w-8" aria-hidden="true" />
              {t.hero.eyebrow}
            </p>

            <TextReveal
              as="h1"
              text={t.hero.title}
              delay={120}
              className="mt-5 block text-[3.6rem] leading-[1] text-white sm:text-7xl md:text-8xl lg:text-[7.5rem]"
            />

            <p
              className="animate-fade-rise mt-6 max-w-xl text-lg leading-relaxed text-paper-100 sm:text-xl"
              style={{ animationDelay: '260ms' }}
            >
              {t.hero.subtitle}
            </p>

            <div
              className="animate-fade-rise mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '340ms' }}
            >
              {/* Na telefonu su dugmad jedno ispod drugog i preko cijele
                  širine — dvije pilule različite širine uz lijevu ivicu
                  izgledaju kao greška, a i palac ih teže pogodi. */}
              <a href="#rezervacija" className="plus-btn-accent px-8 py-4 text-base">
                {t.hero.cta}
              </a>
              <a href="#galerija" className="plus-btn-onlight px-7 py-4 text-base">
                {t.hero.secondaryCta}
              </a>
            </div>

            <dl
              className="animate-fade-rise mt-9 flex flex-wrap items-baseline gap-x-7 gap-y-3 text-paper-100 sm:gap-x-9"
              style={{ animationDelay: '420ms' }}
            >
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-baseline gap-2">
                  <dt className="sr-only">{fact.label}</dt>
                  <dd className="flex items-baseline gap-2">
                    <span
                      className="text-2xl text-white"
                      style={{ fontFamily: 'var(--font-plus-display)' }}
                    >
                      {fact.value}
                    </span>
                    <span className="text-sm text-paper-200/85">{fact.label}</span>
                  </dd>
                </div>
              ))}

              <div className="flex items-baseline gap-2">
                <dt className="text-sm text-paper-200/85">{t.common.from}</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span
                    className="text-2xl text-white"
                    style={{ fontFamily: 'var(--font-plus-display)' }}
                  >
                    {formatMoney(fromCents, symbol, locale)}
                  </span>
                  <span className="text-sm text-paper-200/85">/ {t.common.day}</span>
                </dd>
              </div>
            </dl>

            {/* Prvi slobodan datum — isti podatak koji crta kalendar niže, samo
                izračunat unaprijed. Nema ga jedino ako je sve zauzeto dvije
                godine unaprijed, pa se tada red i ne ispisuje. */}
            {firstFree && (
              <p
                className="animate-fade-rise plus-chip-onlight mt-6"
                style={{ animationDelay: '500ms' }}
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-pulse-ring plus-pulse absolute inset-0 rounded-full" />
                  <span className="plus-pulse relative h-2 w-2 rounded-full" />
                </span>
                {freeToday ? t.hero.freeToday : t.hero.freeFrom(formatLong(firstFree, locale))}
              </p>
            )}
          </div>
        </div>

        {/* ── Sloj 6: ispiranje u boju papira ──────────────────────────── */}
        <div
          className="scene-wash plus-surface pointer-events-none absolute inset-0"
          aria-hidden="true"
        />

        {/* Nagovještaj da scena traži skrol. Nestaje zajedno s tekstom. */}
        <div className="scene-copy pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
          <span className="plus-sans flex flex-col items-center gap-3 text-[0.7rem] uppercase tracking-[0.25em] text-white/60">
            {t.hero.scroll}
            <span
              className="relative block h-10 w-px overflow-hidden bg-white/25"
              aria-hidden="true"
            >
              <span className="animate-scroll-hint absolute inset-x-0 top-0 block h-4 bg-white/90" />
            </span>
          </span>
        </div>
      </div>
    </Scene>
  );
}
