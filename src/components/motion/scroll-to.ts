/**
 * Jedno mjesto s kojeg se traži pomak na neki element.
 *
 * Postoji zbog Lenisa. Kad on radi, stranicu vozi on — svaki kadar upiše
 * svoju vrijednost skrola. Native `element.scrollIntoView({ behavior:
 * 'smooth' })` u tom slučaju pomjeri stranicu, a Lenis je sljedeći kadar
 * vrati nazad; izvana izgleda kao da klik nije ništa uradio. Upravo to se
 * dešavalo s dugmetom "Dalje" u rezervaciji: korak se mijenjao, ali je gost
 * ostajao na dnu, kod dugmeta, dok je početak novog koraka bio iznad ekrana.
 *
 * Zato Lenis ovdje ostavi svoju referencu, a svi ostali traže pomak preko
 * `scrollToElement`. Kad Lenisa nema — jer gost traži manje animacija, ili
 * jer je stranica izvan njegovog rasporeda — pada se na native pomak, koji
 * je tada potpuno ispravan.
 */

interface Scroller {
  scrollTo: (target: HTMLElement, options?: { offset?: number }) => void;
}

let scroller: Scroller | null = null;

/** Vraća funkciju za odjavu, da se pozove pri raspremanju. */
export function registerScroller(instance: Scroller): () => void {
  scroller = instance;

  return () => {
    // Samo ako je i dalje naš: dva brza prelaza mogu zamijeniti redoslijed,
    // a odjava starijeg ne smije ugasiti noviji.
    if (scroller === instance) scroller = null;
  };
}

export function scrollToElement(element: HTMLElement): void {
  if (scroller) {
    scroller.scrollTo(element);
    return;
  }

  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
