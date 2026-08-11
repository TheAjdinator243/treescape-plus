import type { NextConfig } from 'next';

/**
 * Zaglavlja koja preglednik dobija uz svaku stranicu.
 *
 * Ovo je sloj koji radi i onda kad negdje drugdje nešto propusti: čak i da se
 * u kod uvuče rupa, ova pravila sužavaju šta napadač s njom može uraditi.
 *
 * `Content-Security-Policy` NIJE ovdje nego u `src/proxy.ts` — treba mu
 * jednokratna propusnica za skripte, a ona se pravi tek kad zahtjev stigne.
 * Dva CSP zaglavlja se ne zbrajaju nego presijecaju, pa bi kopija ovdje samo
 * pokvarila ono što tamo radi.
 */
const securityHeaders = [
  /**
   * Isto što i `frame-ancestors` iz CSP-a, za starije preglednike koji CSP još
   * ne razumiju u cijelosti. Košta jedan red, pa neka stoji.
   */
  { key: 'X-Frame-Options', value: 'DENY' },

  /**
   * Preglednik ne smije sam pogađati tip datoteke. Bez ovoga se otpremljena
   * datoteka koja "izgleda kao HTML" može izvršiti kao HTML.
   */
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  /**
   * Adresa naše stranice se ne prosljeđuje tuđim sajtovima.
   *
   * Bitno baš ovdje: putanja potvrde nosi tajni token
   * (/rezervacija/<uuid>). Da gost s te stranice ode na neki drugi sajt, taj
   * sajt bi u `Referer`-u dobio token i s njim pristup tuđoj rezervaciji.
   */
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  /** Sajtu ne treba ni kamera, ni mikrofon, ni lokacija — pa se i ne traže. */
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },

  /**
   * Sve ide preko HTTPS-a, i preglednik to pamti dvije godine.
   *
   * Bez ovoga prvi zahtjev na `http://` putuje otvoren, a s njim i kolačić
   * sesije. Vercel sam preusmjerava na HTTPS, ali preusmjerenje dolazi TEK
   * nakon što je zahtjev već otišao.
   */
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /** Verzija Next.js-a ne treba stajati u zaglavlju svakog odgovora. */
  poweredByHeader: false,

  images: {
    // Fotografije stoje lokalno u /public/images, ali ostavljamo moderne formate
    // kako bi Next.js automatski servirao AVIF/WebP gdje je podržano.
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Administracija i potvrde nikada ne smiju završiti u pretraživačima
        // ni ostati u kešu posrednika — tamo su podaci gostiju.
        source: '/admin/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/rezervacija/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
