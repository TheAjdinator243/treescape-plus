'use client';

import { useEffect } from 'react';

import { useI18n } from '@/components/i18n/LocaleProvider';

/**
 * Šta gost vidi kad stranica ne uspije da se sastavi.
 *
 * Postoji zbog jednog pravila u `lib/db-read.ts`: čitanje iz baze smije pasti,
 * ali ne smije izmisliti podatak. Kad baza ne odgovori ni iz trećeg pokušaja,
 * greška ide dalje i stiže ovdje — umjesto da se gostu prikaže cijena koju
 * niko nije odredio.
 *
 * Zato ovdje NEMA ničega o kući, ni cijene, ni kalendara: ako se ne zna šta je
 * tačno, ne piše se ništa. Jedino dugme ponovo pokušava sastaviti stranicu, jer
 * je kvar na vezi najčešće kratak.
 */
export default function Greska({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    // U pregledniku ostaje trag za onoga ko dođe da vidi šta se desilo;
    // gostu se poruka iz greške NE pokazuje — njemu ime tabele ne znači ništa.
    console.error('[treescape] stranica nije sastavljena:', error);
  }, [error]);

  return (
    <main className="plus-surface flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="plus-ink text-3xl">{t.errors.SERVER_ERROR}</h1>

      <button type="button" onClick={reset} className="plus-btn-accent px-6 py-3">
        {t.common.tryAgain}
      </button>
    </main>
  );
}
