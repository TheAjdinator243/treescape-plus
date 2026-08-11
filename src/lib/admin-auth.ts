import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import { env } from './env';

export {
  ADMIN_COOKIE,
  createSessionToken,
  isValidSession,
  sessionCookieOptions,
  type AuthMethod,
} from './admin-session';

/**
 * Najkraći pristupni kod koji se uopće prihvata.
 *
 * Ovaj jedan kod je JEDINA brava između interneta i imena, mailova i telefona
 * svih gostiju. Ograničenje broja pokušaja u `login/route.ts` živi u memoriji
 * jedne instance i gubi se pri hladnom startu, pa se na njega ne smije
 * računati kao na odbranu — kratak kod se probije bez obzira na njega.
 *
 * Zato se kraći kod ne odbija tek upozorenjem u logu nego se OVDJE ne prihvata:
 * bolje je da vlasnik odmah vidi da se ne može prijaviti i produži kod, nego da
 * mjesecima misli da je zaključano dok stoji četverocifreni PIN.
 */
export const MIN_ACCESS_CODE_LENGTH = 12;

/**
 * Poređenje pristupnog koda u konstantnom vremenu.
 *
 * Obični `===` prekida poređenje na prvom različitom znaku, pa se iz razlike u
 * trajanju odgovora kod može pogađati znak po znak. Zato se oba niza prvo
 * svedu na SHA-256 sažetak — uvijek tačno 32 bajta, bez obzira na dužinu
 * unosa — a onda porede u konstantnom vremenu. Tako ne curi ni sadržaj ni
 * dužina pravog koda.
 */
export function isValidAccessCode(input: string): boolean {
  const expected = env.admin.accessCode;
  if (!expected) return false;

  if (expected.length < MIN_ACCESS_CODE_LENGTH) {
    console.error(
      `[treescape] ADMIN_ACCESS_CODE je kraći od ${MIN_ACCESS_CODE_LENGTH} znakova — ` +
        'prijava je onemogućena dok se ne produži. Novi kod: openssl rand -base64 24'
    );
    return false;
  }

  const a = createHash('sha256').update(input.normalize('NFKC'), 'utf8').digest();
  const b = createHash('sha256').update(expected.normalize('NFKC'), 'utf8').digest();

  return timingSafeEqual(a, b);
}
