import { Fragment } from 'react';

/**
 * Naslov koji se ispisuje riječ po riječ.
 *
 * Ovo je SERVERSKA komponenta, i to je cijela poenta: animacija je čist CSS s
 * odgodom po riječi, pa naslovni ekran ne čeka nijedan kilobajt JavaScripta da
 * se pokrene. Radi i kad je JavaScript isključen.
 *
 * Dijeli se po razmacima, nikad po slovima. Arapsko pismo je spojeno — slova
 * unutar riječi mijenjaju oblik prema susjedima, pa bi razdvajanje po slovima
 * riječ raspalo na nepovezane znakove i učinilo je nečitljivom. Po razmacima
 * ostaje netaknuto na sva tri jezika.
 *
 * Svaka riječ je `inline-block` u omotaču koji reže preko ivice, pa riječ
 * izlazi odozdo kao ispod zavjese. Razmak između riječi stoji IZMEĐU tih
 * omotača, a ne u njima — unutra bi ga maska odrezala i riječi bi se na kraju
 * animacije slijepile.
 */
export function TextReveal({
  text,
  className = '',
  /** Kašnjenje prve riječi — da naslov krene tek nakon nadnaslova iznad. */
  delay = 0,
  /** Razmak između dvije susjedne riječi. Manji broj = brži ispis. */
  stagger = 55,
  as: Tag = 'span',
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'span';
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        // Ključ nosi i položaj, jer se ista riječ u naslovu može ponoviti.
        <Fragment key={`${word}-${i}`}>
          <span className="inline-flex overflow-hidden pb-[0.12em] align-bottom">
            <span
              className="animate-word-rise inline-block"
              style={{ animationDelay: `${delay + i * stagger}ms` }}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  );
}
