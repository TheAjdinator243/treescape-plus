'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { searchBookings } from '@/lib/booking-search';
import { formatDateTime, formatRange, todayStr } from '@/lib/dates';
import { count } from '@/lib/i18n';
import { formatMoney } from '@/lib/pricing';
import { bookingReference } from '@/lib/reference';
import type { Booking, RatePeriod, Settings } from '@/lib/types';

import { PricingTab } from './PricingTab';
import { useLiveRequests } from './useLiveRequests';

type Tab = 'requests' | 'bookings' | 'calendar' | 'pricing';

/**
 * Pitanje za razlog, koji gost dobija u mailu.
 *
 * `null` znači "odustani od cijele radnje" (zatvoren prozorčić), a prazan niz
 * "nastavi, ali bez navođenja razloga". Razlika je bitna: bez nje bi zatvaranje
 * prozorčića odbilo rezervaciju.
 */
function askReason(question: string): string | null {
  const answer = window.prompt(question);
  return answer === null ? null : answer.trim().slice(0, 300);
}

/** Statusi koje vlasnik još može otkazati — na jednom mjestu, za obje liste. */
const CANCELLABLE: string[] = ['confirmed', 'pending_cash', 'pending_payment'];

/**
 * Pretraga rezervacija.
 *
 * Jedno polje umjesto biranja kategorije: domaćin obično zna samo JEDAN
 * podatak — broj koji mu gost čita preko telefona, ili ime, ili broj s
 * dolaznog poziva — pa nema smisla da prvo bira po čemu traži.
 *
 * `type="search"` daje preglednički "x" za brisanje na mobitelu, a
 * `enterKeyHint="search"` mijenja natpis na tipki Enter na tastaturi telefona.
 */
function BookingSearch({
  query,
  onChange,
  found,
  total,
  t,
}: {
  query: string;
  onChange: (v: string) => void;
  found: number;
  total: number;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <div className="mb-5">
      <label htmlFor="pretraga" className="sr-only">
        {t.admin.searchLabel}
      </label>

      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-ink-400"
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>

        <input
          id="pretraga"
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.admin.searchPlaceholder}
          enterKeyHint="search"
          autoComplete="off"
          className="field-input ps-10"
        />

        {query && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-ink-400 hover:text-ink-700"
            aria-label={t.admin.searchClear}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* `aria-live` da čitač ekrana pročita broj rezultata bez pomjeranja fokusa. */}
      <p className="mt-2 text-xs text-ink-400" aria-live="polite">
        {query ? t.admin.searchCount(found, total) : null}
      </p>
    </div>
  );
}

/**
 * Kontakt gosta — kao linkovi, ne kao goli tekst.
 *
 * Administracija se najčešće otvara na telefonu: tamo dodir na broj odmah
 * zove, a dodir na mail otvara pisanje poruke. Prepisivanje broja s ekrana je
 * jedini korak u kojem se stvarno lako pogriješi.
 */
function Contact({
  email,
  phone,
  className = 'text-xs',
}: {
  email: string | null;
  phone: string | null;
  className?: string;
}) {
  if (!email && !phone) return null;

  return (
    <p className={`mt-1 text-ink-500 ${className}`}>
      {phone && (
        // Razmaci u broju su za oko, ne za pozivanje — `tel:` ih ne voli.
        <a href={`tel:${phone.replace(/\s+/g, '')}`} className="underline underline-offset-2">
          {phone}
        </a>
      )}
      {phone && email && <span className="text-ink-300"> · </span>}
      {email && (
        <a href={`mailto:${email}`} className="break-all underline underline-offset-2">
          {email}
        </a>
      )}
    </p>
  );
}

/**
 * Broj rezervacije, onako kako ga gost vidi.
 *
 * Gost ga dobije u mailu i pročita preko telefona ("moj broj je ABCDEF12").
 * Bez njega u administraciji domaćin nije imao s čim uporediti, pa je
 * rezervaciju tražio po imenu i datumu — a imena se ponavljaju.
 *
 * `select-all` da se označi jednim klikom; `dir="ltr"` jer je niz latinični i
 * čita se slijeva nadesno i na arapskoj stranici.
 */
function Reference({ token }: { token: string }) {
  return (
    <span dir="ltr" className="select-all font-mono text-xs tracking-wider text-ink-500">
      {bookingReference(token)}
    </span>
  );
}

export function Dashboard({
  bookings,
  periods,
  settings,
}: {
  bookings: Booking[];
  periods: RatePeriod[];
  settings: Settings;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('requests');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Novi zahtjev se pojavi sam, bez osvježavanja stranice.
  useLiveRequests();

  const requests = bookings.filter((b) => b.status === 'pending_cash');
  const blocked = bookings.filter((b) => b.status === 'blocked' && b.end_date >= todayStr());

  /**
   * Pretraga radi u pregledniku, nad već učitanim rezervacijama.
   *
   * Za kuću s jednim terminom dnevno to je najviše nekoliko stotina redova —
   * filtriranje je trenutno, a domaćin dobija rezultat dok kuca, bez odlaska
   * na server. Ako spisak ikad naraste toliko da se to oseti, pretraga se
   * seli u upit prema bazi; `matchesBookingSearch` je zato izdvojen.
   */
  const vidljive = useMemo(() => searchBookings(bookings, search), [bookings, search]);

  /** Zajednički poziv admin API-ja: uradi, pa osvježi podatke sa servera. */
  async function call(url: string, init: RequestInit): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t.errors.SERVER_ERROR);
        return false;
      }

      startTransition(() => router.refresh());
      return true;
    } catch {
      setError(t.errors.SERVER_ERROR);
      return false;
    }
  }

  async function decide(bookingId: number, decision: 'approve' | 'reject') {
    const message = decision === 'reject' ? t.admin.rejectConfirm : t.admin.approveConfirm;
    if (!window.confirm(message)) return;

    let reason: string | undefined;

    if (decision === 'reject') {
      const answer = askReason(t.admin.rejectReasonPrompt);
      // Odustajanje od pitanja znači odustajanje od cijele radnje — inače bi
      // se termin odbio zato što je neko htio zatvoriti prozorčić.
      if (answer === null) return;
      reason = answer;
    }

    await call('/api/admin/bookings', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, decision, reason }),
    });
  }

  async function cancel(bookingId: number, confirmText: string) {
    if (!window.confirm(confirmText)) return;

    const reason = askReason(t.admin.cancelReasonPrompt);
    if (reason === null) return;

    const query = new URLSearchParams({ id: String(bookingId) });
    if (reason) query.set('reason', reason);

    await call(`/api/admin/bookings?${query}`, { method: 'DELETE' });
  }

  /**
   * Probna obavijest — jedini način da se vidi GDJE je stala, bez pravljenja
   * lažne rezervacije. Odgovor nosi i Telegramov razlog odbijanja.
   */
  async function testNotification(kanal?: 'mail') {
    setError(null);
    setNotice(t.admin.testNotificationSending);

    try {
      const res = await fetch(`/api/admin/test-notification${kanal ? `?kanal=${kanal}` : ''}`, {
        method: 'POST',
      });
      const data = (await res.json()) as { ok?: boolean; detail?: string };
      const detail = data.detail ?? t.errors.SERVER_ERROR;

      if (data.ok) {
        setNotice(detail);
      } else {
        setNotice(null);
        setError(detail);
      }
    } catch {
      setNotice(null);
      setError(t.errors.SERVER_ERROR);
    }
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.refresh();
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'requests', label: t.admin.tabRequests, badge: requests.length },
    { id: 'bookings', label: t.admin.tabBookings },
    { id: 'calendar', label: t.admin.tabCalendar },
    { id: 'pricing', label: t.admin.tabPricing },
  ];

  return (
    <main className="min-h-dvh bg-sand-50">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="font-display text-lg text-forest-900">{t.site.name}</p>
            <p className="text-xs text-ink-400">{t.admin.title}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="btn-ghost px-4 py-2 text-xs"
          >
            {t.admin.logout}
          </button>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 sm:px-8">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'border-forest-700 text-forest-800'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="ms-2 rounded-full bg-ember-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-danger-600/25 bg-danger-600/5 px-4 py-3 text-sm text-danger-600"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mb-6 rounded-xl border border-success-600/25 bg-success-600/5 px-4 py-3 text-sm text-success-600"
          >
            {notice}
          </p>
        )}

        <div className={pending ? 'pointer-events-none opacity-60 transition-opacity' : ''}>
          {tab === 'requests' && (
            <>
              <Section heading={t.admin.requestsHeading}>
                <div className="-mt-4 mb-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void testNotification()}
                    className="btn-ghost px-4 py-2 text-xs"
                  >
                    {t.admin.testNotification}
                  </button>
                  <button
                    type="button"
                    onClick={() => void testNotification('mail')}
                    className="btn-ghost px-4 py-2 text-xs"
                  >
                    {t.admin.testGuestEmail}
                  </button>
                </div>
                {requests.length === 0 ? (
                  <Empty>{t.admin.requestsEmpty}</Empty>
                ) : (
                  <ul className="space-y-4">
                    {requests.map((booking) => (
                      <li key={booking.id} className="card p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-display text-lg text-forest-900">
                              {formatRange(booking.start_date, booking.end_date, locale)}
                            </p>
                            <p className="mt-1 text-sm text-ink-700">
                              {booking.guest_name} ·{' '}
                              {count(locale, booking.guests ?? 1, t.common.guests)}
                            </p>
                            <Contact
                              email={booking.guest_email}
                              phone={booking.guest_phone}
                              className="text-sm"
                            />
                            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                              <span>
                                {t.admin.receivedAt(formatDateTime(booking.created_at, locale))}
                              </span>
                              <Reference token={booking.booking_public_link} />
                            </p>
                            {booking.note && (
                              <p className="mt-3 rounded-lg bg-sand-100 px-3 py-2 text-sm text-ink-700">
                                {booking.note}
                              </p>
                            )}
                          </div>

                          <div className="text-end">
                            <p className="font-display text-2xl text-forest-800">
                              {formatMoney(booking.total_cents, settings.currency_symbol, locale)}
                            </p>
                            <p className="text-xs text-ink-400">{t.admin.byCash}</p>
                          </div>
                        </div>

                        <div className="mt-5 flex gap-3 border-t border-sand-200 pt-4">
                          <button
                            type="button"
                            onClick={() => void decide(booking.id, 'approve')}
                            className="btn-primary flex-1 py-2.5 text-xs"
                          >
                            {t.admin.approve}
                          </button>
                          <button
                            type="button"
                            onClick={() => void decide(booking.id, 'reject')}
                            className="btn-ghost flex-1 py-2.5 text-xs"
                          >
                            {t.admin.reject}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}

          {tab === 'bookings' && (
            <Section heading={t.admin.bookingsHeading}>
              {bookings.length === 0 ? (
                <Empty>{t.admin.bookingsEmpty}</Empty>
              ) : (
                <>
                  <BookingSearch
                    query={search}
                    onChange={setSearch}
                    found={vidljive.length}
                    total={bookings.length}
                    t={t}
                  />

                  {vidljive.length === 0 && <Empty>{t.admin.searchNothing}</Empty>}

                  {/*
                    Na telefonu se tabela od 720px mora vući postrance, pa
                    kontakt gosta ostane iza ivice ekrana — a upravo on tu
                    najviše treba, jer nakon odobrenja zahtjev nestane iz
                    kartice "Zahtjevi" i broj se više nigdje ne vidi.
                    Zato uski ekran dobija kartice, a tabela ide od tableta naviše.
                  */}
                  <ul className={vidljive.length === 0 ? 'hidden' : 'space-y-3 sm:hidden'}>
                    {vidljive.map((booking) => (
                      <li key={booking.id} className="card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900">
                              {formatRange(booking.start_date, booking.end_date, locale)}
                            </p>
                            <Reference token={booking.booking_public_link} />
                          </div>
                          <StatusBadge status={booking.status} />
                        </div>

                        <p className="mt-2 text-sm text-ink-700">
                          {booking.guest_name ?? (
                            <span className="text-ink-400">{booking.admin_note ?? '—'}</span>
                          )}
                        </p>
                        <Contact
                          email={booking.guest_email}
                          phone={booking.guest_phone}
                          className="text-sm"
                        />

                        <div className="mt-3 flex items-center justify-between border-t border-sand-200 pt-3 text-sm">
                          <span className="text-ink-500">
                            {t.admin.methodLabels[booking.payment_method]}
                          </span>
                          <span className="tabular-nums text-ink-900">
                            {booking.total_cents > 0
                              ? formatMoney(booking.total_cents, settings.currency_symbol, locale)
                              : '—'}
                          </span>
                        </div>

                        {CANCELLABLE.includes(booking.status) && (
                          <button
                            type="button"
                            onClick={() => void cancel(booking.id, t.admin.cancelConfirm)}
                            className="mt-3 text-xs font-medium text-danger-600 underline underline-offset-4"
                          >
                            {t.admin.cancel}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div
                    className={
                      vidljive.length === 0 ? 'hidden' : 'card hidden overflow-x-auto sm:block'
                    }
                  >
                    <table className="w-full min-w-[720px] text-start text-sm">
                      <thead className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-400">
                        <tr>
                          <th className="px-5 py-3 font-medium">{t.admin.colStay}</th>
                          <th className="px-5 py-3 font-medium">{t.admin.colGuest}</th>
                          <th className="px-5 py-3 font-medium">{t.admin.colMethod}</th>
                          <th className="px-5 py-3 font-medium">{t.admin.colStatus}</th>
                          <th className="px-5 py-3 text-end font-medium">{t.admin.colAmount}</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand-200">
                        {vidljive.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-5 py-3.5 text-ink-900">
                              <span className="font-medium">
                                {formatRange(booking.start_date, booking.end_date, locale)}
                              </span>
                              <br />
                              <Reference token={booking.booking_public_link} />
                            </td>
                            <td className="px-5 py-3.5 text-ink-700">
                              {booking.guest_name ?? (
                                <span className="text-ink-400">{booking.admin_note ?? '—'}</span>
                              )}
                              <Contact email={booking.guest_email} phone={booking.guest_phone} />
                            </td>
                            <td className="px-5 py-3.5 text-ink-500">
                              {t.admin.methodLabels[booking.payment_method]}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={booking.status} />
                            </td>
                            <td className="px-5 py-3.5 text-end tabular-nums text-ink-900">
                              {booking.total_cents > 0
                                ? formatMoney(booking.total_cents, settings.currency_symbol, locale)
                                : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-end">
                              {CANCELLABLE.includes(booking.status) && (
                                <button
                                  type="button"
                                  onClick={() => void cancel(booking.id, t.admin.cancelConfirm)}
                                  className="text-xs font-medium text-danger-600 underline underline-offset-4"
                                >
                                  {t.admin.cancel}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Section>
          )}

          {tab === 'calendar' && (
            <BlockTab
              blocked={blocked}
              onBlock={(body) =>
                call('/api/admin/block', { method: 'POST', body: JSON.stringify(body) })
              }
              onUnblock={(id) => cancel(id, t.admin.unblockConfirm)}
            />
          )}

          {tab === 'pricing' && <PricingTab settings={settings} periods={periods} onCall={call} />}
        </div>
      </div>
    </main>
  );
}

function BlockTab({
  blocked,
  onBlock,
  onUnblock,
}: {
  blocked: Booking[];
  onBlock: (body: { start_date: string; end_date: string; reason?: string }) => Promise<boolean>;
  onUnblock: (id: number) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onBlock({ start_date: start, end_date: end, reason: reason || undefined });
    if (ok) {
      setStart('');
      setEnd('');
      setReason('');
    }
  }

  return (
    <Section heading={t.admin.calendarHeading}>
      <p className="-mt-4 mb-6 max-w-2xl text-sm leading-relaxed text-ink-500">
        {t.admin.calendarLead}
      </p>

      <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="block-start" className="field-label">
            {t.admin.seasonFrom}
          </label>
          <input
            id="block-start"
            type="date"
            required
            min={todayStr()}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="block-end" className="field-label">
            {t.admin.seasonTo}
          </label>
          <input
            id="block-end"
            type="date"
            required
            min={start || todayStr()}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="block-reason" className="field-label">
            {t.admin.blockReason}
          </label>
          <input
            id="block-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.admin.blockReasonPlaceholder}
            className="field-input"
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full py-2.5 text-xs">
            {t.admin.blockSubmit}
          </button>
        </div>
      </form>

      <h3 className="mt-10 font-display text-lg text-forest-900">{t.admin.blockedHeading}</h3>
      {blocked.length === 0 ? (
        <Empty>{t.admin.blockedEmpty}</Empty>
      ) : (
        <ul className="mt-4 space-y-2">
          {blocked.map((item) => (
            <li key={item.id} className="card flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="font-medium text-ink-900">
                  {formatRange(item.start_date, item.end_date, locale)}
                </p>
                {item.admin_note && <p className="text-sm text-ink-500">{item.admin_note}</p>}
              </div>
              <button
                type="button"
                onClick={() => void onUnblock(item.id)}
                className="text-xs font-medium text-danger-600 underline underline-offset-4"
              >
                {t.admin.unblock}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();

  const tone: Record<string, string> = {
    confirmed: 'bg-success-600/12 text-success-600',
    pending_cash: 'bg-warn-600/12 text-warn-600',
    pending_payment: 'bg-warn-600/12 text-warn-600',
    blocked: 'bg-ink-500/12 text-ink-700',
    cancelled: 'bg-danger-600/10 text-danger-600',
    expired: 'bg-ink-400/12 text-ink-400',
  };

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        tone[status] ?? 'bg-sand-200 text-ink-700'
      }`}
    >
      {t.admin.statusLabels[status] ?? status}
    </span>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-6 font-display text-2xl text-forest-900">{heading}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-sand-300 px-6 py-12 text-center text-sm text-ink-400">
      {children}
    </p>
  );
}
