import { NextResponse } from 'next/server';

import { getAvailability } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Javna dostupnost — vraća isključivo datume, nikada podatke o gostima.
 * Koristi je kalendar kad se posjetilac vrati na karticu nakon duže pauze.
 */
export async function GET() {
  const slots = await getAvailability();

  return NextResponse.json(
    { slots },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
