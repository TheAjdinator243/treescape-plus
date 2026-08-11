import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { codeForCounter, decodeBase32, encodeBase32 } from './totp';

/**
 * Skripta `npm run totp` ponavlja isti račun kao `totp.ts`, jer se pokreće
 * golim Node-om bez TypeScripta. Uz svako ponavljanje ide i obećanje da će se
 * razlika primijetiti — ovaj test je to obećanje.
 *
 * Bez njega bi razilaženje bilo podmuklo: skripta bi pri podešavanju rekla
 * "poklapa se", a prijava na sajtu bi isti taj kod odbijala.
 *
 * Čita se GORNJI dio skripte — čiste funkcije, do oznake gdje počinje vodič.
 * Taj dio nema nuspojava, pa se može učitati i pozvati iz testa.
 */

const SCRIPT = path.resolve(import.meta.dirname, '../../scripts/totp.mjs');
const MARKER = '// ── Vodič';

async function loadScriptMath() {
  const source = readFileSync(SCRIPT, 'utf8');

  const cut = source.indexOf(MARKER);
  expect(cut, 'oznaka početka vodiča je nestala iz skripte').toBeGreaterThan(0);

  const pure = `${source.slice(0, cut)}\nexport { encodeBase32, decodeBase32, codeForCounter, currentCounter };`;

  return import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(pure)}`);
}

describe('skripta za podešavanje računa isto što i sajt', () => {
  it('daje identičan kod za istu tajnu i isti trenutak', async () => {
    const script = await loadScriptMath();

    // Nekoliko tajni i nekoliko trenutaka — jedno poklapanje može biti slučaj.
    for (const seed of ['12345678901234567890', 'treescape-proba-tajne', 'x']) {
      const secretBase32 = encodeBase32(Buffer.from(seed, 'ascii'));

      expect(script.encodeBase32(Buffer.from(seed, 'ascii'))).toBe(secretBase32);
      expect(script.decodeBase32(secretBase32)).toEqual(decodeBase32(secretBase32));

      for (const counter of [0, 1, 56_666_667, 99_999_999]) {
        expect(
          script.codeForCounter(script.decodeBase32(secretBase32), counter),
          `tajna "${seed}", brojač ${counter}`
        ).toBe(codeForCounter(decodeBase32(secretBase32), counter));
      }
    }
  });

  it('mjeri vrijeme po istom koraku od trideset sekundi', async () => {
    const script = await loadScriptMath();
    const now = Math.floor(Date.now() / 1000 / 30);

    expect(script.currentCounter()).toBe(now);
  });
});
