import { beforeEach, describe, expect, it } from 'vitest';

import {
  __clearUsedCounters,
  codeForCounter,
  counterFor,
  currentCode,
  decodeBase32,
  encodeBase32,
  generateSecret,
  markTotpUsed,
  otpauthUri,
  verifyTotp,
} from './totp';

/**
 * Ovi testovi postoje da bi TOTP smio biti pisan ovdje umjesto uzet kao gotov
 * paket. Prvi blok je prepisan iz samog RFC-a 6238 — ako se ijedna sitnica u
 * računu pomjeri, ovdje pukne.
 */

describe('službeni test vektori iz RFC 6238', () => {
  /**
   * RFC koristi tajnu "12345678901234567890" (20 ASCII bajta) i OSMOCIFRENE
   * kodove. Naš sajt radi sa šest cifara, ali račun je isti — provjerava se s
   * osam jer su tako objavljeni, pa nema prostora za "skoro tačno".
   */
  const secret = encodeBase32(Buffer.from('12345678901234567890', 'ascii'));

  const vectors: [seconds: number, expected: string][] = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ];

  it.each(vectors)('u sekundi %d daje %s', (seconds, expected) => {
    const counter = Math.floor(seconds / 30);
    expect(codeForCounter(decodeBase32(secret), counter, 8)).toBe(expected);
  });

  it('daje i šestocifrenu varijantu iz istog računa', () => {
    // Šest cifara je zadnjih šest od osmocifrenog rezultata.
    expect(codeForCounter(decodeBase32(secret), Math.floor(59 / 30), 6)).toBe('287082');
  });
});

describe('base32', () => {
  /** Test vektori iz RFC-a 4648. */
  it.each([
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ])('kodira "%s" u %s', (plain, encoded) => {
    expect(encodeBase32(Buffer.from(plain, 'ascii'))).toBe(encoded);
    expect(decodeBase32(encoded).toString('ascii')).toBe(plain);
  });

  it('prašta oblik u kojem tajnu prikazuju aplikacije', () => {
    // Male slova, razmaci, crtice i dopuna — sve isto znači.
    const expected = decodeBase32('MZXW6YTBOI');

    for (const variant of ['mzxw6ytboi', 'MZXW 6YTB OI', 'MZXW-6YTB-OI', 'MZXW6YTBOI======']) {
      expect(decodeBase32(variant)).toEqual(expected);
    }
  });

  it('odbija znak koji ne postoji u abecedi', () => {
    // 0, 1 i 8 namjerno nisu u base32 — lako se brkaju s O, I i B.
    expect(() => decodeBase32('MZXW0YTB')).toThrow();
  });

  it('tajna koju sami pravimo je upotrebljiva', () => {
    const secret = generateSecret();

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(decodeBase32(secret)).toHaveLength(20);
    expect(currentCode(secret)).toMatch(/^\d{6}$/);
  });
});

describe('provjera unesenog koda', () => {
  const secret = generateSecret();
  const now = 1_700_000_000_000;

  beforeEach(() => {
    __clearUsedCounters();
  });

  it('prima tačan kod', () => {
    expect(verifyTotp(secret, currentCode(secret, now), now).ok).toBe(true);
  });

  it('prima kod razmakom razdvojen, kako ga aplikacija pokazuje', () => {
    const code = currentCode(secret, now);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

    expect(verifyTotp(secret, spaced, now).ok).toBe(true);
  });

  it('odbija pogrešan kod', () => {
    const wrong = currentCode(secret, now) === '000000' ? '111111' : '000000';
    expect(verifyTotp(secret, wrong, now).ok).toBe(false);
  });

  it('prašta razliku u satu do jednog koraka', () => {
    // Telefon žuri ili kasni pola minute — kod i dalje mora proći.
    for (const skew of [-30_000, 30_000]) {
      __clearUsedCounters();
      expect(verifyTotp(secret, currentCode(secret, now + skew), now).ok).toBe(true);
    }
  });

  it('ne prašta razliku veću od toga', () => {
    for (const skew of [-90_000, 90_000]) {
      __clearUsedCounters();
      expect(verifyTotp(secret, currentCode(secret, now + skew), now).ok).toBe(false);
    }
  });

  /**
   * Ovo je razlog zbog kojeg se pamti zadnji brojač.
   *
   * Bez toga kod ostaje važeći do minute nakon unosa: ko ga vidi preko ramena
   * ili uhvati u dnevniku posrednika, stigne se prijaviti za nama.
   */
  it('ne prima isti kod dvaput nakon što je potrošen', () => {
    const code = currentCode(secret, now);

    const first = verifyTotp(secret, code, now);
    expect(first.ok).toBe(true);
    if (first.ok) markTotpUsed(secret, first.counter);

    const second = verifyTotp(secret, code, now);
    expect(second.ok).toBe(false);
    expect(second.ok === false && second.reason).toBe('reused');
  });

  /**
   * Test za grešku koju je uhvatila proba na pravom serveru.
   *
   * Dok je provjera sama trošila kod, bilo je dovoljno poslati TAČAN broj s
   * telefona uz POGREŠAN pristupni kod pa da se taj broj spali. Vlasnik bi
   * ispravio grešku, prepisao isti broj koji mu još stoji na ekranu — i
   * dobio "pogrešno". Izgleda tačno kao pokvarena dvofaktorska zaštita.
   *
   * Provjera zato ne smije ništa mijenjati; troši se posebnim pozivom, i to
   * tek kad je cijela prijava prošla.
   */
  it('sama provjera NE troši kod', () => {
    const code = currentCode(secret, now);

    // Deset neuspjelih prijava u kojima je drugi faktor bio tačan.
    for (let i = 0; i < 10; i += 1) {
      expect(verifyTotp(secret, code, now).ok).toBe(true);
    }

    // Kod je i dalje upotrebljiv kad prijava konačno uspije.
    const final = verifyTotp(secret, code, now);
    expect(final.ok).toBe(true);
  });

  it('ne prima ni stariji kod nakon novijeg', () => {
    const first = verifyTotp(secret, currentCode(secret, now), now);
    expect(first.ok).toBe(true);
    if (first.ok) markTotpUsed(secret, first.counter);

    // Kod iz prethodnog koraka je unutar prozora, ali je stariji od upotrijebljenog.
    expect(verifyTotp(secret, currentCode(secret, now - 30_000), now).ok).toBe(false);
  });

  it('pušta sljedeći kod kad vrijeme odmakne', () => {
    const first = verifyTotp(secret, currentCode(secret, now), now);
    expect(first.ok).toBe(true);
    if (first.ok) markTotpUsed(secret, first.counter);

    const later = now + 30_000;
    expect(verifyTotp(secret, currentCode(secret, later), later).ok).toBe(true);
  });

  it('odbija sve što nije šest cifara', () => {
    for (const input of ['', '12345', '1234567', 'abcdef', '   ']) {
      const result = verifyTotp(secret, input, now);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe('format');
    }
  });

  it('kod jedne tajne ne vrijedi za drugu', () => {
    const other = generateSecret();
    expect(verifyTotp(other, currentCode(secret, now), now).ok).toBe(false);
  });

  it('brojač se mijenja svakih trideset sekundi', () => {
    // Mjeri se od početka koraka: 1 700 000 010 je djeljivo s 30, pa je to
    // tačka u kojoj je novi kod upravo nastao.
    const start = 1_700_000_010_000;

    expect(counterFor(start)).toBe(counterFor(start + 29_999));
    expect(counterFor(start + 30_000)).toBe(counterFor(start) + 1);
  });
});

describe('adresa za dodavanje u aplikaciju', () => {
  it('nosi tajnu i sve što aplikacija treba', () => {
    const uri = otpauthUri('MZXW6YTBOI', 'vlasnik');

    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=MZXW6YTBOI');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});
