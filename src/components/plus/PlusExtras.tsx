import { AmenityIcon } from '@/components/site/AmenityIcon';
import { AMENITIES } from '@/lib/amenities';
import { getServerStrings } from '@/lib/i18n/server';

/**
 * Dodatno — sve što nema svoju fotografiju.
 *
 * Bazen, kamin i roštilj su gore, u „Kuća, dio po dio", gdje ih se i vidi.
 * Ovdje ostaje ono što se fotografijom ionako ne dokazuje: internet, mašina
 * za veš, peškiri. Za takvu stavku je slika prazna priča, pa je red da bude
 * kratak natpis u popisu.
 *
 * ── Zašto se ovdje NIŠTA ne animira ───────────────────────────────────────
 * Popis od jedanaest sitnica koje jedna po jedna iskaču pretvara provjeru
 * („ima li sušilicu?") u čekanje. Iznad je osam fotografija koje se otkrivaju
 * dok se skrola; da se i ovo miče, pokret bi izgubio težinu — kad se sve
 * kreće, ništa se ne ističe. Popis stoji miran i čita se odjednom.
 *
 * Ploha je tamna jer se stranica ovdje prelama s „kako kuća izgleda" na „kako
 * se rezerviše"; zaokret u boji to dijeli jasnije od bilo kakvog razmaka.
 */

/** Ove tri stavke imaju svoju fotografiju u `PlusShowcase` — ne ponavljaju se. */
const SHOWN_IN_PHOTOS = new Set(['pool', 'fire', 'grill']);

export async function PlusExtras() {
  const { t } = await getServerStrings();
  const rest = AMENITIES.filter((key) => !SHOWN_IN_PHOTOS.has(key));

  return (
    <section id="sadrzaji" className="plus-surface-deep plus-dim-on">
      <div className="plus-section">
        <p className="plus-eyebrow-onlight">{t.site.name}</p>
        <h2 className="plus-title plus-ink-on">{t.showcase.extraTitle}</h2>
        <p className="plus-lead plus-dim-on">{t.showcase.extraLead}</p>

        <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((key) => (
            <li key={key} className="flex gap-4 border-t plus-rule-on pt-5">
              <span className="mt-0.5 shrink-0 plus-accent-on" aria-hidden="true">
                <AmenityIcon name={key} />
              </span>

              <div>
                <h3 className="plus-sans text-base font-semibold plus-ink-on">
                  {t.amenities.items[key].label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed plus-dimmer-on">
                  {t.amenities.items[key].note}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
