import { describe, expect, it } from 'vitest';

import { rangeHasConflict, takenDayMap } from './pricing';
import type { DateStr } from './dates';
import type { AvailabilitySlot } from './types';

/**
 * Smjena gostiju istog dana.
 *
 * Jedan gost odlazi ujutro, drugi dolazi poslije podne — isti datum, a nema
 * preklapanja. Cijela rezervacija visi o tome da je kraj boravka ISKLJUČIV,
 * isto kao `daterange(..., '[)')` u bazi.
 *
 * Da neko ikad "popravi" `eachDay` da uključuje i zadnji dan, kuća bi tiho
 * izgubila po jednu noć između svake dvije rezervacije — a to se ne bi vidjelo
 * ni na jednom ekranu, samo bi kalendar bio zauzetiji nego što treba.
 */
const d = (s: string) => s as DateStr;

const GOST_A: AvailabilitySlot[] = [
  // Dolazi 5., odlazi 8. — spava 5., 6. i 7.
  { booking_id: 1, start_date: d('2026-10-05'), end_date: d('2026-10-08'), kind: 'booked' },
];

describe('dan odlaska pripada sljedećem gostu', () => {
  it('zauzeti su samo dani u kojima se stvarno spava', () => {
    expect([...takenDayMap(GOST_A).keys()].sort()).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
  });

  it('dan odlaska nije označen kao zauzet', () => {
    expect(takenDayMap(GOST_A).has(d('2026-10-08'))).toBe(false);
  });

  it('sljedeći gost smije doći na dan odlaska prethodnog', () => {
    expect(rangeHasConflict(d('2026-10-08'), d('2026-10-11'), GOST_A)).toBe(false);
  });

  it('i to čak i za boravak od jednog dana', () => {
    expect(rangeHasConflict(d('2026-10-08'), d('2026-10-09'), GOST_A)).toBe(false);
  });

  it('ali dan ranije se i dalje preklapa', () => {
    expect(rangeHasConflict(d('2026-10-07'), d('2026-10-09'), GOST_A)).toBe(true);
  });

  it('i dolazak prije odlaska se preklapa', () => {
    expect(rangeHasConflict(d('2026-10-04'), d('2026-10-06'), GOST_A)).toBe(true);
  });
});
