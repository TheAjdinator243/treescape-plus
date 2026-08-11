import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Obavijest poslana nakon odgovora mora ići kroz `after`.
 *
 * Ovo je test za grešku koja se ponovila dvaput, na dva mjesta, i oba puta se
 * pokazala tek kod pravog gosta:
 *
 *   void posaljiMail(booking);      // izgleda ispravno
 *   return NextResponse.json(...);  // ...i tu mail umre
 *
 * Lokalno radi savršeno. Na Vercelu, čim odgovor ode, funkcija se smije
 * zamrznuti i ugasiti — sve što je još u zraku nestane s njom. Nema greške,
 * nema loga, u administraciji piše da je odobreno. Samo mail nikad ne stigne.
 *
 * Zato: svaka ruta koja šalje mail ili obavijest mora uvoziti `after`. Test
 * čita sam izvorni kod, pa hvata i rutu koja tek bude napisana.
 */

const API = path.resolve(import.meta.dirname, '../app/api');

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

/** Rute koje šalju mail ili obavijest — njih se pravilo tiče. */
const SENDING = /from '@\/lib\/(email|notify|telegram)'/;

describe('rute koje šalju obavijesti', () => {
  const files = routeFiles(API);

  it('uopće ih ima (da test ne prođe zato što ništa nije našao)', () => {
    expect(files.length).toBeGreaterThan(3);
    expect(files.some((f) => SENDING.test(readFileSync(f, 'utf8')))).toBe(true);
  });

  it.each(files.map((f) => [path.relative(API, f), f]))(
    '%s ne ostavlja obavijest da visi bez `after`',
    (_naziv, file) => {
      const source = readFileSync(file, 'utf8');
      if (!SENDING.test(source)) return;

      // Ruta koja pošalje pa ODMAH vrati odgovor mora koristiti `after`.
      // Ako sve čeka prije odgovora (`await`), to je isto ispravno — ali tada
      // nema ni golog `void`, pa ovo pravilo ne smeta.
      const golo = /\n\s*void\s/.test(source);
      const cekaAfter = /\bafter\(/.test(source) && /from 'next\/server'/.test(source);

      expect(
        !golo || cekaAfter,
        `${path.basename(path.dirname(file))}: obavijest ide kroz \`void\`, a rute nema \`after\` — ` +
          'na Vercelu bi se ugasila prije nego mail ode.'
      ).toBe(true);
    }
  );
});
