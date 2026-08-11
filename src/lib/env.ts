/**
 * Čitanje varijabli okruženja na jednom mjestu.
 *
 * Aplikacija je namjerno napravljena tako da se PODIŽE i bez ijednog ključa —
 * tako možeš vidjeti cijeli sajt prije nego otvoriš ijedan nalog.
 * Ono što nedostaje se javlja jasnom porukom tek kad se stvarno zatreba.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

/** Obavezan ključ — baca jasnu grešku umjesto zagonetnog "undefined". */
function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(
      `Nedostaje varijabla okruženja: ${name}. ` +
        `Dodaj je u .env.local (pogledaj .env.example) ili u Vercel → Settings → Environment Variables.`
    );
  }
  return value;
}

/** Bez kose crte na kraju — inače link postane `.../ /rezervacija/...`. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  // Platforme daju goli domen ("moj-sajt.vercel.app"), bez sheme.
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Adresa sajta — ona koja završi u linkovima u mailu.
 *
 * Ovo je jedini podatak koji, kad je pogrešan, ne pokvari ništa na sajtu nego
 * TEK u gostovom pretincu: sve radi, mail stigne, a dugme u njemu vodi na
 * Vercelovu stranicu "DEPLOYMENT_NOT_FOUND". Otkrije se tek kad gost klikne.
 *
 * Zato se ne oslanja samo na `NEXT_PUBLIC_SITE_URL`. Ako on nije podešen,
 * uzima se ono što platforma sama zna o sebi — na Vercelu produkcijski domen,
 * na Railway-u javni domen. Tako je pogrešan link moguć samo ako je neko
 * IZRIČITO upisao pogrešnu adresu, a ne zato što je zaboravio varijablu.
 */
function resolveSiteUrl(): string {
  const explicit = optional('NEXT_PUBLIC_SITE_URL');
  if (explicit) return normalizeUrl(explicit);

  // Vercel: stalni produkcijski domen ima prednost nad adresom pojedine objave,
  // koja se mijenja pri svakoj gradnji i gostu ništa ne znači.
  const platform =
    optional('VERCEL_PROJECT_PRODUCTION_URL') ??
    optional('RAILWAY_PUBLIC_DOMAIN') ??
    optional('VERCEL_URL');

  if (platform) return normalizeUrl(platform);

  return 'http://localhost:3000';
}

export const env = {
  supabase: {
    url: optional('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  },
  /**
   * Test način plaćanja — potvrđuje rezervaciju bez ijednog pravog centa.
   * Postoji da se cijeli tok može isprobati. Uključuje se samo izričito.
   */
  enableTestPayments: optional('ENABLE_TEST_PAYMENTS') === 'true',
  admin: {
    accessCode: optional('ADMIN_ACCESS_CODE'),
    sessionSecret: optional('ADMIN_SESSION_SECRET'),
    /**
     * Drugi faktor — tajna aplikacije na telefonu (base32).
     *
     * Dok stoji prazno, prijava traži samo pristupni kod. Čim se postavi,
     * traži i šestocifreni broj, a sve ranije otvorene sesije prestaju
     * vrijediti (vidi `admin-session.ts`) — inače bi kartica otvorena prije
     * uključivanja dvofaktorske zaštite nastavila raditi bez nje.
     *
     * Pravi se sa: npm run totp
     */
    totpSecret: optional('ADMIN_TOTP_SECRET'),
  },
  cronSecret: optional('CRON_SECRET'),
  siteUrl: resolveSiteUrl(),
  email: {
    apiKey: optional('RESEND_API_KEY'),
    from: optional('EMAIL_FROM') ?? 'TreeScape <onboarding@resend.dev>',
    ownerEmail: optional('OWNER_EMAIL'),
  },
  /**
   * Gmail — mail se šalje s obične Google adrese, preko Googleovog servera.
   *
   * Ovo NIJE isto što i Resend s nepotvrđenim domenom. Resend do potvrde domena
   * prima samo adresu s kojom je nalog otvoren, pa se pravom gostu ne može
   * pisati. Gmail može odmah, svakome — jer adresa s koje se šalje već postoji
   * i već je Googleova.
   *
   * Lozinka NIJE ona kojom se prijavljuješ na Google. To je zasebna
   * "lozinka za aplikacije" od 16 znakova, koja se pravi tek kad je na nalogu
   * uključena dvostruka provjera, i koja se može poništiti bez diranja naloga.
   */
  gmail: {
    user: optional('GMAIL_USER'),
    appPassword: optional('GMAIL_APP_PASSWORD'),
  },
  /**
   * Telegram — obavijest vlasniku koja stigne na telefon za koju sekundu.
   *
   * Postoji uz mail, a ne umjesto njega: mail traži verifikovan domen i lako
   * završi u promocijama, a zahtjev za gotovinu vrijedi samo dok se termin
   * drži. Telegram je besplatan i ne traži ništa osim bota.
   */
  telegram: {
    botToken: optional('TELEGRAM_BOT_TOKEN'),
    chatId: optional('TELEGRAM_CHAT_ID'),
  },
} as const;

/** Je li baza uopće podešena? Ako nije, sajt radi na demo podacima. */
export const isDatabaseConfigured = Boolean(
  env.supabase.url && env.supabase.anonKey && env.supabase.serviceRoleKey
);

/**
 * Kojim putem ide mail.
 *
 * Gmail ima prednost kad je podešen: ne traži vlastiti domen, a šalje bilo
 * kome. Resend ostaje za kasnije — kad kuća dobije svoj domen, pa mailovi
 * krenu s `rezervacije@treescape.ba` umjesto s lične Gmail adrese.
 *
 * `null` znači da mailova jednostavno nema. To nije greška: sajt radi i bez
 * njih, a obavijesti vlasniku svejedno stižu na Telegram.
 */
export type EmailTransport = 'gmail' | 'resend';

export function emailTransport(): EmailTransport | null {
  if (env.gmail.user && env.gmail.appPassword) return 'gmail';
  if (env.email.apiKey) return 'resend';
  return null;
}

export const isEmailConfigured = emailTransport() !== null;

/**
 * Adresa koju platforma sama prijavljuje o sebi.
 *
 * Služi samo za provjeru: ako je `NEXT_PUBLIC_SITE_URL` upisan RUČNO i ne
 * poklapa se s ovim, linkovi u mailu vode na pogrešno mjesto — a to se inače
 * otkrije tek kad gost klikne i dobije "DEPLOYMENT_NOT_FOUND".
 */
export function platformSiteUrl(): string | null {
  const platform =
    optional('VERCEL_PROJECT_PRODUCTION_URL') ??
    optional('RAILWAY_PUBLIC_DOMAIN') ??
    optional('VERCEL_URL');

  return platform ? normalizeUrl(platform) : null;
}

export const isTelegramConfigured = Boolean(env.telegram.botToken && env.telegram.chatId);

/** Traži li prijava i kod s telefona. */
export const isTwoFactorConfigured = Boolean(env.admin.totpSecret);

export { required as requireEnv };
