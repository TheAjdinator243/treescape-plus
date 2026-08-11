import type { AmenityKey } from './i18n';

/**
 * Redoslijed sadržaja kuće — isti u oba izgleda sajta.
 *
 * Ovdje stoji SAMO redoslijed. Nazivi i opisi žive u rječnicima, pod
 * `amenities.items`, vezani za isti ključ — jer ih treba na sva tri jezika.
 * Ikone su u `components/site/AmenityIcon.tsx`.
 */
export const AMENITIES: AmenityKey[] = [
  // Ovo dvoje su najjači adut kuće, pa idu prvi — gost ih vidi bez skrolanja.
  'pool',
  'fountain',
  'wifi',
  'kitchen',
  'fire',
  'grill',
  'car',
  'heat',
  'washer',
  'tv',
  'pet',
  'tree',
  'coffee',
  'towel',
];
