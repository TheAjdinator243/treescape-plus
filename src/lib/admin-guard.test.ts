import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Tajne se moraju postaviti PRIJE nego `env.ts` bude uvezen — on ih čita
 * jednom, pri učitavanju modula.
 */
vi.stubEnv('ADMIN_SESSION_SECRET', 'tajna-za-testove-koja-ima-najmanje-32-znaka');
vi.stubEnv('ADMIN_ACCESS_CODE', 'dovoljno-dug-pristupni-kod');
vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://treescape.ba');

const { ADMIN_COOKIE, createSessionToken } = await import('./admin-session');
const { requireAdmin } = await import('./admin-guard');

const URL_ADMIN = 'https://treescape.ba/api/admin/bookings';

function request(headers: Record<string, string>, method = 'POST'): Request {
  return new Request(URL_ADMIN, { method, headers });
}

let validToken: string;

beforeAll(async () => {
  validToken = await createSessionToken();
});

describe('requireAdmin', () => {
  it('propušta ispravnu sesiju s našeg sajta', async () => {
    const denied = await requireAdmin(
      request({
        cookie: `${ADMIN_COOKIE}=${validToken}`,
        origin: 'https://treescape.ba',
      })
    );

    expect(denied).toBeNull();
  });

  it('odbija zahtjev bez kolačića sa 401', async () => {
    const denied = await requireAdmin(request({ origin: 'https://treescape.ba' }));

    expect(denied?.status).toBe(401);
  });

  it('odbija izmišljen i izmijenjen token', async () => {
    for (const token of ['izmisljeno', `${validToken}x`, validToken.slice(0, -4)]) {
      const denied = await requireAdmin(
        request({ cookie: `${ADMIN_COOKIE}=${token}`, origin: 'https://treescape.ba' })
      );

      expect(denied?.status, `token "${token.slice(0, 12)}…" je prošao`).toBe(401);
    }
  });

  /**
   * Napad koji ovo hvata: vlasnik je prijavljen, otvori tuđu stranicu, a ona u
   * pozadini pošalje zahtjev našoj administraciji. Kolačić ide uz zahtjev jer
   * preglednik gleda odredište, ne pošiljaoca — sesija JESTE valjana. Zato se
   * ovdje mora pasti na porijeklu, a ne na sesiji.
   */
  it('odbija valjanu sesiju kad zahtjev dolazi s tuđe stranice', async () => {
    const denied = await requireAdmin(
      request({
        cookie: `${ADMIN_COOKIE}=${validToken}`,
        origin: 'https://zao-sajt.example',
      })
    );

    expect(denied?.status).toBe(403);
  });

  it('nalazi kolačić i kad nije prvi u nizu', async () => {
    const denied = await requireAdmin(
      request({
        cookie: `jezik=bs; NEKI_DRUGI=1; ${ADMIN_COOKIE}=${validToken}; zadnji=x`,
        origin: 'https://treescape.ba',
      })
    );

    expect(denied).toBeNull();
  });

  it('ne nasjeda na kolačić sličnog imena', async () => {
    const denied = await requireAdmin(
      request({
        cookie: `ne_${ADMIN_COOKIE}=${validToken}`,
        origin: 'https://treescape.ba',
      })
    );

    expect(denied?.status).toBe(401);
  });
});
