'use client';

import { Fragment, useEffect, useRef } from 'react';

import { useOnceInView } from './use-in-view';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Naslov koji se otkriva RED PO RED dok ulazi u ekran.
 *
 * ── Zašto ovo nije jednostavno ─────────────────────────────────────────────
 * Gdje se red prelama ne zna ni server ni CSS — to zna tek preglednik, i to
 * tek kad izmjeri stvarnu širinu. Isti naslov ima dva reda na stolnom
 * računaru, četiri na telefonu, a na arapskom sasvim drugačije.
 *
 * Zato se tekst ispisuje po RIJEČIMA, a redovi se otkriju mjerenjem: sve
 * riječi s istim `offsetTop` su isti red. Svakoj se onda upiše redni broj reda
 * u `--line`, a CSS iz toga računa kašnjenje. Kad se prozor promijeni, mjeri
 * se ponovo.
 *
 * Riječi se NIKAD ne dijele na slova. Arapsko pismo je spojeno — slova unutar
 * riječi mijenjaju oblik prema susjedima, pa bi dijeljenje po slovima riječ
 * raspalo na nepovezane znakove.
 *
 * Bez JavaScripta ili uz "smanji animacije" tekst se vidi odmah, cijeli: `.reveal`
 * pravilo u `layout.tsx` i `prefers-reduced-motion` blok u `globals.css` oba
 * gase i pomak i prozirnost.
 */
export function LineReveal({
  text,
  className = '',
  /** Kašnjenje prvog reda — da naslov krene tek nakon nadnaslova iznad. */
  delay = 0,
  /** Razmak između dva susjedna reda. */
  stagger = 90,
  as: Tag = 'h2',
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
  const hostRef = useRef<HTMLElement>(null);
  const shown = useRef(false);
  const reduced = useReducedMotion();

  /**
   * Grupisanje riječi u redove.
   *
   * `offsetTop` je cijeli broj piksela i jednak je za sve riječi istog reda,
   * pa se po njemu grupiše bez ikakve tolerancije. Radi i kad su riječi
   * različite visine (naglašena slova, brojke).
   */
  const measure = () => {
    const host = hostRef.current;
    if (!host) return;

    const words = host.querySelectorAll<HTMLElement>('[data-word]');
    let line = -1;
    let lastTop: number | null = null;

    for (const word of words) {
      const top = word.offsetTop;
      if (lastTop === null || top !== lastTop) {
        line++;
        lastTop = top;
      }
      word.style.setProperty('--line', String(line));
    }
  };

  // Mjeri se prije prvog crtanja, pa se kašnjenja nikad ne vide kako se
  // "popravljaju" na ekranu.
  useEffect(() => {
    measure();

    // Prelom se mijenja sa širinom prozora, ali i kad stigne pravo pismo
    // (dok se čeka font, riječi su druge širine). `ResizeObserver` hvata oboje.
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const ref = useOnceInView<HTMLElement>((node) => {
    if (shown.current) return;
    shown.current = true;
    // Mjeri se JOŠ JEDNOM neposredno prije pokretanja: između prvog crtanja i
    // trenutka kad naslov dođe na ekran font se već sigurno učitao.
    measure();
    node.dataset.shown = 'true';
  });

  /**
   * Ko je tražio manje animacija, dobija tekst ODMAH — bez čekanja da naslov
   * uđe u vidno polje.
   *
   * Ovo nije isto što i ugasiti prijelaz. Riječi počinju na `opacity: 0`, a
   * upali ih tek `data-shown`, koji postavlja osmatrač. Da se za njega čeka i
   * ovdje, naslov na dnu stranice bi za takvog posjetioca bio nevidljiv sve
   * dok do njega ne doskrola — a upravo on je taj koji ne želi da išta zavisi
   * od kretanja.
   */
  useEffect(() => {
    if (!reduced) return;
    shown.current = true;
    if (hostRef.current) hostRef.current.dataset.shown = 'true';
  }, [reduced]);

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        hostRef.current = node;
        ref.current = node;
      }}
      className={`line-reveal ${className}`}
      style={{ '--line-delay': `${delay}ms`, '--line-step': `${stagger}ms` } as React.CSSProperties}
    >
      {words.map((word, i) => (
        // Ključ nosi i položaj, jer se ista riječ u naslovu može ponoviti.
        <Fragment key={`${word}-${i}`}>
          {/* Vanjski omotač reže preko ivice, unutrašnji se pomjera — riječ
              izlazi odozdo kao ispod zavjese. Razmak stoji IZMEĐU omotača, a
              ne u njima: unutra bi ga maska odrezala i riječi bi se slijepile. */}
          <span className="line-reveal-mask">
            <span data-word className="line-reveal-word">
              {word}
            </span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  );
}
