'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { LineReveal } from '@/components/motion/LineReveal';
import { Reveal } from '@/components/motion/Reveal';
import { ScrollRange } from '@/components/motion/ScrollRange';
import { Lightbox, galleryStep } from '@/components/site/Lightbox';
import { GALLERY } from '@/lib/gallery';

/**
 * Kuća, dio po dio.
 *
 * Osam fotografija preko cijele širine ekrana, jedna ispod druge, bez razmaka
 * — traka kadrova kroz koju se prolazi. Naslov i opis stoje NA fotografiji, u
 * njenom donjem uglu, a strana se izmjenjuje red po red.
 *
 * ── Zašto tekst na slici ipak ostaje čitljiv ──────────────────────────────
 * Zato što ispod njega ide zatamnjenje, i to samo pri dnu: od pune tame do
 * prozirnog na dvije trećine visine. Gornji dio fotografije ostaje netaknut,
 * pa se slika i dalje vidi kakva jeste, a slova imaju na čemu da stoje. Ravna
 * prozirna ploha preko cijele slike bi je cijelu isprala.
 *
 * ── Pokret ────────────────────────────────────────────────────────────────
 * Sve visi o `--q` iz `ScrollRange` — koliko je fotografija prošla kroz ekran.
 * Iz tog jednog broja `globals.css` računa tri različite brzine: fotografija
 * se lagano otvara i klizi, tekst ide sporije i u suprotnom smjeru, krupna
 * brojka iza teksta najsporije. Razlika u brzinama je ono što pravi dubinu —
 * kad bi se svi slojevi kretali jednako, ne bi se micalo ništa.
 *
 * Povrh toga, kad red prvi put uđe u ekran, naslov se otkriva RED PO RED
 * (`LineReveal`); to je jednokratno i ne ponavlja se pri povratku gore.
 *
 * Klik bilo gdje po fotografiji je otvara preko cijelog ekrana.
 */
export function PlusShowcase() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(() => setOpenIndex((i) => galleryStep(i, -1)), []);
  const next = useCallback(() => setOpenIndex((i) => galleryStep(i, 1)), []);

  return (
    <section id="galerija" className="plus-surface">
      <div className="plus-section pb-10 md:pb-14 lg:pb-16">
        <Reveal>
          <p className="plus-eyebrow">{t.showcase.eyebrow}</p>
        </Reveal>
        <LineReveal as="h2" className="plus-title" text={t.showcase.heading} />
        <LineReveal as="p" className="plus-lead" text={t.showcase.lead} delay={120} stagger={70} />
      </div>

      {GALLERY.map((photo, i) => {
        const copy = t.showcase.item(photo.n);
        // Natpis se seli s kraja na početak i nazad. Ispod `lg` je uvijek na
        // početnoj strani — na telefonu za drugu kolonu nema mjesta.
        const toEnd = i % 2 === 1;

        return (
          <ScrollRange
            as="article"
            key={photo.n}
            className="plus-shot relative block h-[88svh] min-h-[520px] w-full overflow-hidden plus-surface-deepest"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`${t.gallery.open}: ${copy.title}`}
              className="absolute inset-0 cursor-zoom-in"
            >
              {/* Pomjera se OMOTAČ, ne sama slika: `next/image` sa `fill` već
                  koristi svoj raspored za popunjavanje okvira. */}
              <span className="plus-shot-img absolute inset-0 block">
                <Image
                  src={photo.image}
                  alt={t.gallery.itemAlt(photo.n)}
                  fill
                  placeholder="blur"
                  sizes="100vw"
                  // Prve dvije su odmah ispod naslova odjeljka i gost do njih
                  // dođe za sekundu; ostalih šest čeka svoj red.
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="object-cover"
                />
              </span>

              {/*
               * Zatamnjenje samo pri DNU, i to s izričitim položajima:
               * puno na dnu, na 42% već popušta, a od 75% naviše ga nema.
               * Gornje dvije trećine fotografije ostaju netaknute — ravna
               * tamna opna preko cijele slike bi je isprala, a upravo nju
               * je gost došao vidjeti.
               */}
              <span
                aria-hidden="true"
                className="plus-shot-scrim absolute inset-0 bg-gradient-to-t from-pine-950/92 from-0% via-pine-950/35 via-42% to-transparent to-75%"
              />
            </button>

            {/*
             * Natpis ide u DONJI UGAO, nikad preko sredine kadra.
             *
             * Zato se drži uz samu ivicu ekrana (a ne uz sredinu stranice) i
             * širok je najviše `max-w-md` — otprilike trećina širine na
             * stolnom računaru. Sredina fotografije, gdje je po pravilu ono
             * zbog čega je slika i snimljena, ostaje slobodna.
             *
             * Ne hvata klik: ispod njega je dugme koje otvara sliku.
             */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-8 sm:px-10 sm:pb-10 lg:px-14 lg:pb-12">
              <div className="w-full">
                <div
                  className={`plus-shot-copy relative max-w-md ${
                    toEnd ? 'lg:ms-auto lg:text-end' : ''
                  }`}
                >
                  {/* Brojka stoji na ISTOJ strani na koju je poravnat tekst.
                      Na desno poravnatom redu bi lijeva brojka visila sama u
                      praznom, odvojena od naslova kojem pripada. */}
                  <span
                    aria-hidden="true"
                    // Ispod `sm` je nema: na uskom ekranu brojka te veličine
                    // izlazi izvan ivice i ono što ostane vidljivo više liči
                    // na mrlju nego na broj.
                    className={`plus-shot-num plus-sans absolute -top-12 hidden text-[7rem] font-semibold leading-none tabular-nums text-paper-50/10 sm:block ${
                      toEnd ? '-start-3 lg:-end-3 lg:start-auto' : '-start-3'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="relative">
                    <LineReveal
                      as="h3"
                      // Manji nego kad je natpis imao pola ekrana: u uskoj
                      // koloni bi se naslov ove veličine lomio na tri reda i
                      // popeo se natrag prema sredini slike.
                      className="text-[2rem] leading-[1.08] text-paper-50 drop-shadow-[0_2px_18px_rgb(6_20_14/0.55)] sm:text-[2.6rem] lg:text-[3rem]"
                      text={copy.title}
                      stagger={80}
                    />

                    <LineReveal
                      as="p"
                      className="mt-3 text-[0.95rem] leading-[1.7] text-paper-100/85 drop-shadow-[0_1px_10px_rgb(6_20_14/0.6)] sm:mt-4 sm:text-base"
                      text={copy.body}
                      delay={160}
                      stagger={55}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollRange>
        );
      })}

      {openIndex !== null && (
        <Lightbox
          index={openIndex}
          onClose={close}
          onPrev={prev}
          onNext={next}
          onSelect={setOpenIndex}
        />
      )}
    </section>
  );
}
