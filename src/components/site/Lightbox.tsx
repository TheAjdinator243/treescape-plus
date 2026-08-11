'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { GALLERY } from '@/lib/gallery';

/**
 * Uvećana slika preko cijelog ekrana.
 *
 * Stoji zasebno jer je dijele oba izgleda sajta. Sam prikaz je ionako crn i
 * bez ukrasa u obje verzije — ono što se razlikuje je mreža sličica ispod, a
 * ne način na koji se slika gleda. Da je prepisan dvaput, ispravka u tastaturi
 * ili u prevlačenju prstom popravila bi samo jednu verziju.
 */
export function Lightbox({
  index,
  onClose,
  onPrev,
  onNext,
  onSelect,
}: {
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /**
   * Skok pravo na sliku iz trake sličica pri dnu.
   *
   * Neobavezno, i to namjerno: traku ima samo "plus" izgled. Osnovna verzija i
   * Osnovni sajt ovaj prikaz koristi bez nje i izgleda tačno kao prije — dodatak
   * se ne pojavljuje dok ga neko izričito ne zatraži.
   */
  onSelect?: (index: number) => void;
}) {
  const { t, dir } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const item = GALLERY[index];

  const rtl = dir === 'rtl';

  // Tastatura: strelice listaju, Escape zatvara. Bez ovoga galerija nije
  // upotrebljiva bez miša. U arapskom "naprijed" je strelica ulijevo, jer se
  // i sadržaj kreće tim smjerom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') (rtl ? onNext : onPrev)();
      if (e.key === 'ArrowRight') (rtl ? onPrev : onNext)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, rtl]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.gallery.heading}
      className="fixed inset-0 z-[70] flex flex-col bg-bark-950/95 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        if (start === null || end === undefined) return;
        const delta = end - start;
        if (Math.abs(delta) > 60) {
          const forward = rtl ? delta > 0 : delta < 0;
          (forward ? onNext : onPrev)();
        }
        touchStartX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 text-sand-200">
        <span className="text-sm tabular-nums">{t.gallery.counter(index + 1, GALLERY.length)}</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          aria-label={t.gallery.close}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center px-4 pb-4"
        // Klik na samu sliku ne zatvara — samo klik na tamnu pozadinu.
        onClick={(e) => e.stopPropagation()}
      >
        <LightboxArrow side="start" onClick={onPrev} label={t.gallery.prev} />

        <div className="relative h-full w-full max-w-5xl">
          <Image
            key={item.n}
            src={item.image}
            alt={t.gallery.itemAlt(item.n)}
            fill
            placeholder="blur"
            sizes="100vw"
            className="animate-fade-rise object-contain"
          />
        </div>

        <LightboxArrow side="end" onClick={onNext} label={t.gallery.next} />
      </div>

      <p className="px-5 pb-6 text-center text-sm text-sand-200">{t.gallery.itemCaption(item.n)}</p>

      {/*
        Traka sličica.

        Skrola se vodoravno i sama dovodi trenutnu sličicu u vidno polje (vidi
        `Thumb`), pa se pri listanju strelicama traka kreće zajedno sa slikom.
        Na uskim ekranima se krije: tamo je prst na samoj slici brži od trake,
        a ona bi uzela trećinu visine.
      */}
      {onSelect && (
        <ul
          className="hidden shrink-0 gap-2 overflow-x-auto px-5 pb-5 sm:flex"
          onClick={(e) => e.stopPropagation()}
        >
          {GALLERY.map((thumb, i) => (
            <Thumb
              key={thumb.n}
              image={thumb.image}
              active={i === index}
              label={t.gallery.itemCaption(thumb.n)}
              onClick={() => onSelect(i)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Thumb({
  image,
  active,
  label,
  onClick,
}: {
  image: (typeof GALLERY)[number]['image'];
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!active) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  return (
    <li ref={ref} className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={`relative block h-14 w-20 overflow-hidden rounded-lg transition-opacity duration-300 ${
          active ? 'opacity-100 ring-2 ring-sand-100' : 'opacity-45 hover:opacity-80'
        }`}
        aria-label={label}
      >
        {/* `alt=""` jer dugme već nosi opis u `aria-label` — inače bi čitač
            ekrana istu sliku najavio dvaput. */}
        <Image src={image} alt="" fill sizes="80px" className="object-cover" />
      </button>
    </li>
  );
}

/**
 * `side` je logički, ne fizički: "start" je početak reda, dakle lijevo u
 * bosanskom i engleskom, a desno u arapskom. Strelica se okreće uz njega —
 * `rtl:rotate-180` je jedini način da ista putanja radi u oba smjera.
 */
function LightboxArrow({
  side,
  onClick,
  label,
}: {
  side: 'start' | 'end';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute ${
        side === 'start' ? 'start-2' : 'end-2'
      } z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:h-14 sm:w-14`}
      aria-label={label}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="rtl:rotate-180"
      >
        <path
          d={side === 'start' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * Zajedničko listanje galerije — isto u obje verzije, pa stoji uz sam prikaz.
 */
export function galleryStep(current: number | null, step: 1 | -1): number | null {
  if (current === null) return null;
  return (current + step + GALLERY.length) % GALLERY.length;
}
