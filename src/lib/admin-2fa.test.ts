import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Ponašanje prijave kad je drugi faktor uključen — kroz pravu rutu, a ne kroz
 * njene dijelove. Ovo su tvrdnje koje moraju vrijediti i nakon svake buduće
 * izmjene te datoteke.
 */

const SECRET_BASE32 = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const ACCESS_CODE = 'dovoljno-dug-pristupni-kod';

vi.stubEnv('ADMIN_ACCESS_CODE', ACCESS_CODE);
vi.stubEnv('ADMIN_SESSION_SECRET', 'tajna-za-testove-koja-ima-najmanje-32-znaka');
vi.stubEnv('ADMIN_TOTP_SECRET', SECRET_BASE32);
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://treescape.ba');

const { POST } = await import('@/app/api/admin/login/route');
const { currentCode, __clearUsedCounters } = await import('./totp');
const { ADMIN_COOKIE, isValidSession, createSessionToken } = await import('./admin-session');
const { __clearRateLimits } = await import('./rate-limit');

function login(body: unknown, ip = '203.0.113.7'): Promise<Response> {
  return POST(
    new Request('https://treescape.ba/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://treescape.ba',
        'x-real-ip': ip,
      },
      body: JSON.stringify(body),
    })
  );
}

/** Kolačić sesije iz odgovora, ako ga ima. */
function sessionCookie(response: Response): string | null {
  const header = response.headers.get('set-cookie');
  if (!header) return null;

  const match = header.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return match?.[1] && match[1].length > 0 ? match[1] : null;
}

describe('prijava kad je drugi faktor uključen', () => {
  beforeEach(() => {
    __clearRateLimits();
    __clearUsedCounters();
  });

  it('pušta unutra samo kad su OBA podatka tačna', async () => {
    const response = await login({ code: ACCESS_CODE, totp: currentCode(SECRET_BASE32) });

    expect(response.status).toBe(200);
    expect(sessionCookie(response)).toBeTruthy();
  });

  it('odbija tačan pristupni kod bez koda s telefona', async () => {
    const response = await login({ code: ACCESS_CODE });

    expect(response.status).toBe(401);
    expect(sessionCookie(response)).toBeNull();
  });

  it('odbija tačan pristupni kod s pogrešnim kodom s telefona', async () => {
    const response = await login({ code: ACCESS_CODE, totp: '000000' });

    expect(response.status).toBe(401);
    expect(sessionCookie(response)).toBeNull();
  });

  it('odbija tačan kod s telefona uz pogrešan pristupni kod', async () => {
    const response = await login({ code: 'pogresno', totp: currentCode(SECRET_BASE32) });

    expect(response.status).toBe(401);
    expect(sessionCookie(response)).toBeNull();
  });

  /**
   * Ovo je razlog zbog kojeg oba polja stoje na istom ekranu i zašto se ne
   * izlazi čim prvi faktor ne valja.
   *
   * Da se poruke razlikuju, napadač koji pogađa pristupni kod bi po odgovoru
   * znao kad ga je pogodio — i drugi faktor bi mu služio samo kao usporenje,
   * umjesto kao zid.
   */
  it('ne odaje KOJI je faktor pogriješen', async () => {
    const [samoKod, samoTelefon, nista] = await Promise.all([
      login({ code: ACCESS_CODE, totp: '000000' }).then((r) => r.json()),
      login({ code: 'pogresno', totp: currentCode(SECRET_BASE32) }).then((r) => r.json()),
      login({ code: 'pogresno', totp: '000000' }).then((r) => r.json()),
    ]);

    expect(samoKod).toEqual(nista);
    expect(samoTelefon).toEqual(nista);
  });

  it('ne prima isti kod s telefona dvaput', async () => {
    const code = currentCode(SECRET_BASE32);

    expect((await login({ code: ACCESS_CODE, totp: code })).status).toBe(200);
    expect((await login({ code: ACCESS_CODE, totp: code })).status).toBe(401);
  });

  /**
   * Greška koju je uhvatila proba na pravom serveru, a ne nijedan test.
   *
   * Neuspjela prijava NE SMIJE potrošiti kod s telefona. Inače: vlasnik
   * pogriješi pristupni kod, ispravi ga, prepiše isti broj koji mu još stoji
   * na ekranu — i ne uđe. Isto tako, ko god vidi taj broj mogao bi ga spaliti
   * prije vlasnika, uz bilo kakav izmišljen pristupni kod.
   */
  it('pogrešan pristupni kod ne troši kod s telefona', async () => {
    const code = currentCode(SECRET_BASE32);

    // Tri promašaja u kojima je broj s telefona bio tačan.
    for (let i = 0; i < 3; i += 1) {
      expect((await login({ code: 'pogresno', totp: code })).status).toBe(401);
    }

    // Isti broj i dalje radi kad se pristupni kod konačno pogodi.
    expect((await login({ code: ACCESS_CODE, totp: code })).status).toBe(200);
  });

  it('prima kod razmakom razdvojen, kako ga aplikacija pokazuje', async () => {
    const code = currentCode(SECRET_BASE32);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

    expect((await login({ code: ACCESS_CODE, totp: spaced })).status).toBe(200);
  });

  it('sesija otvorena bez drugog faktora više ne vrijedi', async () => {
    // Ovako je izgledao žeton prije nego je zaštita uključena.
    const stari = await createSessionToken(['pwd']);
    expect(await isValidSession(stari)).toBe(false);

    const novi = await createSessionToken(['pwd', 'otp']);
    expect(await isValidSession(novi)).toBe(true);
  });

  it('sesija izdata pri prijavi nosi trag o drugom faktoru', async () => {
    const response = await login({ code: ACCESS_CODE, totp: currentCode(SECRET_BASE32) });
    const token = sessionCookie(response);

    expect(token).toBeTruthy();
    expect(await isValidSession(token!)).toBe(true);
  });

  it('i dalje broji pokušaje', async () => {
    for (let i = 0; i < 5; i += 1) {
      await login({ code: 'pogresno', totp: '000000' }, '198.51.100.4');
    }

    const response = await login({ code: 'pogresno', totp: '000000' }, '198.51.100.4');
    expect(response.status).toBe(429);
  });
});
