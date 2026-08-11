import { describe, expect, it } from 'vitest';

import { isSameOrigin } from './csrf';

/**
 * Ovi testovi čuvaju odgovor na jedno pitanje: može li tuđa stranica, dok je
 * vlasnik prijavljen, poslati naredbu u našu administraciju.
 */

function request(
  method: string,
  headers: Record<string, string> = {},
  url = 'https://treescape.ba/api/admin/bookings'
): Request {
  return new Request(url, { method, headers });
}

describe('provjera porijekla zahtjeva', () => {
  it('propušta čitanje bez obzira na porijeklo', () => {
    // GET ništa ne mijenja, pa ga ovo pravilo ne dira.
    expect(isSameOrigin(request('GET', { origin: 'https://zao-sajt.example' }))).toBe(true);
  });

  it('propušta zahtjev s našeg sajta', () => {
    expect(isSameOrigin(request('POST', { origin: 'https://treescape.ba' }))).toBe(true);
  });

  it('odbija zahtjev s tuđe stranice', () => {
    expect(isSameOrigin(request('POST', { origin: 'https://zao-sajt.example' }))).toBe(false);
  });

  it('odbija domen koji se samo NASTAVLJA na naš', () => {
    // Klasična zamka: `treescape.ba.zao-sajt.example` sadrži naše ime, pa bi
    // provjera pisana kao `startsWith`/`includes` ovo pustila.
    expect(
      isSameOrigin(request('POST', { origin: 'https://treescape.ba.zao-sajt.example' }))
    ).toBe(false);
    expect(isSameOrigin(request('POST', { origin: 'https://nije-treescape.ba' }))).toBe(false);
  });

  it('odbija zahtjev bez ijednog zaglavlja o porijeklu', () => {
    // Napad iz preglednika uvijek nosi `Origin`; izostanak znači da zahtjev
    // nije došao sa stranice, pa nema šta ni tražiti u administraciji.
    expect(isSameOrigin(request('POST'))).toBe(false);
    expect(isSameOrigin(request('DELETE'))).toBe(false);
  });

  it('prihvata `Referer` kad `Origin` nedostaje', () => {
    expect(
      isSameOrigin(request('POST', { referer: 'https://treescape.ba/admin' }))
    ).toBe(true);
    expect(
      isSameOrigin(request('POST', { referer: 'https://zao-sajt.example/napad' }))
    ).toBe(false);
  });

  it('ne pada na neispravnom zaglavlju', () => {
    expect(isSameOrigin(request('POST', { origin: 'null' }))).toBe(false);
    expect(isSameOrigin(request('POST', { origin: 'ovo-nije-adresa' }))).toBe(false);
  });

  it('gleda sve metode koje nešto mijenjaju', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isSameOrigin(request(method, { origin: 'https://zao-sajt.example' }))).toBe(false);
    }
  });
});
