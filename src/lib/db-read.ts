/**
 * Čitanje iz baze koje NE izmišlja podatke.
 *
 * ── Zašto ovo postoji ─────────────────────────────────────────────────────
 * Ranije je svako od tri čitanja na grešku tiho vraćalo zamjenu: postavke su
 * padale na demo vrijednosti, cjenovnik i dostupnost na prazan spisak. Nijedna
 * od tih zamjena nije bezopasna:
 *
 *   • demo postavke nose cijenu od 120 € po danu — gost ju je vidio kao pravu,
 *     a to je cijena koju niko nije odredio;
 *   • prazan cjenovnik briše sezonske cijene;
 *   • prazna dostupnost prikaže SVE termine kao slobodne, pa gost odabere
 *     datum koji je odavno zauzet i tek pri slanju dobije odbijenicu.
 *
 * Trenutni kvar na vezi je najčešće jedan jedini neuspjeli zahtjev, pa se
 * pokušava tri puta prije nego se odustane. Ako i tada ne uspije, greška ide
 * dalje — stranica će se srušiti glasno, umjesto da tiho prikaže izmišljen
 * broj. Pogrešna cijena na sajtu za rezervacije košta više od kratkog kvara.
 *
 * Demo podaci ostaju samo za slučaj kad baza UOPĆE nije podešena — tada nema
 * šta da se pogriješi, jer nema ni šta da se pročita.
 */
const POKUSAJA = 3;
const PAUZE_MS = [150, 400];

export async function citajIzBaze<T>(
  sto: string,
  upit: () => PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<T> {
  let zadnja = 'nepoznat razlog';

  for (let pokusaj = 1; pokusaj <= POKUSAJA; pokusaj++) {
    const { data, error } = await upit();

    // Prazan spisak je ISPRAVAN odgovor (tabela bez redova), pa se provjerava
    // `null`, a ne `falsy` — inače bi prazan cjenovnik izgledao kao kvar.
    if (!error && data !== null) return data;

    zadnja = error?.message ?? 'baza je vratila prazan odgovor';
    if (pokusaj < POKUSAJA) {
      console.error(
        `[treescape] ${sto}: pokušaj ${pokusaj} od ${POKUSAJA} nije uspio (${zadnja}), pokušavam ponovo`
      );
      await new Promise((r) => setTimeout(r, PAUZE_MS[pokusaj - 1] ?? 400));
    }
  }

  throw new Error(
    `[treescape] ${sto} nije pročitano iz baze nakon ${POKUSAJA} pokušaja: ${zadnja}`
  );
}
