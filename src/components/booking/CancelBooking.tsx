'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';

/**
 * Gost sam otkazuje svoju rezervaciju.
 *
 * Namjerno NIJE prozorčić preglednika kao u administraciji. Tamo ga koristi
 * jedan čovjek koji zna šta radi; ovdje piše gost, na telefonu, možda uznemiren
 * — a `prompt` je jednoredni okvir bez oblika, ne trpi duži tekst, na nekim
 * preglednicima je blokiran, i ne može se prevesti ni oblikovati.
 *
 * Zato dugme prvo otvori pravo polje na stranici: vidi se šta se piše, ima
 * mjesta za rečenicu-dvije, i jasno se vidi da razlog nije neobavezan.
 *
 * Razlog je OBAVEZAN. Bez njega vlasnik ostaje da pogađa je li gost našao
 * jeftinije, je li mu se nešto desilo, ili je nešto na sajtu pošlo po zlu.
 */
export function CancelBooking({ token }: { token: string }) {
  const router = useRouter();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Provjera i ovdje i na serveru. Ova je zbog gosta — da odmah vidi šta
    // fali; ona na serveru je zato što se ovoj ne smije vjerovati.
    if (reason.trim().length < 3) {
      setError(t.confirmation.cancelReasonRequired);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: reason.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? t.errors.SERVER_ERROR);
        setBusy(false);
        return;
      }

      // Stranica se ponovo učita sa servera i sama pokaže da je otkazano —
      // isti put kojim se vidi i odluka domaćina.
      router.refresh();
    } catch {
      setError(t.errors.SERVER_ERROR);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 text-sm font-medium text-danger-600 underline underline-offset-4 hover:text-danger-600/80"
      >
        {t.confirmation.cancelBooking}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="plus-alert mt-6 p-5">
      <label htmlFor="razlog-otkazivanja" className="plus-label">
        {t.confirmation.cancelReasonLabel}
      </label>

      <textarea
        id="razlog-otkazivanja"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(null);
        }}
        rows={3}
        maxLength={300}
        required
        autoFocus
        disabled={busy}
        placeholder={t.confirmation.cancelReasonPlaceholder}
        className="plus-live-input resize-none"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="plus-btn-accent px-5 py-2.5 text-xs"
        >
          {busy ? t.confirmation.cancelSubmitting : t.confirmation.cancelSubmit}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setReason('');
            setError(null);
          }}
          className="plus-btn-ghost px-5 py-2.5 text-xs"
        >
          {t.confirmation.cancelAbort}
        </button>
      </div>
    </form>
  );
}
