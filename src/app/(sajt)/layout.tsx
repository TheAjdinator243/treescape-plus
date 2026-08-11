import { SmoothScroll } from '@/components/motion/SmoothScroll';

/**
 * Koža javnog dijela sajta.
 *
 * `plus` uključuje IZGLED (pismo, razmake, oblike), a `data-skin` bira BOJE
 * tog izgleda. Nijedna komponenta ne piše boju u svom JSX-u — sve idu preko
 * imena poslova (`plus-ink`, `plus-surface`, `plus-rule`, `plus-ink-on`), pa
 * se cijeli sajt presvlači ovom jednom riječju. Izbaci li se `data-skin`,
 * vraća se svijetla, papirnata varijanta.
 *
 * Stoji na grupi ruta, a ne na <body>, iz jednog razloga: administracija ne
 * smije naslijediti ni pismo ni boje javnog sajta. Ona je alat, a ne izlog.
 */
export default function SajtLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-skin="onyx" className="plus">
      {/* Glatki skrol s inercijom — samo onome ko nije tražio manje animacija. */}
      <SmoothScroll />
      {children}
    </div>
  );
}
