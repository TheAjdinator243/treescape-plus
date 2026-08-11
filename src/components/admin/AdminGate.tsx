'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';

/**
 * Ulaz u administraciju.
 *
 * Namjerno gola stranica — bez logotipa, bez linka sa javnog sajta, bez
 * ijedne naznake šta se iza nje krije. Kod se provjerava na serveru; ovdje
 * se nigdje ne čuva.
 *
 * Oba polja stoje na ISTOM ekranu i šalju se odjednom, umjesto uobičajenog
 * "prvo lozinka, pa onda kod s telefona". Razlog je sigurnosni: drugi ekran
 * bi se pojavio samo kad je pristupni kod tačan, pa bi napadaču koji pogađa
 * potvrdio da je pogodio prvi faktor. Ovako jedan pogrešan unos ne odaje
 * ništa — a usput nema ni međusesije koju bi trebalo zasebno čuvati.
 */
export function AdminGate({
  configured,
  twoFactor,
}: {
  configured: boolean;
  twoFactor: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twoFactor ? { code, totp } : { code }),
      });

      if (res.ok) {
        setCode('');
        setTotp('');
        router.refresh();
        return;
      }

      // Neuspjeh briše kod s telefona, a ne i pristupni: onaj prvi je ionako
      // istekao dok se čekao odgovor, pa bi ostavljen samo smetao.
      setTotp('');

      const data = (await res.json()) as { error?: string };
      setError(data.error ?? t.admin.gateWrong);
    } catch {
      setError(t.errors.SERVER_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest-900 px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl text-sand-50">{t.admin.gateTitle}</h1>
        <p className="mt-2 text-sm text-moss-300/80">{t.admin.gateLead}</p>

        {!configured ? (
          <p className="mt-6 rounded-xl border border-warn-600/30 bg-warn-600/10 px-4 py-3 text-sm leading-relaxed text-warn-600">
            {t.admin.gateNotConfigured}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6">
            <label htmlFor="code" className="sr-only">
              {t.admin.gateCode}
            </label>
            <input
              id="code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoFocus
              disabled={busy}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-forest-700 bg-forest-800 px-4 py-3 text-center font-mono tracking-widest text-sand-50 placeholder:text-forest-600 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-400/30"
            />

            {twoFactor && (
              <div className="mt-3">
                <label htmlFor="totp" className="sr-only">
                  {t.admin.gateTotp}
                </label>
                <input
                  id="totp"
                  // `text` a ne `number`: vodeća nula u kodu je česta, a
                  // brojčano polje je zna pojesti. `inputMode` svejedno
                  // otvara brojčanu tastaturu na telefonu.
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  disabled={busy}
                  placeholder="000000"
                  dir="ltr"
                  className="w-full rounded-xl border border-forest-700 bg-forest-800 px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-sand-50 placeholder:text-forest-600 focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-400/30"
                />
                <p className="mt-2 text-center text-xs text-moss-300/70">
                  {t.admin.gateTotpHint}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-center text-sm text-ember-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || code.length === 0 || (twoFactor && totp.replace(/\D/g, '').length !== 6)}
              className="btn mt-4 w-full bg-moss-400 text-forest-900 hover:bg-moss-300"
            >
              {busy ? t.common.loading : t.admin.gateSubmit}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
