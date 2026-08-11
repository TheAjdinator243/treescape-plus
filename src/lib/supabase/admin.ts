import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '../env';

/**
 * Serverski Supabase klijent sa `service_role` ključem.
 *
 * OVAJ KLIJENT ZAOBILAZI RLS. Smije se uvoziti isključivo u API rutama i
 * serverskim komponentama — `import 'server-only'` gore pretvara slučajan
 * uvoz u klijentsku komponentu u grešku pri buildu, a ne u curenje ključa.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  cached = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'treescape-server' } },
    }
  );

  return cached;
}

/** Postgres kod za povredu EXCLUDE ograničenja — naš "termin je zauzet". */
export const PG_EXCLUSION_VIOLATION = '23P01';

export function isOverlapError(error: { code?: string } | null): boolean {
  return error?.code === PG_EXCLUSION_VIOLATION;
}
