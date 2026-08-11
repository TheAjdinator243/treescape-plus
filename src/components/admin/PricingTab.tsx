'use client';

import { useState } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';
import { formatNumeric, todayStr } from '@/lib/dates';
import { formatMoney } from '@/lib/pricing';
import type { RatePeriod, Settings } from '@/lib/types';

/**
 * Cijene se u bazi drže u centima (12000 = 120,00 €) da se izbjegne
 * zaokruživanje decimalnih brojeva. Vlasniku prikazujemo normalne iznose i
 * pretvaramo ih tek pri slanju.
 */
const toMajor = (cents: number) => String(cents / 100);
const toCents = (major: string) => Math.round(Number(major.replace(',', '.')) * 100);

export function PricingTab({
  settings,
  periods,
  onCall,
}: {
  settings: Settings;
  periods: RatePeriod[];
  onCall: (url: string, init: RequestInit) => Promise<boolean>;
}) {
  const { locale, t } = useI18n();
  const [form, setForm] = useState({
    default_nightly: toMajor(settings.default_nightly_cents),
    weekend_price: toMajor(settings.weekend_price_cents),
    max_nights: String(settings.max_nights),
    max_guests: String(settings.max_guests),
    hold_minutes: String(settings.hold_minutes),
    currency: settings.currency,
    currency_symbol: settings.currency_symbol,
    checkin_time: settings.checkin_time,
    checkout_time: settings.checkout_time,
  });
  const [saved, setSaved] = useState(false);

  const [season, setSeason] = useState({
    name: '',
    start_date: '',
    end_date: '',
    price: '',
    priority: '10',
  });

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const ok = await onCall('/api/admin/pricing', {
      method: 'PUT',
      body: JSON.stringify({
        default_nightly_cents: toCents(form.default_nightly),
        weekend_price_cents: toCents(form.weekend_price),
        // Naknade za čišćenje i minimalnog boravka više nema — u bazi ostaju
        // kolone (da ne treba nova migracija), ali se drže na neutralnoj vrijednosti.
        cleaning_fee_cents: 0,
        min_nights: 1,
        max_nights: Number(form.max_nights),
        max_guests: Number(form.max_guests),
        hold_minutes: Number(form.hold_minutes),
        currency: form.currency.toUpperCase(),
        currency_symbol: form.currency_symbol,
        checkin_time: form.checkin_time,
        checkout_time: form.checkout_time,
        // Plaćanje na račun je uklonjeno sa sajta. Kolone ostaju u bazi (da
        // se ne mora u migraciju), pa im se šalju iste vrijednosti koje već
        // imaju — forma ih više ne nudi na izmjenu.
        bank_account_name: settings.bank_account_name,
        bank_name: settings.bank_name,
        bank_iban: settings.bank_iban,
        transfer_days: settings.transfer_days,
      }),
    });

    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  }

  async function addSeason(e: React.FormEvent) {
    e.preventDefault();

    const ok = await onCall('/api/admin/pricing', {
      method: 'POST',
      body: JSON.stringify({
        name: season.name,
        start_date: season.start_date,
        end_date: season.end_date,
        nightly_price_cents: toCents(season.price),
        min_nights: null,
        priority: Number(season.priority),
      }),
    });

    if (ok) {
      setSeason({ name: '', start_date: '', end_date: '', price: '', priority: '10' });
    }
  }

  async function removeSeason(id: string) {
    if (!window.confirm(t.admin.seasonDeleteConfirm)) return;
    await onCall(`/api/admin/pricing?id=${id}`, { method: 'DELETE' });
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-14">
      {/* ── Osnovne cijene ── */}
      <section>
        <h2 className="font-display text-2xl text-forest-900">{t.admin.pricingHeading}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">{t.admin.pricingLead}</p>

        <form onSubmit={saveSettings} className="card mt-6 grid gap-5 p-6 sm:grid-cols-2">
          <Num
            id="default_nightly"
            label={`${t.admin.defaultNightly} (${settings.currency_symbol})`}
            value={form.default_nightly}
            onChange={set('default_nightly')}
            step="0.01"
          />
          <div>
            <Num
              id="weekend_price"
              label={`${t.admin.weekendPrice} (${settings.currency_symbol})`}
              value={form.weekend_price}
              onChange={set('weekend_price')}
              step="0.01"
            />
            <p className="mt-1.5 text-xs text-ink-400">{t.admin.weekendPriceHint}</p>
          </div>

          <Num id="max_nights" label={t.admin.maxNights} value={form.max_nights} onChange={set('max_nights')} />
          <Num id="max_guests" label={t.admin.maxGuests} value={form.max_guests} onChange={set('max_guests')} />
          <Num
            id="hold_minutes"
            label={t.admin.holdMinutes}
            value={form.hold_minutes}
            onChange={set('hold_minutes')}
          />

          <div>
            <label htmlFor="checkin_time" className="field-label">
              {t.admin.checkinFrom}
            </label>
            <input
              id="checkin_time"
              type="time"
              value={form.checkin_time}
              onChange={set('checkin_time')}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="checkout_time" className="field-label">
              {t.admin.checkoutBy}
            </label>
            <input
              id="checkout_time"
              type="time"
              value={form.checkout_time}
              onChange={set('checkout_time')}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="currency" className="field-label">
              {t.admin.currency}
            </label>
            <input
              id="currency"
              type="text"
              maxLength={3}
              value={form.currency}
              onChange={set('currency')}
              className="field-input uppercase"
            />
          </div>
          <div>
            <label htmlFor="currency_symbol" className="field-label">
              {t.admin.currencySymbol}
            </label>
            <input
              id="currency_symbol"
              type="text"
              maxLength={5}
              value={form.currency_symbol}
              onChange={set('currency_symbol')}
              className="field-input"
            />
          </div>

          <div className="flex items-center gap-4 sm:col-span-2">
            <button type="submit" className="btn-primary px-6 py-2.5 text-xs">
              {t.admin.save}
            </button>
            {saved && <span className="text-sm text-success-600">{t.admin.saved}</span>}
          </div>
        </form>
      </section>

      {/* ── Sezone ── */}
      <section>
        <h2 className="font-display text-2xl text-forest-900">{t.admin.seasonsHeading}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          {t.admin.seasonsLead}
        </p>

        {periods.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-sand-300 px-6 py-10 text-center text-sm text-ink-400">
            {t.admin.seasonsEmpty}
          </p>
        ) : (
          <div className="card mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead className="border-b border-sand-200 text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-3 font-medium">{t.admin.seasonName}</th>
                  <th className="px-5 py-3 font-medium">{t.admin.seasonPeriod}</th>
                  <th className="px-5 py-3 text-end font-medium">{t.admin.seasonPrice}</th>
                  <th className="px-5 py-3 text-end font-medium">{t.admin.seasonPriority}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td className="px-5 py-3.5 font-medium text-ink-900">{period.name}</td>
                    <td className="px-5 py-3.5 text-ink-500">
                      {formatNumeric(period.start_date, locale)} –{' '}
                      {formatNumeric(period.end_date, locale)}
                    </td>
                    <td className="px-5 py-3.5 text-end tabular-nums text-ink-900">
                      {formatMoney(period.nightly_price_cents, settings.currency_symbol, locale)}
                    </td>
                    <td className="px-5 py-3.5 text-end text-ink-500">{period.priority}</td>
                    <td className="px-5 py-3.5 text-end">
                      <button
                        type="button"
                        onClick={() => void removeSeason(period.id)}
                        className="text-xs font-medium text-danger-600 underline underline-offset-4"
                      >
                        {t.admin.seasonDelete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addSeason} className="card mt-6 grid gap-4 p-6 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <label htmlFor="season-name" className="field-label">
              {t.admin.seasonName}
            </label>
            <input
              id="season-name"
              type="text"
              required
              value={season.name}
              onChange={(e) => setSeason((s) => ({ ...s, name: e.target.value }))}
              placeholder={t.admin.seasonNamePlaceholder}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="season-start" className="field-label">
              {t.admin.seasonFrom}
            </label>
            <input
              id="season-start"
              type="date"
              required
              value={season.start_date}
              onChange={(e) => setSeason((s) => ({ ...s, start_date: e.target.value }))}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="season-end" className="field-label">
              {t.admin.seasonTo}{' '}
              <span className="font-normal text-ink-400">({t.admin.seasonToHint})</span>
            </label>
            <input
              id="season-end"
              type="date"
              required
              min={season.start_date || todayStr()}
              value={season.end_date}
              onChange={(e) => setSeason((s) => ({ ...s, end_date: e.target.value }))}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="season-price" className="field-label">
              {t.admin.seasonPrice} ({settings.currency_symbol})
            </label>
            <input
              id="season-price"
              type="number"
              required
              min="0"
              step="0.01"
              value={season.price}
              onChange={(e) => setSeason((s) => ({ ...s, price: e.target.value }))}
              className="field-input"
            />
          </div>

          <div>
            <label htmlFor="season-priority" className="field-label">
              {t.admin.seasonPriority}
            </label>
            <input
              id="season-priority"
              type="number"
              required
              min="0"
              value={season.priority}
              onChange={(e) => setSeason((s) => ({ ...s, priority: e.target.value }))}
              className="field-input"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full py-2.5 text-xs">
              {t.admin.seasonAdd}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Num({
  id,
  label,
  value,
  onChange,
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        type="number"
        required
        min="0"
        step={step ?? '1'}
        value={value}
        onChange={onChange}
        className="field-input"
      />
    </div>
  );
}
