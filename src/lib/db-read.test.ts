import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { citajIzBaze } from './db-read';

/**
 * Ovi testovi čuvaju jedno jedino pravilo: čitanje iz baze SMIJE pasti, ali
 * NE SMIJE izmisliti podatak.
 *
 * Kvar zbog kojeg su nastali: postavke su na grešku tiho padale na demo
 * vrijednosti, a u njima stoji cijena od 120 € po danu. Gost je tu cijenu
 * vidio kao pravu, na sajtu za rezervacije, bez ijednog traga da nešto nije u
 * redu — jer greška se ispisivala samo u log servera.
 */
describe('citajIzBaze', () => {
  beforeEach(() => {
    // Pauze između pokušaja su stvarne, ali test ne treba da ih čeka.
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Pusti sve pauze da prođu, pa sačekaj rezultat.
   *
   * Prazan `catch` stoji da odbijanje bude primljeno ODMAH. Bez njega bi
   * obećanje palo dok test još odmotava tajmere, dakle prije nego `expect`
   * stigne da se zakači — a Node to prijavi kao neuhvaćeno odbijanje i test
   * prolazi uz tri crvene poruke.
   */
  async function odmotaj<T>(posao: Promise<T>): Promise<T> {
    posao.catch(() => {});
    await vi.runAllTimersAsync();
    return posao;
  }

  it('vraća podatke iz prvog pokušaja', async () => {
    const upit = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });

    await expect(odmotaj(citajIzBaze('nešto', upit))).resolves.toEqual([{ id: 1 }]);
    expect(upit).toHaveBeenCalledTimes(1);
  });

  it('prazan spisak je ispravan odgovor, a ne kvar', async () => {
    // Tabela bez ijednog reda vraća `[]` bez greške. Da se provjeravalo
    // "ima li išta", prazan cjenovnik bi izgledao kao pad baze i stranica bi
    // se rušila svaki put kad vlasnik obriše sve sezone.
    const upit = vi.fn().mockResolvedValue({ data: [], error: null });

    await expect(odmotaj(citajIzBaze('cjenovnik', upit))).resolves.toEqual([]);
    expect(upit).toHaveBeenCalledTimes(1);
  });

  it('ponovi pokušaj i uspije iz drugog', async () => {
    const upit = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'veza prekinuta' } })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    await expect(odmotaj(citajIzBaze('postavke', upit))).resolves.toEqual({ id: 1 });
    expect(upit).toHaveBeenCalledTimes(2);
  });

  it('ponovi pokušaj i kad baza vrati prazan odgovor bez greške', async () => {
    // `.single()` na nepostojećem redu zna vratiti `data: null` bez greške.
    const upit = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });

    await expect(odmotaj(citajIzBaze('postavke', upit))).resolves.toEqual({ id: 1 });
    expect(upit).toHaveBeenCalledTimes(2);
  });

  it('nakon tri neuspjela pokušaja baca grešku umjesto da izmisli podatke', async () => {
    const upit = vi.fn().mockResolvedValue({ data: null, error: { message: 'timeout' } });

    await expect(odmotaj(citajIzBaze('postavke', upit))).rejects.toThrow(/postavke/);
    expect(upit).toHaveBeenCalledTimes(3);
  });

  it('u poruci greške stoji posljednji razlog, da se zna šta popraviti', async () => {
    const upit = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'prvi razlog' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'drugi razlog' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'posljednji razlog' } });

    await expect(odmotaj(citajIzBaze('dostupnost', upit))).rejects.toThrow(/posljednji razlog/);
  });

  it('ne pokušava četvrti put', async () => {
    const upit = vi.fn().mockResolvedValue({ data: null, error: { message: 'pao' } });

    await expect(odmotaj(citajIzBaze('nešto', upit))).rejects.toThrow();
    expect(upit).toHaveBeenCalledTimes(3);
  });
});
