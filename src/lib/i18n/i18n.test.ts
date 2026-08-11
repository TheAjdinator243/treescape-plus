import { describe, expect, it } from 'vitest';

import { formatDateTime, formatLong, formatNumeric, formatRange } from '../dates';
import { formatMoney } from '../pricing';
import {
  DEFAULT_LOCALE,
  LOCALES,
  count,
  directionOf,
  getStrings,
  localeFromAcceptLanguage,
  localeFromRequest,
  normalizeLocale,
  plural,
} from './index';

/**
 * Prevodi se ne testiraju po sadržaju — niko ne piše test koji tvrdi da se
 * "Galerija" piše baš tako. Testira se ono što se tiho pokvari: nedostajući
 * ključ, pogrešan oblik množine i datum ispisan po tuđim pravilima.
 */

describe('prepoznavanje jezika', () => {
  it('svodi pune oznake na jezik koji sajt govori', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('AR')).toBe('ar');
    expect(normalizeLocale(' bs ')).toBe('bs');
  });

  it('odbija jezike koje sajt ne govori', () => {
    expect(normalizeLocale('de')).toBeNull();
    expect(normalizeLocale('')).toBeNull();
    expect(normalizeLocale(null)).toBeNull();
  });

  it('iz Accept-Language bira po težini, a ne po redoslijedu', () => {
    // Njemački je prvi i najteži, ali ga sajt ne govori — pobjeđuje arapski.
    expect(localeFromAcceptLanguage('de;q=1.0,ar;q=0.9,en;q=0.8')).toBe('ar');
    // Bez `q` vrijedi redoslijed.
    expect(localeFromAcceptLanguage('en-GB,bs')).toBe('en');
    expect(localeFromAcceptLanguage('fr,de')).toBeNull();
  });

  it('izričit izbor iz kolačića nadjačava preglednik', () => {
    const request = new Request('https://treescape.ba/', {
      headers: { cookie: 'treescape_jezik=bs; other=1', 'accept-language': 'en-US,en;q=0.9' },
    });
    expect(localeFromRequest(request)).toBe('bs');
  });

  it('bez ijednog nagovještaja pada na jezik kuće', () => {
    expect(localeFromRequest(new Request('https://treescape.ba/'))).toBe(DEFAULT_LOCALE);
  });
});

describe('rječnici', () => {
  it('svaki jezik ima svaki ključ', () => {
    // Tip `Dictionary` ovo garantuje pri prevođenju; ovaj test hvata ključeve
    // koji su ostali prazni, jer prazan string prolazi kroz TypeScript.
    const paths: string[] = [];

    function walk(value: unknown, path: string) {
      if (typeof value === 'string') {
        if (value.trim() === '') paths.push(path);
        return;
      }
      if (typeof value === 'function' || value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item, i) => walk(item, `${path}[${i}]`));
        return;
      }
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    }

    for (const locale of LOCALES) walk(getStrings(locale), locale);

    expect(paths).toEqual([]);
  });

  it('nepoznat jezik vrati jezik kuće umjesto da padne', () => {
    // @ts-expect-error — namjerno se šalje nešto što nije jezik sajta.
    expect(getStrings('de')).toBe(getStrings(DEFAULT_LOCALE));
  });

  it('arapski se piše zdesna nalijevo, ostali slijeva nadesno', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('bs')).toBe('ltr');
    expect(directionOf('en')).toBe('ltr');
  });
});

describe('množina', () => {
  it('bosanski: 1 dan, 2–4 dana, 5+ dana, 21 dan', () => {
    expect(count('bs', 1, plural.bs.days)).toBe('1 dan');
    expect(count('bs', 2, plural.bs.days)).toBe('2 dana');
    expect(count('bs', 5, plural.bs.days)).toBe('5 dana');
    // 11 je izuzetak koji ide u treći oblik, a 21 se vraća u prvi.
    expect(count('bs', 11, plural.bs.days)).toBe('11 dana');
    expect(count('bs', 21, plural.bs.days)).toBe('21 dan');
  });

  it('bosanski: gost / gosta / gostiju', () => {
    expect(count('bs', 1, plural.bs.guests)).toBe('1 gost');
    expect(count('bs', 3, plural.bs.guests)).toBe('3 gosta');
    expect(count('bs', 8, plural.bs.guests)).toBe('8 gostiju');
  });

  it('engleski: jednina samo za 1', () => {
    expect(count('en', 1, plural.en.days)).toBe('1 day');
    expect(count('en', 2, plural.en.days)).toBe('2 days');
    expect(count('en', 21, plural.en.days)).toBe('21 days');
  });

  it('arapski koristi i dvojinu', () => {
    expect(count('ar', 1, plural.ar.days)).toBe('1 يوم');
    expect(count('ar', 2, plural.ar.days)).toBe('2 يومان');
    expect(count('ar', 3, plural.ar.days)).toBe('3 أيام');
    expect(count('ar', 11, plural.ar.days)).toBe('11 يومًا');
  });

  it('poruke o greškama nose ispravan oblik', () => {
    expect(getStrings('bs').errors.MAX_DAYS(21)).toContain('21 dan.');
    expect(getStrings('bs').errors.TOO_MANY_GUESTS(8)).toContain('8 gostiju');
    expect(getStrings('en').errors.MAX_DAYS(1)).toContain('1 day');
  });
});

describe('datumi', () => {
  it('bosanski piše "august", a ne "avgust"', () => {
    // date-fns u svom `bs` rječniku ima srpski oblik; `withBosnianMonths` ga
    // ispravlja. Bez toga bi na sajtu pisalo "5. avgust 2026.".
    expect(formatLong('2026-08-05', 'bs')).toBe('5. august 2026.');
    expect(formatRange('2026-08-05', '2026-08-09', 'bs')).toBe('5. aug – 9. aug 2026.');
  });

  it('svaki jezik ima svoj obrazac', () => {
    expect(formatLong('2026-08-05', 'en')).toBe('5 August 2026');
    expect(formatNumeric('2026-08-05', 'bs')).toBe('5.8.2026.');
    expect(formatNumeric('2026-08-05', 'en')).toBe('5/8/2026');
    expect(formatLong('2026-08-05', 'ar')).toContain('أغسطس');
  });

  it('raspon dodaje godinu s lijeve strane tek kad je prelazi', () => {
    expect(formatRange('2026-12-28', '2027-01-03', 'bs')).toBe('28. dec 2026. – 3. jan 2027.');
  });

  it('vrijeme je uvijek 24-satno', () => {
    const at = new Date(2026, 7, 5, 14, 30);
    expect(formatDateTime(at, 'bs')).toBe('5.8.2026. 14:30');
    expect(formatDateTime(at, 'en')).toBe('5/8/2026 14:30');
  });
});

describe('novac', () => {
  it('razdvajanje hiljada prati jezik', () => {
    expect(formatMoney(125000, 'KM', 'bs')).toBe('1.250 KM');
    expect(formatMoney(125000, 'KM', 'en')).toBe('1,250 KM');
  });

  it('decimale se pišu samo kad postoje', () => {
    expect(formatMoney(18000, 'KM', 'bs')).toBe('180 KM');
    expect(formatMoney(18050, 'KM', 'bs')).toBe('180,50 KM');
  });

  it('arapski zadržava latinične cifre, zbog IBAN-a i datuma na istom ekranu', () => {
    expect(formatMoney(125000, 'KM', 'ar')).toMatch(/^[\d,.]+ KM$/);
  });
});
