import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Adresa sajta koja završava u linkovima u mailu.
 *
 * Ovo je kvar koji se ne vidi nigdje na sajtu: sve radi, mail stigne, a dugme
 * "Otvori rezervaciju" vodi na Vercelovu stranicu "DEPLOYMENT_NOT_FOUND".
 * Otkrije se tek kad gost klikne — dakle najkasnije moguće.
 */
async function ucitaj(kljucevi: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [ime, vrijednost] of Object.entries(kljucevi)) vi.stubEnv(ime, vrijednost);
  return import('./env');
}

afterEach(() => vi.unstubAllEnvs());

describe('siteUrl', () => {
  it('koristi NEXT_PUBLIC_SITE_URL kad je podešen', async () => {
    const { env } = await ucitaj({ NEXT_PUBLIC_SITE_URL: 'https://treescape.ba' });
    expect(env.siteUrl).toBe('https://treescape.ba');
  });

  it('skida kosu crtu s kraja', async () => {
    // Inače bi link postao ".../rezervacija" s dvije kose crte.
    const { env } = await ucitaj({ NEXT_PUBLIC_SITE_URL: 'https://treescape.ba/' });
    expect(env.siteUrl).toBe('https://treescape.ba');
  });

  it('dopisuje shemu ako je upisan goli domen', async () => {
    const { env } = await ucitaj({ NEXT_PUBLIC_SITE_URL: 'treescape.ba' });
    expect(env.siteUrl).toBe('https://treescape.ba');
  });

  it('bez varijable uzima produkcijski domen s Vercela', async () => {
    // Zaboravljena varijabla više ne znači pokvaren link.
    const { env } = await ucitaj({ VERCEL_PROJECT_PRODUCTION_URL: 'tree-scape-demo2.vercel.app' });
    expect(env.siteUrl).toBe('https://tree-scape-demo2.vercel.app');
  });

  it('bez varijable uzima domen s Railway-a', async () => {
    const { env } = await ucitaj({ RAILWAY_PUBLIC_DOMAIN: 'treescape.up.railway.app' });
    expect(env.siteUrl).toBe('https://treescape.up.railway.app');
  });

  it('produkcijski domen ima prednost nad adresom pojedine objave', async () => {
    // VERCEL_URL se mijenja pri svakoj gradnji i gostu ništa ne znači.
    const { env } = await ucitaj({
      VERCEL_PROJECT_PRODUCTION_URL: 'treescape.ba',
      VERCEL_URL: 'treescape-git-abc123.vercel.app',
    });
    expect(env.siteUrl).toBe('https://treescape.ba');
  });

  it('bez ičega ostaje localhost', async () => {
    const { env } = await ucitaj({});
    expect(env.siteUrl).toBe('http://localhost:3000');
  });
});

describe('platformSiteUrl', () => {
  it('prijavi neslaganje između upisane i stvarne adrese', async () => {
    // Tačno ono što se desilo: varijabla pokazuje na staru objavu.
    const { env, platformSiteUrl } = await ucitaj({
      NEXT_PUBLIC_SITE_URL: 'https://treescape.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'tree-scape-demo2.vercel.app',
    });

    expect(env.siteUrl).toBe('https://treescape.vercel.app');
    expect(platformSiteUrl()).toBe('https://tree-scape-demo2.vercel.app');
    expect(platformSiteUrl()).not.toBe(env.siteUrl);
  });

  it('kad se poklapaju, nema šta prijaviti', async () => {
    const { env, platformSiteUrl } = await ucitaj({
      NEXT_PUBLIC_SITE_URL: 'https://tree-scape-demo2.vercel.app',
      VERCEL_PROJECT_PRODUCTION_URL: 'tree-scape-demo2.vercel.app',
    });

    expect(platformSiteUrl()).toBe(env.siteUrl);
  });

  it('izvan platforme nema s čim uporediti', async () => {
    const { platformSiteUrl } = await ucitaj({ NEXT_PUBLIC_SITE_URL: 'https://treescape.ba' });
    expect(platformSiteUrl()).toBeNull();
  });
});
