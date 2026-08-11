import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Šestocifreni kod iz aplikacije na telefonu (TOTP, RFC 6238).
 *
 * Drugi faktor uz pristupni kod. Poenta je jednostavna: ukraden ili pogođen
 * pristupni kod više nije dovoljan — treba i telefon koji svakih trideset
 * sekundi pravi nov broj.
 *
 * Zašto baš TOTP, a ne kod poslan mailom ili Telegramom: radi bez veze s
 * internetom, ne zavisi ni od jedne usluge koja može pasti ili biti probijena,
 * i ne košta ništa. Tajna nikad ne putuje mrežom — ni pri prijavi, jer se
 * šalje samo izvedeni šestocifreni broj.
 *
 * ── Zašto je ovo napisano ovdje, a ne uzeto kao gotov paket ────────────────
 *
 * Sam račun je kratak: HMAC nad brojačem vremena, pa se iz rezultata izreže
 * šest cifara. Node već nosi HMAC. Umjesto novog paketa u lancu zavisnosti,
 * stoji stotinjak redova provjerenih SLUŽBENIM test vektorima iz RFC-a 6238
 * (vidi `totp.test.ts`) — ako se ijedna sitnica u računu pomjeri, ti testovi
 * padnu. To je jača garancija nego povjerenje da paket radi ono što piše.
 */

/** Koliko traje jedan kod. Trideset sekundi je ono što očekuje svaka aplikacija. */
const STEP_SECONDS = 30;

/** Šest cifara — isto, standard koji sve aplikacije podrazumijevaju. */
const DIGITS = 6;

/**
 * Koliko koraka unazad i unaprijed se prihvata.
 *
 * Sat na telefonu i sat na serveru nikad nisu savršeno poravnati, a i sam unos
 * traje. Jedan korak u svakom smjeru pokriva do minute razlike — dovoljno da
 * pošten korisnik ne pada, a premalo da napadaču išta znači: umjesto jednog
 * važećeg koda pogađa među tri, od milion mogućih.
 */
const WINDOW = 1;

/** RFC 4648, bez dopune. Slovo `=`, razmaci i mala slova se tolerišu. */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[=\s-]/g, '');

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Tajna nije ispravan base32: neočekivan znak "${char}"`);

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 0xff);
    }
  }

  return Buffer.from(out);
}

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }

  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];

  return out;
}

/**
 * Nova tajna za upis u `ADMIN_TOTP_SECRET`.
 *
 * Dvadeset bajta (160 bita) je ono što RFC preporučuje za SHA-1 i što svaka
 * aplikacija uredno prihvata.
 */
export function generateSecret(): string {
  return encodeBase32(randomBytes(20));
}

/**
 * Kod za zadati brojač.
 *
 * `algorithm` je namjerno SHA-1: nije to propust nego uslov da kod uopće radi
 * u Google Authenticatoru i ostalima, koji drugo i ne očekuju. Ovdje SHA-1 ne
 * čuva ništa tajno — samo izvodi šest cifara iz tajne koju napadač ionako
 * nema — pa poznate slabosti SHA-1 na ovo ne utiču.
 */
export function codeForCounter(secret: Buffer, counter: number, digits = DIGITS): string {
  const buffer = Buffer.alloc(8);
  // Brojač je 64-bitni, veliki kraj naprijed. `BigInt` jer obični broj ne
  // pokriva 64 bita bez gubitka.
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', secret).update(buffer).digest();

  // "Dinamično odsijecanje" iz RFC-a 4226: zadnja četvorka bita kaže odakle
  // se čitaju četiri bajta koda.
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function counterFor(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/** Trenutni kod — služi testovima i skripti za podešavanje. */
export function currentCode(secretBase32: string, nowMs: number = Date.now()): string {
  return codeForCounter(decodeBase32(secretBase32), counterFor(nowMs));
}

/**
 * Poređenje kodova u konstantnom vremenu.
 *
 * Isti razlog kao kod pristupnog koda: obično poređenje stane na prvoj
 * različitoj cifri, pa se iz trajanja odgovora kod može slagati cifru po
 * cifru. Ovdje je to još važnije nego inače — kod ima samo šest cifara.
 */
function sameCode(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Zadnji iskorišteni brojač — da se isti kod ne može upotrijebiti dvaput.
 *
 * Bez ovoga kod ostaje važeći do minute nakon što je unesen, pa ko ga vidi
 * preko ramena ili uhvati u dnevniku posrednika stigne da se prijavi za njim.
 *
 * Pamti se u memoriji instance, pa se na Vercelu gubi pri hladnom startu i ne
 * dijeli između instanci — kao i ograničenje broja pokušaja. Znači: ovo pouzdano
 * zaustavlja ponovnu upotrebu na istoj instanci, a ne u svakom mogućem slučaju.
 * Prozor zloupotrebe je ionako najviše minut, i traži da napadač već vidi kod.
 */
const usedCounters = new Map<string, number>();

function usageKey(secretBase32: string): string {
  return createHmac('sha256', 'treescape-totp').update(secretBase32).digest('hex');
}

export type TotpResult =
  | { ok: true; counter: number }
  | { ok: false; reason: 'format' | 'mismatch' | 'reused' };

/**
 * Provjera koda koji je korisnik unio. NE troši ga — vidi `markTotpUsed`.
 *
 * Razlog neuspjeha se vraća radi dnevnika i testova — pozivalac ga NE smije
 * proslijediti korisniku. Napadaču bi razlika između "pogrešan kod" i "kod je
 * već iskorišten" rekla da je pogodio pravi broj.
 */
export function verifyTotp(
  secretBase32: string,
  input: string,
  nowMs: number = Date.now()
): TotpResult {
  // Aplikacije prikazuju kod kao "123 456", a i sam unos zna pokupiti razmak.
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length !== DIGITS) return { ok: false, reason: 'format' };

  const secret = decodeBase32(secretBase32);
  const current = counterFor(nowMs);
  const last = usedCounters.get(usageKey(secretBase32));

  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    const counter = current + offset;
    if (counter < 0) continue;

    if (!sameCode(codeForCounter(secret, counter), cleaned)) continue;

    // Kod je tačan. Ostaje pitanje je li već upotrijebljen.
    if (last !== undefined && counter <= last) return { ok: false, reason: 'reused' };

    return { ok: true, counter };
  }

  return { ok: false, reason: 'mismatch' };
}

/**
 * Troši kod — zove se TEK kad je cijela prijava uspjela.
 *
 * Odvojeno od provjere, i to zbog greške koju je uhvatila proba na pravom
 * serveru: dok je provjera sama trošila kod, bilo je dovoljno poslati TAČAN
 * kod s telefona uz POGREŠAN pristupni kod pa da se taj broj potroši. Dvije
 * posljedice, obje loše.
 *
 * Prva je namjerna šteta: bilo ko ko vidi kod na ekranu može ga spaliti prije
 * vlasnika. Druga je gora jer pogađa svaki dan — vlasnik pogriješi pristupni
 * kod, ispravi ga, prepiše isti broj s telefona (jer još stoji na ekranu) i
 * dobije "pogrešno". Izgleda tačno kao da je dvofaktorska zaštita pokvarena.
 */
export function markTotpUsed(secretBase32: string, counter: number): void {
  usedCounters.set(usageKey(secretBase32), counter);
}

/** Samo za testove: čisto stanje između slučajeva. */
export function __clearUsedCounters(): void {
  usedCounters.clear();
}

/**
 * Adresa koju aplikacija na telefonu očekuje pri dodavanju naloga.
 *
 * Oblik je `otpauth://totp/...` — isto ono što stoji iza QR koda. Aplikacije
 * ga primaju i ručno, pa QR nije neophodan.
 */
export function otpauthUri(secretBase32: string, label = 'TreeScape', issuer = 'TreeScape'): string {
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?${params}`;
}

export const TOTP_DIGITS = DIGITS;
export const TOTP_STEP_SECONDS = STEP_SECONDS;
