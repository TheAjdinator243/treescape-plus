import { describe, expect, it } from 'vitest';

import { guestCancelSchema } from './validation';

/**
 * Gost otkazuje svoju rezervaciju.
 *
 * Razlog je OBAVEZAN — to je jedina razlika u odnosu na odbijanje iz
 * administracije, i jedina koja se ovdje može provjeriti bez baze. Provjera na
 * ekranu postoji radi gosta; ova postoji zato što se onoj na ekranu ne smije
 * vjerovati — do rute se može doći i mimo forme.
 */
describe('guestCancelSchema', () => {
  const TOKEN = 'abcdef1234567890';

  it('prima token i razlog', () => {
    const r = guestCancelSchema.safeParse({ token: TOKEN, reason: 'Promijenili smo planove.' });
    expect(r.success).toBe(true);
  });

  it('bez razloga ne prolazi', () => {
    expect(guestCancelSchema.safeParse({ token: TOKEN }).success).toBe(false);
  });

  it('prazan razlog ne prolazi', () => {
    expect(guestCancelSchema.safeParse({ token: TOKEN, reason: '' }).success).toBe(false);
  });

  it('sami razmaci se ne broje kao razlog', () => {
    // Bez `trim` prije provjere, tri razmaka bi prošla kao tri znaka.
    expect(guestCancelSchema.safeParse({ token: TOKEN, reason: '   ' }).success).toBe(false);
  });

  it('razlog se skraćuje na razumnu dužinu', () => {
    const r = guestCancelSchema.safeParse({ token: TOKEN, reason: 'x'.repeat(301) });
    expect(r.success).toBe(false);
  });

  it('bez tokena ne prolazi', () => {
    expect(guestCancelSchema.safeParse({ reason: 'Nešto je iskrslo.' }).success).toBe(false);
  });

  it('kratak token ne prolazi — ni slučajno ni namjerno', () => {
    expect(guestCancelSchema.safeParse({ token: 'abc', reason: 'Nešto je iskrslo.' }).success).toBe(
      false
    );
  });

  it('razlog stiže očišćen od razmaka na krajevima', () => {
    const r = guestCancelSchema.parse({ token: TOKEN, reason: '  Bolest u porodici.  ' });
    expect(r.reason).toBe('Bolest u porodici.');
  });
});
