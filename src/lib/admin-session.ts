import { jwtVerify, SignJWT } from 'jose';

import { env } from './env';

/**
 * Sesija administracije — potpisani kolačić.
 *
 * Ovaj fajl namjerno koristi SAMO `jose` (koji radi na Web Crypto API-ju) i
 * nijedan `node:` modul. Razlog: uvozi ga `middleware.ts`, koji se izvršava u
 * Edge okruženju gdje `node:crypto` ne postoji. Provjera samog pristupnog koda
 * (koja traži `node:crypto`) živi odvojeno, u `admin-auth.ts`.
 */
export const ADMIN_COOKIE = 'treescape_admin';
const SESSION_HOURS = 12;

function secretKey(): Uint8Array {
  const secret = env.admin.sessionSecret;
  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET mora imati najmanje 32 znaka. Generiši ga sa: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Čime se korisnik dokazao — pristupnim kodom, ili kodom i telefonom.
 *
 * Zapisuje se U SAM ŽETON, i to iz jednog konkretnog razloga: kad se
 * dvofaktorska zaštita tek uključi, sesije otvorene prije toga ne smiju
 * nastaviti da rade. Inače bi kartica koju je neko ostavio otvorenu — ili
 * ukraden kolačić — narednih dvanaest sati vrijedila bez drugog faktora, a
 * upravo se od toga branimo.
 *
 * Naziv `amr` (authentication methods references) je standardan za ovu svrhu.
 */
export type AuthMethod = 'pwd' | 'otp';

export async function createSessionToken(methods: AuthMethod[] = ['pwd']): Promise<string> {
  return new SignJWT({ role: 'admin', amr: methods })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('treescape')
    .setAudience('treescape-admin')
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'treescape',
      audience: 'treescape-admin',
    });

    if (payload.role !== 'admin') return false;

    /**
     * Ako je drugi faktor podešen, žeton mora nositi trag da je i upotrijebljen.
     *
     * `env` se čita ovdje, a ne prima izvana, da se na provjeru ne može
     * zaboraviti ni na jednom pozivnom mjestu.
     */
    if (env.admin.totpSecret) {
      const amr = payload.amr;
      if (!Array.isArray(amr) || !amr.includes('otp')) return false;
    }

    return true;
  } catch {
    // Istekao, izmijenjen ili potpisan pogrešnom tajnom — sve je isto "ne".
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true, // JavaScript na stranici ne može doći do njega
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_HOURS * 3600,
};
