import { describe, expect, it, vi } from 'vitest';

/**
 * Šta se dešava kad baza ne odgovori.
 *
 * Ovo je čuvar tačno onog kvara zbog kojeg je nastao: gost je povremeno, pri
 * ulasku na stranicu, vidio cijenu od 120 € po danu. Ta cijena nije bila ni
 * pogrešno upisana ni stara — bila je IZMIŠLJENA. Kad bi čitanje postavki iz
 * Supabasea palo (kratak prekid veze, hladan start, ograničenje veza), kod je
 * tiho vraćao demo postavke, a u njima stoji `default_nightly_cents: 12000`.
 *
 * Greška se vidjela samo u logu servera. Na stranici se vidjela kao cijena.
 *
 * Isto je vrijedilo i za druga dva čitanja: prazan cjenovnik je brisao sezone,
 * a prazna dostupnost je SVE termine prikazivala kao slobodne.
 *
 * Zato ovdje stoji baza koja uvijek pada, i tvrdnja da sva tri čitanja u tom
 * slučaju bacaju grešku. Padnuta stranica je nezgodna; izmišljena cijena na
 * sajtu za rezervacije je gora.
 */

vi.mock('server-only', () => ({}));

// Baza JESTE podešena — inače bi demo podaci bili ispravan odgovor.
vi.mock('@/lib/env', () => ({
  env: { siteUrl: 'https://treescape.test', enableTestPayments: false },
  isDatabaseConfigured: true,
}));

const pad = { data: null, error: { message: 'ECONNRESET' } };

/** Lanac poziva kakav gradi Supabase klijent — svaki završi padom. */
const upit = {
  select: () => upit,
  eq: () => upit,
  single: () => Promise.resolve(pad),
  gte: () => upit,
  lte: () => upit,
  order: () => Promise.resolve(pad),
};

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: () => ({
    from: () => upit,
    rpc: () => Promise.resolve({ error: null }),
  }),
}));

describe('kad baza ne odgovori', () => {
  it('postavke bacaju umjesto da vrate demo cijenu od 120 €', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getSettings } = await import('@/lib/data');

    await expect(getSettings()).rejects.toThrow(/postavke/);
  });

  it('cjenovnik baca umjesto da se prikaže prazan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getRatePeriods } = await import('@/lib/data');

    await expect(getRatePeriods()).rejects.toThrow(/cjenovnik/);
  });

  it('dostupnost baca umjesto da sve termine prikaže slobodnim', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getAvailability } = await import('@/lib/data');

    await expect(getAvailability()).rejects.toThrow(/dostupnost/);
  });
});
