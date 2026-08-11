'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase klijent za preglednik — samo `anon` ključ.
 *
 * Njime se čita isključivo tabela `availability_slots` (goli datumi) i
 * sluša Realtime. Imena i mailovi gostiju su iza RLS-a i ovim ključem
 * jednostavno ne postoje.
 */
let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Bez ključeva sajt i dalje radi — kalendar tada samo ne dobija
  // ažuriranja uživo, a početno stanje dolazi sa servera.
  if (!url || !anonKey) return null;
  if (cached) return cached;

  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });

  return cached;
}
