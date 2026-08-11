'use client';

import { useEffect, useState } from 'react';

import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
import { useActiveSection } from '@/components/motion/use-active-section';

/** Sidra u stranici ostaju bosanska bez obzira na jezik — adresa se ne prevodi. */
const LINKS = [
  { href: '#o-kuci', id: 'o-kuci', key: 'about' },
  { href: '#galerija', id: 'galerija', key: 'gallery' },
  { href: '#sadrzaji', id: 'sadrzaji', key: 'amenities' },
  { href: '#lokacija', id: 'lokacija', key: 'location' },
  { href: '#pitanja', id: 'pitanja', key: 'faq' },
] as const;

/** Isti spisak, samo oznake — `useActiveSection` traži golu listu. */
const SECTION_IDS = LINKS.map((l) => l.id);

/**
 * Navigacija "plus" izgleda.
 *
 * Preko naslovne fotografije je providna i bijela — fotografija je tamna, pa
 * joj podloga samo smeta. Čim se skrola, skupi se u plutajuću pilulu odmaknutu
 * od ivica ekrana: to je jedini potez koji navigaciju odvaja od "trake
 * zalijepljene za vrh" kakvu ima svaki šablon.
 *
 * Ni jedno ni drugo stanje ne dira širinu ni marginu susjeda — mijenja se samo
 * unutrašnji razmak omotača, pa se ostatak stranice pri skrolanju ne
 * prerasporedi.
 */
export function PlusNav() {
  const { t } = useI18n();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Dok je mobilni meni otvoren, pozadina ne smije da se skrola ispod njega.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const solid = scrolled || open;

  return (
    <>
      <a
        href="#rezervacija"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full plus-badge focus:px-5 focus:py-3 focus:text-sm"
      >
        {t.nav.skipToBooking}
      </a>

      {/* Koliko je stranice prošlo — vlas-linija uz sam vrh ekrana. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-0.5">
        <ScrollProgress className="h-full bg-gradient-to-r plus-progress" />
      </div>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[padding] duration-500 ease-[var(--ease-out-soft)] ${
          solid ? 'px-3 pt-3 sm:px-5 sm:pt-4' : 'px-0 pt-0'
        }`}
      >
        <nav
          className={`mx-auto flex max-w-6xl items-center justify-between transition-[height,background-color,border-color,box-shadow,border-radius,padding] duration-500 ease-[var(--ease-out-soft)] ${
            solid
              ? 'plus-nav-pill h-14 rounded-full border px-3 shadow-float backdrop-blur-xl sm:h-16 sm:px-5'
              : 'h-16 rounded-none border border-transparent px-5 sm:h-20 sm:px-8'
          }`}
          aria-label={t.nav.mainNav}
        >
          <a
            href="#vrh"
            className={`rounded-full text-xl tracking-tight transition-colors duration-300 ${
              solid ? 'plus-ink' : 'text-white drop-shadow-sm'
            }`}
            style={{ fontFamily: 'var(--font-plus-display)' }}
          >
            {t.site.name}
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => {
              const current = active === link.id;

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={current ? 'true' : undefined}
                    className={`relative block rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-300 ${
                      solid
                        ? current
                          ? 'plus-accent'
                          : 'plus-dim hover:plus-accent'
                        : current
                          ? 'text-white'
                          : 'text-white/80 drop-shadow-sm hover:text-white'
                    }`}
                  >
                    {t.nav[link.key]}

                    {/*
                      Tačka ispod odjeljka na kojem se trenutno stoji.

                      Uvijek je ISPISANA, a mijenja se samo `scale` — tako i
                      pojava i nestanak imaju prijelaz. Da se dodavala i
                      uklanjala iz DOM-a, treptala bi bez ijedne animacije.
                    */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 -bottom-0.5 mx-auto h-1 w-1 rounded-full transition-transform duration-300 ease-[var(--ease-out-expo)] ${
                        solid ? 'plus-dot' : 'bg-white'
                      } ${current ? 'scale-100' : 'scale-0'}`}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              {/* Jedino mjesto gdje se koža bira u komponenti, a ne u CSS-u: ton je
                  ovdje svojstvo, pa ne može pratiti `data-skin`. `onyx` ton je
                  isti oblik i ista boja koje nosi i ostatak ove kože. */}
              <LanguageSwitcher tone={solid ? 'onyx' : 'dark'} />
            </span>

            <a
              href="#rezervacija"
              className={`hidden px-5 py-2.5 text-[0.82rem] sm:inline-flex ${
                solid ? 'plus-btn-primary' : 'plus-btn-onlight'
              }`}
            >
              {t.nav.book}
            </a>

            <MenuButton open={open} solid={solid} onClick={() => setOpen((v) => !v)} />
          </div>
        </nav>
      </header>

      <PlusMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Dugme koje se pretvara u X.
 *
 * Dvije crte se zarotiraju i sklope u sredini, umjesto da se jedna ikona
 * zamijeni drugom. Zamjena je trenutna i oko je ne prati; ovako se vidi da je
 * meni koji se otvorio ista ona stvar koja je stajala na tom mjestu.
 */
function MenuButton({
  open,
  solid,
  onClick,
}: {
  open: boolean;
  solid: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`-me-1 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors lg:hidden ${
        solid ? 'plus-ink hover:plus-hover' : 'text-white hover:bg-white/15'
      }`}
      aria-expanded={open}
      aria-controls="plus-meni"
      aria-label={open ? t.nav.close : t.nav.menu}
    >
      <span className="relative block h-4 w-5" aria-hidden="true">
        <span
          className={`absolute inset-x-0 block h-0.5 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out-expo)] ${
            open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0.5'
          }`}
        />
        <span
          className={`absolute inset-x-0 block h-0.5 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out-expo)] ${
            open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0.5'
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Mobilni meni.
 *
 * Ploha ostaje u DOM-u i kad je zatvorena (`opacity` + `translate` +
 * `pointer-events`), pa zatvaranje ima animaciju kao i otvaranje — da se
 * uklanja iz DOM-a, nestajao bi bez ijednog kadra.
 *
 * `inert` je ono što je čini stvarno zatvorenom: bez njega bi tabulator i
 * čitač ekrana i dalje šetali kroz nevidljive linkove.
 */
function PlusMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <div
      id="plus-meni"
      inert={!open}
      className={`fixed inset-0 z-40 flex flex-col overflow-y-auto plus-sheet px-5 pb-10 pt-24 backdrop-blur-xl transition-[opacity,transform] duration-[400ms] ease-[var(--ease-out-expo)] lg:hidden ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'
      }`}
    >
      <ul className="flex flex-col plus-divide divide-y plus-rule border-y">
        {LINKS.map((link, i) => (
          <li key={link.href}>
            <a
              href={link.href}
              onClick={onClose}
              // Stavke ulaze jedna za drugom, ali SAMO kad je meni otvoren —
              // inače bi se animacija vrtjela i dok je niko ne gleda.
              className={`block py-4 text-2xl plus-ink transition-colors hover:plus-accent ${
                open ? 'animate-menu-item' : ''
              }`}
              style={{
                fontFamily: 'var(--font-plus-display)',
                ...(open ? { animationDelay: `${60 + i * 45}ms` } : {}),
              }}
            >
              {t.nav[link.key]}
            </a>
          </li>
        ))}
      </ul>

      <a href="#rezervacija" onClick={onClose} className="plus-btn-primary mt-8 w-full py-4">
        {t.nav.book}
      </a>

      <div className="mt-auto flex justify-center pt-10">
        <LanguageSwitcher tone="onyx" />
      </div>
    </div>
  );
}
