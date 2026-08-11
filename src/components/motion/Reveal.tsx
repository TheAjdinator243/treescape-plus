'use client';

import { useRef } from 'react';

import { useOnceInView } from './use-in-view';

/**
 * Pojavljivanje sadržaja pri skrolanju.
 *
 * Namjerno bez animacijske biblioteke — `IntersectionObserver` i dvije CSS
 * osobine rade isti posao za nula kilobajta. Vidljivost se postavlja direktno
 * na DOM čvor, a ne kroz React stanje: animacija je čista prezentacija, pa
 * nema razloga da pokreće ponovno iscrtavanje pri svakom skrolu.
 *
 * Animiraju se SAMO `opacity` i `transform` — jedine dvije osobine koje
 * preglednik može odraditi na grafičkoj kartici, bez ponovnog rasporeda
 * stranice. Zato ni jedan oblik ne dira visinu, marginu ni razmak: pomjeranje
 * susjeda pri pojavljivanju je ono što skrolanje čini isprekidanim.
 *
 * Ako korisnik u sistemu ima uključeno "smanji animacije", globalno CSS
 * pravilo svede prijelaz na nulu i sadržaj se zatekne odmah na kraju.
 * Ako je JavaScript isključen, <noscript> stil u `layout.tsx` sve odmah
 * prikaže.
 */

/** Odakle sadržaj dolazi. Svaki oblik je samo početni `transform`. */
export type RevealVariant =
  /** Blago odozdo — podrazumijevano, za tekstualne blokove. */
  | 'rise'
  /** Samo pojavljivanje, bez pomjeranja — za sadržaj koji već stoji gdje treba. */
  | 'fade'
  /** Uvećanje iz malo manjeg — za slike i kartice koje trebaju "sjesti". */
  | 'scale'
  /** S početka reda (lijevo u bosanskom, desno u arapskom). */
  | 'slide'
  /** Otkrivanje odozdo nagore, kao da se zavjesa diže — za fotografije. */
  | 'clip'
  /**
   * Iskakanje: malo odozdo I iz manjeg, s izraženijim usporavanjem na kraju.
   *
   * Za kartice koje se pojavljuju jedna po jedna dok se skrola. Razlika prema
   * `rise` je namjerno mala — dovoljna da se osjeti kao "iskočilo je", a ne
   * toliko da poskakuje.
   */
  | 'pop';

const HIDDEN: Record<RevealVariant, { transform?: string; clipPath?: string }> = {
  rise: { transform: 'translate3d(0, 20px, 0)' },
  fade: {},
  scale: { transform: 'scale(0.965)' },
  // `var(--reveal-slide)` okreće smjer u arapskom — vidi `globals.css`.
  slide: { transform: 'translate3d(var(--reveal-slide, -24px), 0, 0)' },
  clip: { transform: 'scale(1.04)', clipPath: 'inset(14% 0 0 0)' },
  pop: { transform: 'translate3d(0, 26px, 0) scale(0.96)' },
};

const DURATION: Record<RevealVariant, number> = {
  rise: 700,
  fade: 800,
  scale: 800,
  slide: 700,
  clip: 1000,
  pop: 620,
};

export function Reveal({
  children,
  delay = 0,
  variant = 'rise',
  className = '',
  margin,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  /** Koliko milisekundi kasni za svojim susjedom — tako nastaje niz. */
  delay?: number;
  variant?: RevealVariant;
  className?: string;
  /**
   * Koliko ranije ili kasnije se okida, u odnosu na ivicu ekrana.
   *
   * Podrazumijevano se sadržaj pojavi čim zagrebe dno ekrana. Za kartice koje
   * treba da iskaču JEDNA PO JEDNA dok se skrola to je prerano — one se tada
   * sve upale još dok su na samom rubu. Negativan donji rub (npr.
   * `0px 0px -15% 0px`) pomjeri okidanje dublje u ekran, pa svaka sačeka svoj red.
   */
  margin?: string;
  /** Element koji se ispisuje. `li` kad `Reveal` stoji unutar spiska. */
  as?: 'div' | 'li' | 'span';
}) {
  const shown = useRef(false);

  const hidden = HIDDEN[variant];
  const duration = DURATION[variant];

  const ref = useOnceInView<HTMLElement>(
    (node) => {
      if (shown.current) return;
      shown.current = true;

      node.style.opacity = '1';
      node.style.transform = 'none';
      // Maska se vraća samo onom obliku koji je i ima. Da se ovdje svakome
      // upiše `inset(0 0 0 0)`, kartice bi ostale s maskom po ivici kutije i
      // ona bi odsjekla njihovu sjenu.
      if (hidden.clipPath) node.style.clipPath = 'inset(0 0 0 0)';

      // `will-change` je obećanje pregledniku da će se nešto mijenjati — i on
      // za to obećanje drži zaseban sloj u memoriji. Kad se animacija završi,
      // obećanje treba povući, inače svaki od desetak ovakvih blokova na
      // stranici zauvijek drži sloj koji se više nikad ne mijenja.
      window.setTimeout(() => {
        if (node.isConnected) node.style.willChange = 'auto';
      }, delay + duration);
    },
    margin ? { rootMargin: margin } : undefined
  );

  return (
    <Tag
      // Jedan `ref` za oba svijeta: `useOnceInView` traži `HTMLElement`, a JSX
      // ovdje zna samo da je riječ o jednom od tri konkretna elementa.
      ref={ref as React.Ref<never>}
      className={`reveal ${className}`}
      style={{
        opacity: 0,
        ...hidden,
        transition: [
          `opacity ${duration}ms var(--ease-out-soft) ${delay}ms`,
          `transform ${duration}ms var(--ease-out-soft) ${delay}ms`,
          `clip-path ${duration}ms var(--ease-out-soft) ${delay}ms`,
        ].join(', '),
        // Nagovještaj pregledniku da ovo digne na svoj sloj prije nego počne.
        // Povlači se čim animacija prođe — vidi gore.
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}
