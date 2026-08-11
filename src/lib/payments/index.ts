import type { BookingStatus, PaymentMethod, Settings } from '../types';

/**
 * Načini plaćanja na jednom mjestu.
 *
 * Cijela aplikacija zna samo za ovaj spisak — kalendar, API i administracija
 * ne poznaju nijednog konkretnog procesora. Kad jednog dana stigne ugovor s
 * bankom (Monri, WSPay, PaySpot), dodaje se jedan unos ovdje i jedna datoteka
 * pored ove. Ništa drugo se ne dira.
 */

export interface PaymentMethodInfo {
  id: PaymentMethod;
  /** Status koji rezervacija dobija odmah po slanju. */
  initialStatus: BookingStatus;
  /**
   * Koliko sati se termin drži prije nego se sam oslobodi.
   * `null` znači da se drži dok vlasnik ne odluči (nikad ne istekne sam).
   */
  holdHours: number | null;
  /** Da li je gostu potrebno nešto uraditi nakon rezervacije. */
  requiresGuestAction: boolean;
}

/**
 * Gotovina — gost plaća po dolasku, vlasnik prvo mora potvrditi.
 * Termin se drži dok vlasnik ne odluči; zato holdHours = null.
 */
const CASH: PaymentMethodInfo = {
  id: 'cash',
  initialStatus: 'pending_cash',
  holdHours: null,
  requiresGuestAction: false,
};

/**
 * Test — simulira uspješnu uplatu i odmah potvrđuje rezervaciju.
 *
 * Postoji samo da se može proći kroz cijeli tok (rezervacija → potvrda →
 * termin osivi kod svih uživo) bez ijednog naloga i bez pravog novca.
 * Nikada se ne nudi osim ako je izričito uključen prekidačem u okruženju.
 */
const TEST: PaymentMethodInfo = {
  id: 'test',
  initialStatus: 'confirmed',
  holdHours: null,
  requiresGuestAction: false,
};

/**
 * Načini koje gost stvarno vidi na sajtu, u ovom redoslijedu.
 *
 * Plaćanje na račun je uklonjeno na zahtjev vlasnika — ostaje samo gotovina.
 * Kad zatreba nazad, vraća se ovdje i u `PaymentMethod` tipu; status
 * `pending_transfer` je namjerno ostavljen u bazi da se ne mora u migraciju.
 */
export function availableMethods(_settings: Settings, testEnabled: boolean): PaymentMethodInfo[] {
  const methods: PaymentMethodInfo[] = [CASH];
  if (testEnabled) methods.push(TEST);
  return methods;
}

/**
 * Provjera pri UPISU rezervacije, ne samo pri prikazu.
 *
 * Bez nje bi neko mogao sam sastaviti zahtjev s `payment_method:
 * "bank_transfer"` i zaobići to što se dugme više ne prikazuje. Skrivanje
 * dugmeta nije zaštita; odbijanje upisa jeste.
 */
export function methodInfo(
  id: PaymentMethod,
  settings: Settings,
  testEnabled: boolean
): PaymentMethodInfo | null {
  return availableMethods(settings, testEnabled).find((m) => m.id === id) ?? null;
}
