import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Svaka admin ruta mora sama provjeriti ko je pozvao.
 *
 * Ovo je test za način na koji se ovakvi sajtovi najčešće i probiju: ne
 * razbijanjem lozinke nego jednom rutom koja je ostala nezaključana. Čuvar u
 * `proxy.ts` štiti sve pod /api/admin, ali samo dok se `matcher` ne dirne i
 * dok ruta stoji baš tu. Premjesti se datoteka, promijeni se jedna linija u
 * `matcher`-u — i podaci gostiju su vani, bez ijedne greške u logu.
 *
 * Test čita sam izvorni kod, pa hvata i rutu koja tek bude napisana. Ako neko
 * sutra doda /api/admin/nesto i zaboravi `requireAdmin`, ovdje pukne prije
 * nego što ta ruta ikad vidi internet.
 */

const API = path.resolve(import.meta.dirname, '../app/api');

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

/** Metode koje nešto mijenjaju ili otkrivaju — sve njih se pravilo tiče. */
const HANDLERS = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;

const adminRoutes = routeFiles(path.join(API, 'admin'));

describe('admin rute', () => {
  it('uopće ih ima (da test ne prođe zato što ništa nije našao)', () => {
    expect(adminRoutes.length).toBeGreaterThan(2);
  });

  it.each(adminRoutes.map((f) => [path.relative(API, f), f]))(
    '%s traži prijavu u svakoj metodi',
    (naziv, file) => {
      const source = readFileSync(file, 'utf8');

      /**
       * `login` je jedini izuzetak i to s razlogom: to su vrata na koja se
       * kuca, pa ne mogu tražiti da si već unutra. Ona umjesto toga mora imati
       * ograničenje broja pokušaja i provjeru porijekla.
       */
      if (path.basename(path.dirname(file)) === 'login') {
        expect(source).toMatch(/consumeRateLimit/);
        expect(source).toMatch(/requireSameOrigin/);
        return;
      }

      const methods = [...source.matchAll(HANDLERS)].map((m) => m[1]);
      expect(methods.length, `${naziv}: nema nijedne izvezene metode`).toBeGreaterThan(0);

      expect(source, `${naziv}: ne uvozi requireAdmin`).toMatch(
        /import\s*\{\s*requireAdmin\s*\}\s*from\s*'@\/lib\/admin-guard'/
      );

      // Broj provjera mora pratiti broj metoda — inače je nova metoda dopisana
      // ispod, a `requireAdmin` ostao samo u onoj staroj iznad nje.
      const checks = source.match(/await\s+requireAdmin\(/g)?.length ?? 0;
      expect(
        checks,
        `${naziv}: ima ${methods.length} metoda (${methods.join(', ')}), a samo ${checks} provjera`
      ).toBe(methods.length);
    }
  );
});

/**
 * Rute koje gost zove bez prijave, a koje nešto mijenjaju.
 *
 * Njima ne treba pristupni kod, ali treba provjera porijekla: bez nje tuđa
 * stranica može u pozadini praviti rezervacije i otkazivati tuđe termine dok
 * posjetilac misli da čita nešto sasvim drugo.
 */
describe('javne rute koje mijenjaju podatke', () => {
  const publicWriters = routeFiles(path.join(API, 'booking'));

  it.each(publicWriters.map((f) => [path.relative(API, f), f]))(
    '%s provjerava porijeklo ako nešto mijenja',
    (naziv, file) => {
      const source = readFileSync(file, 'utf8');
      const methods = [...source.matchAll(HANDLERS)].map((m) => m[1]);

      // Rute koje samo čitaju (status) nemaju šta štititi ovim pravilom.
      if (!methods.some((m) => m !== 'GET')) return;

      expect(source, `${naziv}: ne provjerava porijeklo zahtjeva`).toMatch(/requireSameOrigin/);
    }
  );
});
