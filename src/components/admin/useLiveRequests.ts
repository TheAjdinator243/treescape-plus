'use client';

import { useSlotRefresh } from '@/components/booking/useSlotRefresh';

/**
 * Administracija koja se sama osvježava kad stigne novi zahtjev.
 *
 * Vlasnik obično ostavi /admin otvoren u kartici. Bez ovoga bi tu stajala slika
 * stanja od trenutka kad je stranica učitana, pa bi novi zahtjev vidio tek kad
 * se sjeti pritisnuti F5.
 *
 * Bez oznake termina — administraciju zanima svaka promjena, ne jedna.
 * Objašnjenje zašto se sluša baš `availability_slots` stoji uz `useSlotRefresh`.
 */
export function useLiveRequests(): void {
  useSlotRefresh();
}
