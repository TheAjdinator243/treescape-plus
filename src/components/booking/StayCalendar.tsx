'use client';

import { useMemo } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { ar, bs, enGB } from 'react-day-picker/locale';
import 'react-day-picker/style.css';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { fromDateStr, todayStr, withBosnianMonths, type DateStr } from '@/lib/dates';
import type { Locale } from '@/lib/i18n';
import { takenDayMap } from '@/lib/pricing';
import type { AvailabilitySlot } from '@/lib/types';

/**
 * Kalendarske lokalizacije dolaze od react-day-picker-a, a ne pravo iz
 * date-fns-a: on ih dopunjuje prevedenim ARIA oznakama ("idi na sljedeći
 * mjesec"), koje bi se golim date-fns objektom izgubile.
 *
 * Bosanskom se i ovdje ispravljaju nazivi mjeseci — date-fns piše "avgust".
 */
const CALENDAR_LOCALES = {
  bs: withBosnianMonths(bs),
  en: enGB,
  ar,
} satisfies Record<Locale, typeof bs>;

export function StayCalendar({
  slots,
  range,
  onRangeChange,
  maxNights,
}: {
  slots: AvailabilitySlot[];
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  maxNights: number;
}) {
  const { locale, dir, t } = useI18n();

  const { hardDays, pendingDays } = useMemo(() => {
    const taken = takenDayMap(slots);
    const hard: Date[] = [];
    const pending: Date[] = [];

    for (const [day, level] of taken) {
      (level === 'pending' ? pending : hard).push(fromDateStr(day as DateStr));
    }

    return { hardDays: hard, pendingDays: pending };
  }, [slots]);

  const allTaken = [...hardDays, ...pendingDays];

  return (
    <div className="flex flex-col items-center">
      <DayPicker
        mode="range"
        locale={CALENDAR_LOCALES[locale]}
        // Bez ovoga bi arapski kalendar imao ponedjeljak na pogrešnoj strani
        // sedmice, a strelice za listanje mjeseci bi vodile unazad.
        dir={dir}
        selected={range}
        onSelect={onRangeChange}
        numberOfMonths={2}
        pagedNavigation
        showOutsideDays={false}
        startMonth={new Date()}
        max={maxNights}
        // Bez ovoga bi gost mogao povući raspon PREKO tuđe rezervacije.
        excludeDisabled
        disabled={[{ before: fromDateStr(todayStr()) }, ...allTaken]}
        modifiers={{ taken: hardDays, takenPending: pendingDays }}
        modifiersClassNames={{ taken: 'day-taken', takenPending: 'day-taken-pending' }}
        className="rdp-root"
        classNames={{ months: 'flex flex-col sm:flex-row gap-6 sm:gap-10' }}
      />

      {/*
        `stay-legend` i `data-tone` nisu ukras nego rukohvat: druga koža je
        taman, pa ove tri boje tamo moraju biti druge. Preko imena i oznake se
        prebojaju iz CSS-a (vidi globals.css), bez ijedne nove zastavice u
        komponenti koju oba izgleda dijele.
      */}
      <ul className="stay-legend mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-500">
        <Legend
          tone="free"
          className="border border-sand-300 bg-white"
          label={t.booking.legendFree}
        />
        <Legend
          tone="taken"
          className="bg-sand-200 line-through"
          label={t.booking.legendTaken}
        />
        <Legend tone="selected" className="bg-forest-700" label={t.booking.legendSelected} />
      </ul>
    </div>
  );
}

function Legend({
  tone,
  className,
  label,
}: {
  tone: 'free' | 'taken' | 'selected';
  className: string;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded-full ${className}`} data-tone={tone} aria-hidden="true" />
      {label}
    </li>
  );
}
