'use client';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { formatMoney } from '@/lib/pricing';
import type { MoneyStats } from '@/lib/stats';
import type { TrafficSummary } from '@/lib/analytics';

/**
 * Prvi ekran administracije: novac i posjete, jedno pored drugog.
 *
 * Namjerno bez ijednog grafikona iz biblioteke. Trake su `div`-ovi s
 * postotkom širine — jedna kuća daje dvanaest mjeseci i trideset dana
 * podataka, a to je premalo da bi biblioteka od stotinu kilobajta išta
 * dodala osim težine i još jednog paketa koji treba održavati.
 */

function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="plus-card p-[clamp(1rem,1.8vw,1.5rem)]">
      <p className="plus-label mb-2">{label}</p>
      <p
        className={`tabular-nums ${strong ? 'plus-total text-[clamp(1.6rem,3vw,2.2rem)]' : 'plus-ink text-[clamp(1.3rem,2.2vw,1.7rem)]'}`}
        style={{ fontFamily: 'var(--font-plus-display)' }}
      >
        {value}
      </p>
      {hint ? <p className="plus-dimmer mt-1.5 text-xs leading-relaxed">{hint}</p> : null}
    </div>
  );
}

/** Vodoravna traka s udjelom — za jezike, uređaje, izvore. */
function Share({ rows }: { rows: { label: string; count: number }[] }) {
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (total === 0) return null;

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="plus-ink text-sm">{row.label}</span>
            <span className="plus-dim text-xs tabular-nums">
              {row.count} · {Math.round((row.count / total) * 100)}%
            </span>
          </div>
          <div className="plus-rail-track h-1">
            <div
              className="plus-rail-fill h-1"
              style={{ width: `${Math.max(2, (row.count / total) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Stupci kroz vrijeme — mjeseci zarade ili dani posjeta.
 *
 * Visina stupca je postotak, a postotak se razrješava samo ako roditelj ima
 * određenu visinu. Prvi pokušaj je stupce stavio u flex kolonu čija je visina
 * dolazila iz sadržaja: postotak je pao na `auto`, svaki stupac je ispao visok
 * nula, i ostali su samo natpisi ispod praznine. Zato svaka kolona nosi
 * `h-full`, a sam stupac stoji u posebnom `flex-1` polju iznad natpisa.
 */
function Columns({
  rows,
  format,
}: {
  rows: { key: string; value: number; label: string }[];
  format: (value: number) => string;
}) {
  const peak = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="flex items-stretch gap-1 overflow-x-auto pb-1" style={{ height: '8rem' }}>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex h-full min-w-[0.75rem] flex-1 flex-col items-center gap-1.5"
          title={`${row.label} — ${format(row.value)}`}
        >
          <div className="flex w-full flex-1 items-end">
            <div
              className="plus-rail-fill w-full"
              style={{
                // Nula ostaje vidljiva kao tanka linija: prazan stupac se
                // inače ne razlikuje od stupca koji nije ni nacrtan.
                height: `${Math.max(2, (row.value / peak) * 100)}%`,
                opacity: row.value === 0 ? 0.3 : 1,
              }}
            />
          </div>
          <span className="plus-dimmer text-[0.55rem] whitespace-nowrap">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function Section({
  heading,
  lead,
  children,
}: {
  heading: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="t-sub plus-ink">{heading}</h2>
      {lead ? <p className="plus-dim mt-2 max-w-[52ch] text-sm leading-relaxed">{lead}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function OverviewTab({
  money,
  traffic,
  currencySymbol,
}: {
  money: MoneyStats;
  traffic: TrafficSummary;
  currencySymbol: string;
}) {
  const { t, locale } = useI18n();
  const a = t.admin.overview;
  const money0 = (cents: number) => formatMoney(cents, currencySymbol, locale);

  const monthLabel = (key: string) => key.slice(5) + '.';
  const dayLabel = (key: string) => key.slice(8);

  return (
    <div className="divide-y divide-[var(--ui-line)] [&>section]:py-[clamp(1.75rem,3.4vw,2.75rem)] [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
      <Section heading={a.moneyHeading} lead={a.moneyLead}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label={a.earnedThisMonth} value={money0(money.earnedThisMonth)} strong />
          <Figure label={a.earnedThisYear} value={money0(money.earnedThisYear)} />
          <Figure label={a.earnedAllTime} value={money0(money.earnedAllTime)} />
          <Figure label={a.upcoming} value={money0(money.upcomingCents)} hint={a.upcomingHint} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label={a.confirmed} value={String(money.confirmedCount)} />
          <Figure
            label={a.pending}
            value={String(money.pendingCount)}
            hint={money.pendingCount > 0 ? a.pendingHint : undefined}
          />
          <Figure
            label={a.conversion}
            value={`${Math.round(money.conversion * 100)}%`}
            hint={a.conversionHint}
          />
          <Figure
            label={a.occupancy}
            value={`${Math.round(money.occupancy90 * 100)}%`}
            hint={a.occupancyHint}
          />
        </div>
      </Section>

      <Section heading={a.monthlyHeading} lead={a.monthlyLead}>
        <Columns
          rows={money.monthly.map((m) => ({
            key: m.month,
            value: m.cents,
            label: monthLabel(m.month),
          }))}
          format={money0}
        />
      </Section>

      <Section heading={a.averagesHeading}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label={a.nightsSold} value={String(money.nightsSold)} />
          <Figure
            label={a.averageStay}
            value={`${money.averageStayDays}`}
            hint={a.averageStayHint}
          />
          <Figure label={a.averageNightly} value={money0(money.averageNightlyCents)} />
          <Figure label={a.averageBooking} value={money0(money.averageBookingCents)} />
        </div>
      </Section>

      <Section heading={a.trafficHeading} lead={a.trafficLead}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Figure
            label={a.visitorsToday}
            value={String(traffic.visitorsToday)}
            hint={a.viewsCount(traffic.viewsToday)}
            strong
          />
          <Figure
            label={a.visitors30}
            value={String(traffic.visitors30)}
            hint={a.viewsCount(traffic.views30)}
          />
          <Figure
            label={a.visitors365}
            value={String(traffic.visitors365)}
            hint={a.viewsCount(traffic.views365)}
          />
        </div>

        <div className="mt-5">
          <Columns
            rows={traffic.daily.map((d) => ({
              key: d.day,
              value: d.visitors,
              label: dayLabel(d.day),
            }))}
            format={(n) => String(n)}
          />
        </div>
      </Section>

      <Section heading={a.breakdownHeading}>
        <div className="grid gap-[clamp(1.5rem,3vw,2.5rem)] lg:grid-cols-3">
          <div>
            <p className="plus-label mb-3">{a.byLanguage}</p>
            <Share
              rows={traffic.languages.map((l) => ({
                label: t.language.names[l.locale as 'bs' | 'en' | 'ar'] ?? l.locale,
                count: l.visitors,
              }))}
            />
          </div>
          <div>
            <p className="plus-label mb-3">{a.byDevice}</p>
            <Share
              rows={traffic.devices.map((d) => ({
                label: a.deviceNames[d.device as 'phone' | 'tablet' | 'desktop'] ?? d.device,
                count: d.visitors,
              }))}
            />
          </div>
          <div>
            <p className="plus-label mb-3">{a.bySource}</p>
            {traffic.topReferrers.length > 0 ? (
              <Share rows={traffic.topReferrers.map((r) => ({ label: r.host, count: r.views }))} />
            ) : (
              <p className="plus-dimmer text-sm">{a.noSources}</p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
