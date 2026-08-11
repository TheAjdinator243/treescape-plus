/**
 * Gdje je kuća — jedno mjesto za cijeli sajt.
 *
 * Koordinate stoje ovdje, a ne u komponenti, jer ih čitaju i karta i link na
 * Google Mape, i to u oba izgleda sajta (osnovnom i `pro`). Da su prepisane po
 * komponentama, prva izmjena bi ostavila ostale da pokazuju staru adresu —
 * a gost bi to otkrio tek kad se izgubi.
 *
 * Mijenjaj SAMO ovdje.
 */
export const MAP_MARKER = { lat: 43.92036062376055, lon: 18.281697249204257 };

/** Koliko se karte vidi oko oznake. Manji broj = više uvećano. */
const DELTA = 0.03;

const MAP_BBOX = [
  MAP_MARKER.lon - DELTA,
  MAP_MARKER.lat - DELTA / 2,
  MAP_MARKER.lon + DELTA,
  MAP_MARKER.lat + DELTA / 2,
].join(',');

/**
 * Karta je OpenStreetMap iframe — radi bez API ključa i bez naplate.
 * (Google Maps Embed traži ključ i naplaćuje se preko besplatne kvote.)
 */
export const MAP_SRC =
  `https://www.openstreetmap.org/export/embed.html?bbox=${MAP_BBOX}` +
  `&layer=mapnik&marker=${MAP_MARKER.lat},${MAP_MARKER.lon}`;

/**
 * Link na Google Mape — onaj koji je vlasnik podijelio iz same aplikacije.
 *
 * Zašto podijeljeni link, a ne onaj sastavljen od koordinata: podijeljeni vodi
 * na SAČUVANO mjesto, s imenom i pribadačom kakvu je vlasnik postavio, pa
 * navigacija odmah zna cilj. Sastavljeni bi bio samo pretraga po dvije brojke —
 * radi, ali gostu na telefonu izgleda kao tačka usred ničega.
 *
 * PAŽNJA: ovaj link i `MAP_MARKER` moraju pokazivati na isto mjesto, a ništa
 * ih ne veže osim ove napomene. Ako se koordinate ikad promijene, podijeli
 * novi link iz aplikacije Mape i zamijeni ga ovdje — inače će karta na sajtu
 * pokazivati jedno, a link u mailu drugo.
 *
 * (Bez `?g_st=ic` na kraju — to je samo oznaka odakle je link podijeljen.)
 */
export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/HkSftt1wXcMRJBHQA';

/** Minute vožnje su činjenica o kući, pa stoje ovdje; nazivi su u rječnicima. */
export const TRAVEL = [
  { key: 'city', minutes: 35 },
  { key: 'airport', minutes: 45 },
  { key: 'shop', minutes: 8 },
] as const;
