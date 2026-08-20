'use client';

import { useEffect, useRef, useState } from 'react';

import { StayCalendar } from '@/components/booking/StayCalendar';
import {
  guestDetailsError,
  isEmail,
  isName,
  isPhone,
  useStayForm,
} from '@/components/booking/useStayForm';
import { useI18n } from '@/components/i18n/LocaleProvider';
import { CountTo } from '@/components/motion/CountTo';
import { LineReveal } from '@/components/motion/LineReveal';
import { Reveal } from '@/components/motion/Reveal';
import { scrollToElement } from '@/components/motion/scroll-to';
import { GuestStepper } from '@/components/plus/GuestStepper';
import { LiveField } from '@/components/plus/LiveField';
import { PlusButton } from '@/components/plus/PlusButton';
import { daysBetween, formatLong } from '@/lib/dates';
import { count, type Locale } from '@/lib/i18n';
import { WEEKEND_PERIOD, formatMoney, groupByRate } from '@/lib/pricing';
import type { BookingContext, PriceBreakdown } from '@/lib/types';

/**
 * Rezervacija u "plus" izgledu — u tri koraka.
 *
 * Ovdje je SAMO izgled i redoslijed. Stanje, cijena i provjere žive u
 * `useStayForm`, koji dijele sve tri verzije sajta; ovdje se ne provjerava
 * ništa što se tamo već provjerava. Prelaz s podataka na potvrdu pita
 * `guestDetailsError` — istu funkciju koju pri slanju zove i sam `useStayForm`,
 * pa ne postoji način da korak propusti ono što bi slanje odbilo.
 *
 * Isto vrijedi i za kalendar: `StayCalendar` je zajednički, a boje mu daje
 * `.plus .rdp-root` blok u `globals.css`. Nijedan piksel kalendara nije
 * prepisan.
 *
 * ── Zašto koraci, a ne jedna duga kartica ─────────────────────────────────
 * Zato što je na telefonu ta kartica bila duža od tri ekrana: kalendar,
 * pregled, pet polja, načini plaćanja i dugme, sve odjednom. Ovako gost u
 * svakom trenutku vidi jednu odluku i koliko ih je još ostalo.
 *
 * Cijena je pritom vidljiva u SVA tri koraka, u traci pri dnu kartice. Ona je
 * jedini podatak zbog kojeg bi se gost vraćao unazad, pa nema razloga da ga
 * mora tražiti.
 */

const STEPS = 3;

export function PlusBooking({ context }: { context: BookingContext }) {
  const { locale, t } = useI18n();
  const { settings, paymentMethods } = context;

  const methodCopy: Record<string, { label: string; hint: string }> = {
    bank_transfer: { label: t.booking.payTransfer, hint: t.booking.payTransferHint },
    cash: { label: t.booking.payCash, hint: t.booking.payCashHint },
    test: { label: t.booking.payTest, hint: t.booking.payTestHint },
  };

  const form = useStayForm(context);
  const {
    slots,
    range,
    guests,
    name,
    email,
    phone,
    note,
    method,
    start,
    end,
    singleDay,
    quote,
    stayError,
    error,
    busy,
  } = form;

  const [step, setStep] = useState(0);
  /** Smjer posljednjeg pomaka — CSS iz njega zna s koje strane sadržaj ulazi. */
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const cardRef = useRef<HTMLDivElement>(null);

  /** Prelaz naprijed traži ispravan termin; ovo su iste provjere kao pri slanju. */
  const datesReady = Boolean(quote) && !stayError;
  const detailsError = guestDetailsError({ name, email, phone, method }, t);

  function go(next: number, direction: 'fwd' | 'back') {
    setDir(direction);
    setStep(next);
  }

  /*
   * Svaki korak počinje na vrhu kartice.
   *
   * Bez ovoga gost koji je na dnu dugačkog koraka pritisne "Dalje" i sljedeći
   * korak počne negdje iznad njega, van ekrana — pomak se desio, ali ga niko
   * nije vidio.
   *
   * ── Zašto ovdje, a ne u `go` ──────────────────────────────────────────
   * Prvi korak je kalendar dva mjeseca visok, drugi je kratak obrazac. Kad se
   * pomak tražio odmah pri kliku, još je stajao stari raspored: React bi tek
   * poslije iscrtao kraći korak, dokument bi se skupio, i preglednik bi skrol
   * odsjekao na novu visinu. Mjereno: traženo 11.469, završilo na 14.497 —
   * kartica je ostala 3.028px iznad ekrana. U efektu raspored je već novi, pa
   * je cilj dostižan.
   *
   * ── Zašto kroz `scrollToElement` ──────────────────────────────────────
   * Skrol na ovoj stranici vozi Lenis. Native `scrollIntoView` bi izdržao
   * jedan kadar, pa bi ga Lenis sljedeći vratio nazad.
   *
   * Bezuslovno, bez provjere `top < 0`: čarobnjak od tri koraka se čita
   * odozgo. Ako je kartica ionako na vrhu, pomak se ne vidi jer ga nema.
   */
  const firstRender = useRef(true);

  useEffect(() => {
    // Dolazak na stranicu nije prelaz koraka — tu se ne pomjera ništa.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const card = cardRef.current;
    if (!card) return;

    /*
     * Dva kadra čekanja prije mjerenja.
     *
     * Novi korak ulazi s animacijom i raspored se pod njom još slegne. Ako se
     * cilj izmjeri odmah, Lenis krene prema broju koji do kraja animacije više
     * ne važi — mjereno, kartica je završavala 444px ispod vrha ekrana umjesto
     * na njemu. Prvi kadar preglednik primijeni novi raspored, drugi ga izmjeri.
     */
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => scrollToElement(card));
    });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [step]);

  const railLabels = [t.booking.wizard.dates, t.booking.wizard.details, t.booking.wizard.review];

  /**
   * Koliko je trenutni korak popunjen, od 0 do 1.
   *
   * Ovo je jedino mjesto gdje se kucanje vidi IZVAN polja u koje se kuca:
   * prsten oko tačke u traci raste sa svakim poljem koje postane ispravno.
   * Gost time zna koliko mu je još ostalo, a da ne mora brojati polja.
   */
  const filled =
    step === 0
      ? datesReady
        ? 1
        : 0
      : step === 1
        ? [isName(name), isEmail(email), isPhone(phone), method !== null].filter(Boolean).length / 4
        : 1;

  return (
    <section id="rezervacija" className="plus-surface-alt plus-rule border-y">
      <div className="plus-section">
        <Reveal>
          <p className="plus-eyebrow">{t.nav.book}</p>
        </Reveal>
        <LineReveal as="h2" className="plus-title" text={t.booking.heading} />
        <LineReveal as="p" className="plus-lead" text={t.booking.lead} delay={120} stagger={70} />

        <Reveal delay={100} className="mt-12">
          <div ref={cardRef} id="pregled" className="plus-card mx-auto max-w-5xl p-5 sm:p-8">
            <Rail labels={railLabels} step={step} filled={filled} />

            <div data-dir={dir} className="mt-8">
              {/* ── 1. Datumi ── */}
              <Panel active={step === 0} label={t.booking.wizard.stepOf(1, STEPS)}>
                {/*
                 * Sažetak ide pored kalendara tek od `xl`. Ispod toga kalendar
                 * uzima cijelu širinu: prikazuje DVA mjeseca odjednom i u užoj
                 * koloni mu se prvi mjesec odreže — a `overflow: hidden`, koji
                 * drži animaciju visine, taj višak nemilosrdno pojede.
                 */}
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="min-w-0">
                    <StayCalendar
                      slots={slots}
                      range={range}
                      onRangeChange={form.setRange}
                      maxNights={settings.max_nights}
                    />
                  </div>

                  <div className="plus-rule xl:border-s xl:ps-8">
                    <dl className="space-y-3 text-sm">
                      <Row
                        label={t.booking.checkIn}
                        value={start ? formatLong(start, locale) : null}
                        empty={t.booking.notSelected}
                      />
                      <Row
                        label={t.booking.checkOut}
                        value={end ? formatLong(end, locale) : null}
                        empty={t.booking.notSelected}
                      />
                    </dl>

                    <p className="mt-4 text-xs leading-relaxed plus-dim">
                      {t.booking.timesNote(settings.checkin_time, settings.checkout_time)}
                    </p>

                    {!range?.from && (
                      <p className="mt-4 text-xs plus-dim">{t.booking.singleDayHint}</p>
                    )}

                    {singleDay && (
                      // Bez `plus-total`: obje klase postavljaju boju, a
                      // `plus-note` dolazi kasnije u stilu i ionako je nadjačava.
                      <p className="mt-4 plus-note px-4 py-3 text-xs leading-relaxed">
                        {t.booking.singleDayNote}
                      </p>
                    )}

                    {stayError && (
                      <p
                        role="alert"
                        className="animate-fade-rise mt-4 plus-alert px-4 py-3 text-xs leading-relaxed"
                      >
                        {stayError}
                      </p>
                    )}

                    {range?.from && (
                      <button
                        type="button"
                        onClick={form.clearRange}
                        className="plus-link mt-4 text-xs font-semibold underline underline-offset-4 transition-colors"
                      >
                        {t.booking.clearDates}
                      </button>
                    )}
                  </div>
                </div>
              </Panel>

              {/* ── 2. Vaši podaci ── */}
              <Panel active={step === 1} label={t.booking.wizard.stepOf(2, STEPS)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <GuestStepper
                      value={guests}
                      max={settings.max_guests}
                      onChange={form.setGuests}
                      label={t.booking.guests}
                      text={count(locale, guests, t.common.guests)}
                      disabled={busy}
                    />
                  </div>

                  {/* `valid` dolazi iz istih funkcija koje provjeravaju i
                      slanje, pa polje ne može upaliti kvačicu za nešto što bi
                      server odbio. */}
                  <LiveField
                    label={t.booking.name}
                    value={name}
                    onChange={form.setName}
                    valid={isName(name)}
                    placeholder={t.booking.namePlaceholder}
                    autoComplete="name"
                    disabled={busy}
                  />
                  <LiveField
                    label={t.booking.email}
                    type="email"
                    value={email}
                    onChange={form.setEmail}
                    valid={isEmail(email)}
                    placeholder={t.booking.emailPlaceholder}
                    autoComplete="email"
                    disabled={busy}
                  />
                  <LiveField
                    label={t.booking.phone}
                    type="tel"
                    value={phone}
                    onChange={form.setPhone}
                    valid={isPhone(phone)}
                    placeholder={t.booking.phonePlaceholder}
                    autoComplete="tel"
                    disabled={busy}
                  />

                  <div className="sm:col-span-2">
                    {/* Napomena nema `valid`: ona je neobavezna, pa nema šta
                        ni da potvrdi ni da prigovori. */}
                    <LiveField
                      label={t.booking.note}
                      optionalNote={`(${t.booking.optional})`}
                      value={note}
                      onChange={form.setNote}
                      rows={3}
                      maxLength={500}
                      placeholder={t.booking.notePlaceholder}
                      disabled={busy}
                    />
                  </div>
                </div>

                <fieldset className="mt-6 plus-rule border-t pt-6">
                  <legend className="sr-only">{t.booking.payMethodTitle}</legend>
                  <p className="plus-label">{t.booking.payMethodTitle}</p>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {paymentMethods.map((id) => {
                      const copy = methodCopy[id];
                      if (!copy) return null;
                      const selected = method === id;

                      return (
                        <label
                          key={id}
                          data-on={selected}
                          className={`plus-pick plus-press relative flex cursor-pointer gap-3 p-4 pe-11 ${
                            busy ? 'cursor-not-allowed opacity-60' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="plus_payment_method"
                            value={id}
                            checked={selected}
                            disabled={busy}
                            onChange={() => form.setMethod(id)}
                            className="plus-pick-radio mt-0.5 h-4 w-4 shrink-0"
                          />
                          <span className="min-w-0">
                            <span
                              className={`block text-sm font-semibold ${
                                id === 'test' ? 'plus-warn' : 'plus-ink'
                              }`}
                            >
                              {copy.label}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed plus-dim">
                              {copy.hint}
                            </span>
                          </span>

                          {/* Kvačica se nacrta pri odabiru — isti odgovor kao
                              u poljima, pa cijela forma govori jednim jezikom. */}
                          <Check className="plus-pick-tick" />
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </Panel>

              {/* ── 3. Potvrda ── */}
              <Panel active={step === 2} label={t.booking.wizard.stepOf(3, STEPS)}>
                <p className="text-sm plus-dim">{t.booking.wizard.reviewLead}</p>

                <dl className="mt-6 space-y-3 plus-rule border-t pt-6 text-sm">
                  <Row
                    label={t.booking.checkIn}
                    value={start ? formatLong(start, locale) : null}
                    empty={t.booking.notSelected}
                  />
                  <Row
                    label={t.booking.checkOut}
                    value={end ? formatLong(end, locale) : null}
                    empty={t.booking.notSelected}
                  />
                  <Row
                    label={t.booking.guests}
                    value={count(locale, guests, t.common.guests)}
                    empty=""
                  />
                  <Row label={t.booking.name} value={name.trim() || null} empty="—" />
                  <Row label={t.booking.email} value={email.trim() || null} empty="—" />
                  <Row label={t.booking.phone} value={phone.trim() || null} empty="—" />
                  <Row
                    label={t.booking.payMethodTitle}
                    value={method ? (methodCopy[method]?.label ?? null) : null}
                    empty="—"
                  />
                </dl>

                {quote && new Set(quote.days.map((d) => d.cents)).size > 1 && (
                  <p className="mt-4 text-xs plus-dim">
                    {quote.days.some((d) => d.periodName === WEEKEND_PERIOD)
                      ? t.booking.weekendNote
                      : t.booking.seasonalNote}
                  </p>
                )}

                {(error || stayError) && (
                  <p role="alert" className="animate-fade-rise mt-5 plus-alert px-4 py-3 text-sm">
                    {error ?? stayError}
                  </p>
                )}

                <PlusButton
                  onClick={() => void form.submit()}
                  disabled={busy || paymentMethods.length === 0}
                  className={`plus-btn-accent mt-6 w-full py-4 ${busy ? 'plus-btn-busy' : ''}`}
                >
                  {busy && <Spinner />}
                  {busy ? t.booking.submitting : t.booking.reserve}
                </PlusButton>
              </Panel>
            </div>

            {/* ── Cijena i kretanje kroz korake ──
                Cijena stoji ovdje, ispod svih koraka, jer je jedini podatak
                koji je jednako bitan u sva tri. */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 plus-rule border-t pt-6">
              <div className="min-w-0">
                {quote ? (
                  <>
                    {/* Stvarne stavke, ne prosjek. Vidi `RateBreakdown` ispod. */}
                    <RateBreakdown quote={quote} locale={locale} t={t} />
                    <p
                      className="text-2xl tabular-nums plus-total"
                      style={{ fontFamily: 'var(--font-plus-display)' }}
                    >
                      <CountTo
                        value={quote.totalCents}
                        format={(cents) => formatMoney(cents, quote.currencySymbol, locale)}
                      />
                    </p>
                  </>
                ) : (
                  <p className="text-xs plus-dimmer">{t.booking.selectDatesFirst}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <PlusButton
                    onClick={() => go(step - 1, 'back')}
                    disabled={busy}
                    className="plus-btn-ghost px-5 py-2.5"
                  >
                    {t.booking.wizard.back}
                  </PlusButton>
                )}

                {step < STEPS - 1 && (
                  <PlusButton
                    onClick={() => go(step + 1, 'fwd')}
                    disabled={step === 0 ? !datesReady : detailsError !== null}
                    className="plus-btn-primary px-6 py-2.5"
                  >
                    {t.booking.wizard.next}
                  </PlusButton>
                )}
              </div>
            </div>

            {/* Zašto je "Dalje" ugašeno — bez ovoga gost pritisne dugme koje ne
                reaguje i nema pojma šta se od njega traži. */}
            {step === 1 && detailsError && (
              <p className="mt-3 text-end text-xs plus-dim">{detailsError}</p>
            )}
          </div>
        </Reveal>
      </div>

      {/* Na mobitelu cijena prati gosta dok bira datume. */}
      {quote && !stayError && (
        <div className="plus-bar animate-fade-rise plus-rule fixed inset-x-0 bottom-0 z-30 border-t px-5 py-3 shadow-raise backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-xs plus-dim">
                {start && end ? count(locale, daysBetween(start, end), t.common.days) : ''}
              </p>
              <p
                className="text-xl tabular-nums plus-total"
                style={{ fontFamily: 'var(--font-plus-display)' }}
              >
                <CountTo
                  value={quote.totalCents}
                  format={(cents) => formatMoney(cents, quote.currencySymbol, locale)}
                />
              </p>
            </div>

            {/* Na posljednjem koraku traka nema kuda dalje — dugme bi vodilo
                na korak na kojem gost već stoji. */}
            {step < STEPS - 1 && (
              <PlusButton
                onClick={() => go(step + 1, 'fwd')}
                disabled={step === 0 ? !datesReady : detailsError !== null}
                className="plus-btn-primary shrink-0 px-5 py-2.5"
              >
                {t.booking.wizard.next}
              </PlusButton>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Traka napretka.
 *
 * Linija ispod tačaka se puni do trenutnog koraka. Broj u tački se na
 * pređenim koracima mijenja u kvačicu — to je jedino mjesto gdje se vidi šta
 * je gotovo, a šta tek dolazi.
 */
function Rail({ labels, step, filled }: { labels: string[]; step: number; filled: number }) {
  // Obim kruga poluprečnika 15 — koliko poteza ima prsten oko aktivne tačke.
  const ring = 2 * Math.PI * 15;

  return (
    <ol className="relative flex items-start justify-between gap-2">
      {/* Linija ide IZA tačaka i staje na sredini prve i posljednje, da ne
          viri izvan njih. */}
      <span
        aria-hidden="true"
        className="plus-rail-track absolute inset-x-0 top-4 mx-auto h-px"
        style={{ left: '16.66%', right: '16.66%' }}
      />
      <span
        aria-hidden="true"
        className="plus-rail-fill absolute top-4 h-px"
        style={{
          left: '16.66%',
          width: `calc(66.68% * ${step / (labels.length - 1)})`,
        }}
      />

      {labels.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'todo';

        return (
          <li
            key={label}
            data-state={state}
            className="plus-rail-step relative z-10 flex flex-1 flex-col items-center gap-2 text-center"
          >
            <span className="relative flex h-8 w-8 items-center justify-center">
              {/* Prsten oko aktivne tačke raste dok se korak popunjava. Crta
                  se od dvanaest sati naviše (`rotate(-90)`), jer se napredak
                  čita odozgo, a ne s desne strane. */}
              {state === 'active' && (
                <svg
                  className="absolute inset-0 h-8 w-8 -rotate-90"
                  viewBox="0 0 34 34"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="17"
                    cy="17"
                    r="15"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="plus-rail-ring"
                    style={{
                      strokeDasharray: ring,
                      strokeDashoffset: ring * (1 - filled),
                    }}
                  />
                </svg>
              )}

              <span className="plus-rail-dot flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold tabular-nums">
                {state === 'done' ? <Check /> : i + 1}
              </span>
            </span>
            <span className="plus-rail-name plus-sans text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs">
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Jedan korak.
 *
 * Uvijek je u DOM-u; `data-active` odlučuje je li otvoren, a `inert` da li u
 * njega uopće može fokus. Sve ostalo — visinu i ulazak sadržaja — radi CSS.
 */
function Panel({
  active,
  label,
  children,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="plus-step" data-active={active} inert={!active} aria-label={label}>
      <div className="plus-step-inner">{children}</div>
    </div>
  );
}

function Check({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="m5 13 4.2 4.2L19 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Razrada cijene: koliko dana po kojoj cijeni, i zašto.
 *
 * Ovdje je stajalo `dayCount × averageDailyCents` — "3 dana × 266,67 KM" za
 * boravak koji je zapravo dva radna dana po 250 i jedna subota po 300. Taj
 * prosjek ne postoji ni u jednom cjenovniku: gost ga ne može provjeriti, a
 * domaćin ga ne naplaćuje.
 *
 * ── Zašto je red o vikendu drugačiji od reda o sezoni ─────────────────────
 * Sezonu je imenovao domaćin ("Ljeto", "Nova godina") i to ime ide onako kako
 * ga je napisao — prevoditi tuđi naziv sezone bi značilo izmisliti ga. Vikend
 * nije ime nego pravilo, isto na sva tri jezika, pa nosi ključ
 * `WEEKEND_PERIOD` i ispisuje se iz rječnika.
 *
 * Kad je cijena kroz cijeli boravak ista, ostaje jedan red bez zagrade —
 * dodatno objašnjenje tu nema šta da objasni.
 */
function RateBreakdown({
  quote,
  locale,
  t,
}: {
  quote: PriceBreakdown;
  locale: Locale;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const groups = groupByRate(quote.days);

  return (
    <div className="space-y-0.5">
      {groups.map((group) => {
        const reason =
          group.periodName === WEEKEND_PERIOD
            ? t.booking.weekendRateLabel
            : (group.periodName ?? null);

        return (
          <p
            key={`${group.periodName ?? 'base'}-${group.cents}`}
            className="text-xs plus-dim tabular-nums"
          >
            {t.booking.daysLabel(group.dayCount)}
            {reason ? <span className="plus-dimmer"> ({reason})</span> : null} ×{' '}
            {formatMoney(group.cents, quote.currencySymbol, locale)}
          </p>
        );
      })}
    </div>
  );
}

function Row({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="plus-dim">{label}</dt>
      <dd className="text-end font-medium plus-ink">
        {/*
         * `key` je sama vrijednost, pa React pri promjeni ne prepiše tekst
         * nego napravi NOVI element — a time se CSS animacija upali iznova.
         * Bez njega bi se datum tiho zamijenio i gost ne bi bio siguran je li
         * dodir uopće primljen.
         */}
        <span key={value ?? 'prazno'} className="plus-value-swap">
          {value ?? <span className="font-normal plus-dimmer">{empty}</span>}
        </span>
      </dd>
    </div>
  );
}

/**
 * Kotur koji se vrti dok se rezervacija šalje.
 *
 * Bez njega dugme samo promijeni tekst, pa gost na sporoj vezi ne zna je li
 * klik uopće primljen i klikne ponovo. `aria-hidden` jer promjenu stanja već
 * javlja sam tekst dugmeta.
 */
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
