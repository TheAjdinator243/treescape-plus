/**
 * Činjenice o kući — jedno mjesto za cijeli sajt.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  ZAMIJENI OVO SVOJIM BROJEVIMA                                         │
 * │                                                                        │
 * │  Ovo su podaci koji se ne mijenjaju iz dana u dan, pa ne stoje u bazi  │
 * │  nego ovdje. Broj gostiju NIJE ovdje — njega postavljaš u             │
 * │  administraciji, jer se s njim mijenja i provjera pri rezervaciji.     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Brojevi su prije stajali upisani u `PlusHero.tsx` i `PlusAbout.tsx`, na dva
 * mjesta s istim vrijednostima. To se razilazi pri prvoj izmjeni: neko
 * promijeni broj soba u heroju, zaboravi na odjeljak o kući, i sajt na dva
 * mjesta tvrdi dvije različite stvari o istoj kući.
 */
export const PROPERTY = {
  bedrooms: 2,
  bathrooms: 2,
} as const;
