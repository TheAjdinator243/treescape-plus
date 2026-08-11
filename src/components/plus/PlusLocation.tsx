import { LineReveal } from '@/components/motion/LineReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getServerStrings } from '@/lib/i18n/server';
import { GOOGLE_MAPS_URL, MAP_SRC, TRAVEL } from '@/lib/location';

/**
 * Lokacija.
 *
 * Karta je OpenStreetMap iframe — bez API ključa i bez naplate. Koordinate i
 * link na Google Mape stoje u `lib/location.ts`, zajedno sa svim ostalim
 * verzijama sajta.
 *
 * Karta je prigušena dok se ne pređe mišem preko nje: šarena karta u punoj
 * boji je jedina stvar koja bi na ovoj stranici vikala. Vrati joj se boja tek
 * kad je gost zaista gleda.
 */
export async function PlusLocation() {
  const { t } = await getServerStrings();

  return (
    <section id="lokacija" className="plus-surface">
      <div className="plus-section grid gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="plus-eyebrow">{t.nav.location}</p>
          <LineReveal as="h2" className="plus-title" text={t.location.heading} />
          <LineReveal
            as="p"
            className="plus-lead"
            text={t.location.lead}
            delay={120}
            stagger={70}
          />

          <dl className="mt-10 border-t plus-rule">
            {TRAVEL.map((row) => (
              <div
                key={row.key}
                className="flex items-baseline justify-between gap-4 border-b plus-rule py-4"
              >
                <dt className="text-base plus-dim">{t.location.places[row.key]}</dt>
                <dd
                  className="text-xl tabular-nums plus-accent"
                  style={{ fontFamily: 'var(--font-plus-display)' }}
                >
                  {t.location.driveTime(row.minutes)}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            // `noreferrer` uz `noopener`: bez prvog Google vidi s koje je
            // stranice gost došao, bez drugog otvorena kartica može mijenjati
            // našu preko `window.opener`.
            rel="noopener noreferrer"
            className="plus-btn-ghost mt-6"
          >
            <PinIcon />
            {t.location.openInMaps}
            <span className="sr-only"> ({t.location.opensInNewTab})</span>
          </a>
        </Reveal>

        <Reveal delay={120} variant="scale">
          <div className="plus-surface-alt group h-[380px] overflow-hidden rounded-panel border plus-rule shadow-float lg:h-full lg:min-h-[520px]">
            <iframe
              title={t.location.mapTitle}
              src={MAP_SRC}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0 grayscale-[0.6] transition-[filter] duration-700 group-hover:grayscale-0"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
