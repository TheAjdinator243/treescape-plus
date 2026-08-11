import { describe, expect, it } from 'vitest';

import { clientIp, rateLimitKey } from './client-ip';

function request(headers: Record<string, string>): Request {
  return new Request('https://treescape.ba/api/admin/login', { method: 'POST', headers });
}

describe('adresa klijenta', () => {
  it('uzima ono što upisuje platforma, ispred liste', () => {
    const ip = clientIp(
      request({
        'x-vercel-forwarded-for': '203.0.113.5',
        'x-forwarded-for': '198.51.100.9',
      })
    );

    expect(ip).toBe('203.0.113.5');
  });

  /**
   * Ovo je test za samu rupu zbog koje je fajl i nastao.
   *
   * Ranije se uzimao PRVI unos iz `x-forwarded-for`. Taj unos dolazi od
   * klijenta, pa je napadaču bilo dovoljno uz svaki pokušaj poslati novu
   * izmišljenu adresu — svaki pokušaj bi dobio svoj brojač i ograničenje od
   * pet pokušaja u minuti ne bi se nikad napunilo.
   */
  it('ne vjeruje adresi koju je klijent sam dopisao na početak liste', () => {
    const ip = clientIp(request({ 'x-forwarded-for': '1.2.3.4, 203.0.113.5' }));

    expect(ip).not.toBe('1.2.3.4');
    expect(ip).toBe('203.0.113.5');
  });

  it('daje isti ključ za isti izvor uprkos podmetnutom početku liste', () => {
    const prvi = rateLimitKey(request({ 'x-forwarded-for': '1.1.1.1, 203.0.113.5' }), 'test');
    const drugi = rateLimitKey(request({ 'x-forwarded-for': '9.9.9.9, 203.0.113.5' }), 'test');

    expect(prvi).toBe(drugi);
  });

  it('vraća null kad adrese nema', () => {
    expect(clientIp(request({}))).toBeNull();
    expect(rateLimitKey(request({}), 'test')).toBeNull();
  });

  it('razdvaja brojače po namjeni', () => {
    const headers = { 'x-real-ip': '203.0.113.5' };

    expect(rateLimitKey(request(headers), 'admin-login')).not.toBe(
      rateLimitKey(request(headers), 'booking-reserve')
    );
  });
});
