'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Javlja da je stranica otvorena. Jednom po adresi, i ništa više.
 *
 * Ne postavlja kolačić, ne čita ništa iz preglednika i ne prati posjetioca
 * kroz vrijeme — server od ovoga pravi dnevni sažetak koji sutra ne vrijedi
 * (vidi `lib/analytics.ts`). Zato uz ovo ne ide baner za kolačiće.
 *
 * ── Zašto `sendBeacon` ────────────────────────────────────────────────────
 * Običan `fetch` iz stranice koja se upravo zatvara preglednik smije otkazati.
 * `sendBeacon` je napravljen baš za ovo: preda poruku pregledniku, koji je
 * pošalje kad stigne, i ne drži stranicu ni trenutka. Ako ga nema (stariji
 * preglednici), pada se na `fetch` s `keepalive`.
 */
function deviceClass(): 'phone' | 'tablet' | 'desktop' {
  // Iz širine ekrana, ne iz user-agenta: user-agent laže, a i njegovo čitanje
  // je ono što pretvara brojač u alat za prepoznavanje osobe.
  const width = window.innerWidth;
  if (width < 640) return 'phone';
  return width < 1024 ? 'tablet' : 'desktop';
}

export function PageView({ locale }: { locale: string }) {
  const pathname = usePathname();

  /*
   * Ista adresa se ne javlja dvaput.
   *
   * React u razvoju pokreće efekte dvaput, a i sam `usePathname` se zna
   * ponovo javiti bez stvarne promjene adrese. Bez ovoga bi svaka posjeta
   * bila zabilježena dva puta i sve brojke bi bile duplo veće.
   */
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || reported.current === pathname) return;
    reported.current = pathname;

    const payload = JSON.stringify({ path: pathname, locale, device: deviceClass() });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
        return;
      }

      void fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* Brojač koji ne uspije nije razlog da se išta vidi na stranici. */
      });
    } catch {
      /* Isto. */
    }
  }, [pathname, locale]);

  return null;
}
