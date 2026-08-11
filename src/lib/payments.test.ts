import { describe, expect, it } from 'vitest';

import { availableMethods, methodInfo } from './payments';
import type { Settings } from './types';

/**
 * Plaćanje na račun je uklonjeno sa sajta. Nije dovoljno sakriti dugme —
 * zahtjev se sastavlja u pregledniku, pa ga svako može poslati ručno s
 * `payment_method: "bank_transfer"`. Odbijanje pri UPISU je ono što vrijedi.
 */

const settings = {
  id: 1,
  default_nightly_cents: 25000,
  weekend_price_cents: 30000,
  cleaning_fee_cents: 0,
  currency: 'BAM',
  currency_symbol: 'KM',
  min_nights: 1,
  max_nights: 30,
  max_guests: 8,
  checkin_time: '15:00',
  checkout_time: '11:00',
  hold_minutes: 15,
  // Popunjeni bankovni podaci — nekad su bili dovoljni da se transfer ponudi.
  bank_account_name: 'Vlasnik',
  bank_name: 'Neka banka',
  bank_iban: 'BA391234567890123456',
  transfer_days: 3,
} satisfies Settings;

describe('načini plaćanja', () => {
  it('gostu se nudi samo gotovina', () => {
    expect(availableMethods(settings, false).map((m) => m.id)).toEqual(['cash']);
  });

  it('popunjen IBAN više ne vraća plaćanje na račun', () => {
    // Ovo je bilo staro pravilo: IBAN popunjen → transfer ponuđen.
    const ids = availableMethods(settings, false).map((m) => m.id);
    expect(ids).not.toContain('bank_transfer');
  });

  it('ručno sastavljen zahtjev za transfer se odbija pri upisu', () => {
    expect(methodInfo('bank_transfer', settings, false)).toBeNull();
    // I kad je test način uključen — transfer ni tada ne prolazi.
    expect(methodInfo('bank_transfer', settings, true)).toBeNull();
  });

  it('gotovina drži termin dok vlasnik ne odluči', () => {
    const cash = methodInfo('cash', settings, false);
    expect(cash?.initialStatus).toBe('pending_cash');
    expect(cash?.holdHours).toBeNull();
  });

  it('TEST se nudi samo kad je izričito uključen', () => {
    expect(availableMethods(settings, false).map((m) => m.id)).not.toContain('test');
    expect(availableMethods(settings, true).map((m) => m.id)).toContain('test');
  });

  it('kartica i "none" se ne mogu odabrati', () => {
    expect(methodInfo('card', settings, true)).toBeNull();
    expect(methodInfo('none', settings, true)).toBeNull();
  });
});
