import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __clearRateLimits, consumeRateLimit, resetRateLimit } from './rate-limit';

describe('ograničavanje broja zahtjeva', () => {
  beforeEach(() => {
    __clearRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('propušta do granice, pa zatvara', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(true);
    }

    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(false);
  });

  it('kaže koliko se čeka', () => {
    for (let i = 0; i < 5; i += 1) consumeRateLimit('kljuc', 5, 60_000);

    vi.advanceTimersByTime(20_000);

    const result = consumeRateLimit('kljuc', 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(40);
  });

  it('otvara se kad prozor prođe', () => {
    for (let i = 0; i < 5; i += 1) consumeRateLimit('kljuc', 5, 60_000);
    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(true);
  });

  /**
   * Kucanje bez prestanka ne smije samo sebi produžavati kaznu — inače
   * napadačeva skripta zaključa tu adresu zauvijek, a s njom i pravog gosta
   * koji dijeli izlaznu adresu (kućni internet, kafić, firma).
   */
  it('ne produžava kaznu zbog pokušaja unutar prozora', () => {
    for (let i = 0; i < 20; i += 1) consumeRateLimit('kljuc', 5, 60_000);

    vi.advanceTimersByTime(60_001);

    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(true);
  });

  it('broji svaki ključ zasebno', () => {
    for (let i = 0; i < 5; i += 1) consumeRateLimit('prvi', 5, 60_000);

    expect(consumeRateLimit('prvi', 5, 60_000).allowed).toBe(false);
    expect(consumeRateLimit('drugi', 5, 60_000).allowed).toBe(true);
  });

  it('uspješna prijava briše brojač', () => {
    for (let i = 0; i < 5; i += 1) consumeRateLimit('kljuc', 5, 60_000);
    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(false);

    resetRateLimit('kljuc');

    expect(consumeRateLimit('kljuc', 5, 60_000).allowed).toBe(true);
  });
});
