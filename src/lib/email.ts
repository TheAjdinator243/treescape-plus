import 'server-only';

import { Resend } from 'resend';

import { getSettings } from './data';
import { formatRange } from './dates';
import { emailTransport, env } from './env';
import { DEFAULT_LOCALE, directionOf, getStrings, normalizeLocale, type Locale } from './i18n';
import { formatMoney } from './pricing';
import { GOOGLE_MAPS_URL } from './location';
import { bookingReference } from './reference';
import type { Booking } from './types';

/** Ime pošiljaoca — isto ono koje stoji na sajtu, a ne zaseban natpis. */
const SENDER_NAME = getStrings(DEFAULT_LOCALE).site.name;

/**
 * Mailovi su NEOBAVEZNI. Bez ijednog podešenog puta aplikacija radi potpuno
 * normalno — samo se ništa ne šalje. Nikada ne rušimo rezervaciju zbog toga
 * što mail nije prošao: termin je već upisan, to je važnije od obavijesti.
 */
async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const transport = emailTransport();

  if (!transport) return { ok: false, detail: missingTransportDetail() };

  try {
    const result =
      transport === 'gmail'
        ? await sendViaGmail(to, subject, html)
        : await sendViaResend(to, subject, html);

    if (!result.ok) {
      console.error('[treescape] slanje maila nije uspjelo:', result.detail);

      /**
       * Kad padne Resend, a Gmail je bio napola podešen, to je gotovo uvijek
       * pravi uzrok: nedostaje jedna od dvije varijable, pa se tiho uzeo drugi
       * put. Bez ove rečenice se traži greška u Resendu, gdje je nema.
       */
      if (transport === 'resend' && (env.gmail.user || env.gmail.appPassword)) {
        const missing = !env.gmail.user ? 'GMAIL_USER' : 'GMAIL_APP_PASSWORD';
        return {
          ...result,
          detail:
            `${result.detail}\n\nUZGRED: Gmail je napola podešen — nedostaje ${missing}, ` +
            'pa se mail poslao preko Resenda. Dodaj i tu varijablu, pa Redeploy.',
        };
      }
    }

    return result;
  } catch (err) {
    console.error('[treescape] slanje maila nije uspjelo:', err);
    return { ok: false, detail: `Slanje nije prošlo (${transport}): ${String(err)}` };
  }
}

/**
 * Šta tačno nedostaje da bi mail mogao otići.
 *
 * "Mail nije podešen" je tačno, ali ne pomaže: onaj ko je varijable upravo
 * unio u Vercel s pravom pomisli da laže. Zato se ispisuje IMENOM svaka od njih
 * i je li je ova objava vidjela ili nije.
 *
 * Vrijednosti se nikada ne ispisuju — samo postoji ili ne postoji.
 */
function missingTransportDetail(): string {
  const vidi = (v: string | undefined) => (v ? 'IMA' : 'NEMA');

  return (
    'Mail nije podešen — ova objava ne vidi nijedan put za slanje.\n\n' +
    `  GMAIL_USER: ${vidi(env.gmail.user)}\n` +
    `  GMAIL_APP_PASSWORD: ${vidi(env.gmail.appPassword)}\n` +
    `  RESEND_API_KEY: ${vidi(env.email.apiKey)}\n` +
    `  OWNER_EMAIL: ${vidi(env.email.ownerEmail)}\n\n` +
    'Za Gmail trebaju PRVA DVA, oba. Ako gore piše NEMA a ti si ih dodao, ' +
    'skoro uvijek je jedno od ovoga:\n' +
    '  1) nije pokrenut Redeploy — varijable se čitaju pri gradnji, stara objava ih ne vidi;\n' +
    '  2) varijabla je snimljena samo za Preview ili Development, a ne za Production;\n' +
    '  3) ime je pogrešno prepisano — mora biti tačno GMAIL_APP_PASSWORD.'
  );
}

/**
 * Gmail preko SMTP-a.
 *
 * `nodemailer` se uvozi tek ovdje, i to dinamički: bez toga bi cijela
 * biblioteka ušla u svaki serverski paket koji ikako dodirne ovu datoteku,
 * uključujući i one koji nikad ne pošalju nijedan mail.
 *
 * Pošiljalac MORA biti ista adresa s koje se prijavljujemo. Google svaku drugu
 * tiho prepiše u svoju, pa bi `EMAIL_FROM` ovdje samo lagao o tome šta gost
 * zaista vidi u pretincu.
 */
async function sendViaGmail(to: string, subject: string, html: string): Promise<SendResult> {
  const { user, appPassword } = env.gmail;
  if (!user || !appPassword) return { ok: false, detail: 'Gmail nije podešen.' };

  const lozinka = ocistiLozinku(appPassword);

  const nodemailer = (await import('nodemailer')).default;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: lozinka },

    /**
     * Rokovi nisu ukras — nodemailer ih sam po sebi NEMA.
     *
     * Ovo se vidjelo tek na probi: kad se do Googlea ne može, `sendMail` ne
     * javi grešku nego jednostavno visi. Na Vercelu bi to značilo funkciju
     * koja ostaje živa dok je platforma ne ubije, i to pri svakoj rezervaciji
     * — jer obavijesti idu kroz `after()`, dakle nakon što je gost već dobio
     * odgovor i niko više ne gleda.
     *
     * Ovako padne za desetak sekundi, s jasnim razlogom u dnevniku.
     */
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    await transporter.sendMail({
      from: `${SENDER_NAME} <${user}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    return { ok: false, detail: `Gmail je odbio: ${String(err)}${gmailHint(err, user, lozinka)}` };
  }

  return { ok: true, detail: `Poslano na ${to} (Gmail).` };
}

/**
 * Lozinka za aplikacije, očišćena od onoga što se uz nju zalijepi pri prepisu.
 *
 * Dvije stvari, obje viđene uživo:
 *
 * 1. RAZMACI. Google je pokazuje u četiri grupe po četiri znaka
 *    ("alzx zksq yxuc odbp"), pa se tako i prepiše. Sama lozinka ih nema.
 * 2. NAVODNICI. Raw editor u Railway-u i uvoz .env datoteke rado ostave
 *    `"alzx..."` s navodnicima kao dijelom vrijednosti.
 *
 * Oba slučaja Google odbije istom porukom — "Username and Password not
 * accepted" — koja zvuči kao pogrešna lozinka i šalje čovjeka da pravi novu.
 * Nova onda pukne na isti način.
 */
function ocistiLozinku(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
}

/** Koliko znakova ima ispravna lozinka za aplikacije. */
const DUZINA_LOZINKE = 16;

/**
 * Googleova poruka o lošoj prijavi ne kaže ŠTA je loše. Ovo nabraja uzroke
 * po vjerovatnoći, a prvo provjeri ono što se može provjeriti odavde: dužinu.
 * Sama lozinka se nikada ne ispisuje — samo koliko znakova ima.
 */
function gmailHint(err: unknown, user: string, lozinka: string): string {
  if (!/BadCredentials|Invalid login|535/i.test(String(err))) return '';

  const duzina =
    lozinka.length === DUZINA_LOZINKE
      ? ''
      : `\n\nPRVO OVO: lozinka ima ${lozinka.length} znakova, a treba tačno ${DUZINA_LOZINKE}. ` +
        'Znači da nije prepisana cijela, ili je uz nju ušlo nešto što ne pripada. ' +
        'Prepiši je ponovo, bez navodnika.';

  return (
    `${duzina}\n\nGoogle ne kaže šta je loše, pa po redu vjerovatnoće:\n` +
    `  1) lozinka je poništena — ako si napravio novu, stara odmah prestaje raditi;\n` +
    `  2) GMAIL_USER (${user}) nije nalog na kojem je lozinka napravljena — mora biti isti;\n` +
    '  3) dvostruka provjera je isključena na nalogu — tada lozinke za aplikacije ne rade;\n' +
    '  4) prepisana je obična lozinka naloga umjesto one za aplikacije od 16 znakova.'
  );
}

async function sendViaResend(to: string, subject: string, html: string): Promise<SendResult> {
  const resend = new Resend(env.email.apiKey);
  const { error } = await resend.emails.send({ from: env.email.from, to, subject, html });

  if (error)
    return { ok: false, detail: `Resend je odbio: ${error.message}${resendHint(error.message)}` };

  return { ok: true, detail: `Poslano na ${to} (Resend).${resendFalsePositive()}` };
}

/**
 * Zelena poruka koja ne znači ono što izgleda da znači.
 *
 * Probni mail ide na OWNER_EMAIL — a to je tačno ona adresa kojoj Resend
 * dozvoljava slanje i bez potvrđenog domena. Proba dakle prođe, dugme pozeleni,
 * i sve djeluje riješeno — dok prvom pravom gostu mail ne stigne, jer njegova
 * adresa nije vlasnikova.
 *
 * To je najgori mogući ishod: kvar koji se ne vidi dok ne bude kasno. Zato uz
 * uspjeh ide i upozorenje kad se šalje s Resendove zajedničke adrese.
 */
function resendFalsePositive(): string {
  if (!/@resend\.dev/i.test(env.email.from)) return '';

  return (
    '\n\nALI PAŽNJA: ovo NE dokazuje da gost dobija mail. Šalje se s ' +
    'onboarding@resend.dev, a s te adrese Resend prima samo tvoju vlastitu — ' +
    'baš onu na koju je proba i otišla. Pravom gostu neće stići.\n' +
    'Da bi stizalo svima: podesi GMAIL_USER i GMAIL_APP_PASSWORD (odmah, bez domena), ' +
    'ili potvrdi vlastiti domen na resend.com/domains i upiši ga u EMAIL_FROM.'
  );
}

/**
 * Šta Resendova odbijenica zapravo znači.
 *
 * Njegove poruke su tačne, ali objašnjavaju samo svoj svijet — ne kažu da
 * postoji i drugi put. Najgori je slučaj kad neko pokuša slati s Gmail adrese
 * PREKO Resenda: Resend traži potvrdu domena gmail.com, što niko ne može
 * uraditi. Poruka zvuči kao korak koji fali, a zapravo je slijepa ulica.
 */
function resendHint(message: string): string {
  const gmailUrl = /(?:@|\s)(gmail|googlemail)\.com/i.test(env.email.from);

  if (/not verified|verify your domain/i.test(message)) {
    return gmailUrl
      ? '\n\nEMAIL_FROM je Gmail adresa, a Gmail se preko Resenda ne može slati — domen ' +
          'gmail.com nije tvoj da ga potvrdiš. Za slanje s Gmaila podesi GMAIL_USER i ' +
          'GMAIL_APP_PASSWORD (tada Resend uopće ne učestvuje), pa pokreni Redeploy.'
      : '\n\nEMAIL_FROM mora biti s domena koji je potvrđen na resend.com/domains. ' +
          'Ako domen još nemaš, podesi GMAIL_USER i GMAIL_APP_PASSWORD — Gmail ne traži domen.';
  }

  if (/testing emails|own email/i.test(message)) {
    return (
      '\n\nDok domen nije potvrđen, Resend prima samo adresu s kojom je nalog otvoren. ' +
      'Pravom gostu ne prolazi. Gmail prolazi odmah.'
    );
  }

  return '';
}

/**
 * Zašto `send` vraća razlog umjesto da samo šuti.
 *
 * Pozivaocima iz toka rezervacije je i dalje svejedno — oni ovo namjerno
 * ignorišu, jer neuspio mail ne smije oboriti već upisanu rezervaciju. Ali
 * probno slanje iz administracije mora znati ŠTA je pošlo po zlu: bez toga
 * "gostu ne stiže mail" ostaje pogađanje između pogrešnog ključa, nepotvrđene
 * domene i Resendovog ograničenja na vlastitu adresu.
 */
export interface SendResult {
  ok: boolean;
  detail: string;
}

/**
 * Jezik na kojem je gost rezervisao.
 *
 * Stoji uz rezervaciju u bazi (migracija 0003) baš zato što se mailovi šalju i
 * danima kasnije, iz administracije — tada od gosta nema ni kolačića ni
 * zaglavlja preglednika, samo ovaj red u tabeli.
 */
function bookingLocale(booking: Pick<Booking, 'locale'>): Locale {
  return normalizeLocale(booking.locale) ?? DEFAULT_LOCALE;
}

function layout(locale: Locale, title: string, body: string): string {
  const t = getStrings(locale);
  const dir = directionOf(locale);
  // Arapski mail mora biti okrenut zdesna nalijevo, a i poravnanje teksta
  // ide uz smjer — mail klijenti ne nasljeđuju ništa od sajta.
  const align = dir === 'rtl' ? 'right' : 'left';

  return `<!doctype html>
<html lang="${locale}" dir="${dir}"><body style="margin:0;background:#faf7f1;font-family:system-ui,-apple-system,sans-serif;color:#221d18;text-align:${align}">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:22px;font-weight:600;color:#1f4436;margin:0 0 24px">${t.site.name}</p>
    <div style="background:#fff;border:1px solid #e9dcc7;border-radius:16px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px;color:#1f4436">${title}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#8d8377;margin:24px 0 0;text-align:center">
      ${t.site.name} · ${t.site.tagline}
    </p>
  </div>
</body></html>`;
}

/** Naslov maila uvijek nosi i ime kuće — inače se izgubi u pretincu. */
function subject(locale: Locale, line: string): string {
  return `${line} — ${getStrings(locale).site.name}`;
}

function detailRows(booking: Booking, locale: Locale): string {
  const t = getStrings(locale);
  const dir = directionOf(locale);
  const start = dir === 'rtl' ? 'right' : 'left';
  const end = dir === 'rtl' ? 'left' : 'right';

  const stay = formatRange(booking.start_date, booking.end_date, locale);
  const total = formatMoney(
    booking.total_cents,
    booking.price_breakdown?.currencySymbol ?? '€',
    locale
  );

  const row = (label: string, value: string, mono = false) =>
    `<tr>
       <td style="padding:8px 0;color:#6b6157;text-align:${start}">${label}</td>
       <td style="padding:8px 0;text-align:${end};font-weight:600${mono ? ';font-family:monospace' : ''}">${value}</td>
     </tr>`;

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row(t.email.rowStay, stay)}
      ${row(t.email.rowGuests, String(booking.guests ?? '—'))}
      ${row(t.email.rowAmount, total)}
      ${row(t.email.rowReference, bookingReference(booking.booking_public_link), true)}
    </table>`;
}

/** Uvodni pasus: "Poštovani/a Ime, …" pa poruka. */
function intro(booking: Booking, locale: Locale, message: string): string {
  const t = getStrings(locale);

  return `<p style="font-size:15px;line-height:1.6;color:#453d35;margin:0 0 20px">
            ${t.email.greeting(booking.guest_name ?? '')} ${message}
          </p>`;
}

/**
 * Dugme s linkom na Google Mape.
 *
 * Ide SAMO u mailove za potvrđen termin, i to namjerno. Sajt i česta pitanja
 * izričito kažu da adresa i uputstva stižu "nakon potvrde rezervacije", pa bi
 * slanje uz zahtjev koji tek čeka odluku bilo protivno onome što gostu piše.
 *
 * Do sada je obećanje stajalo u mailu, ali link nije — gost je dobio rečenicu
 * da mu uputstva stižu, i ništa uz nju.
 */
function mapsButton(locale: Locale): string {
  const t = getStrings(locale);

  return `<p style="margin:24px 0 0">
            <a href="${GOOGLE_MAPS_URL}" style="display:inline-block;background:#2a5a47;color:#faf7f1;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">
              ${t.location.openInMaps}
            </a>
          </p>`;
}

/**
 * Razlog koji je domaćin upisao pri odbijanju ili otkazivanju.
 *
 * Razlog je NEOBAVEZAN — domaćin ga smije preskočiti, i tada ovog bloka
 * jednostavno nema. Prazan okvir s natpisom "Razlog:" i ničim ispod bio bi
 * gori od izostavljanja.
 *
 * Tekst piše čovjek, pa se prije prikaza pobjegnu znakovi koje bi HTML
 * pročitao kao oznake — inače bi "<" usred rečenice pojeo ostatak maila.
 */
function reasonBlock(locale: Locale, reason: string | null | undefined): string {
  const text = reason?.trim();
  if (!text) return '';

  const t = getStrings(locale);
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<p style="font-size:14px;line-height:1.6;color:#453d35;background:#f4ede0;padding:14px 16px;border-radius:10px;margin:20px 0 0">
            <strong>${t.email.reasonLabel}:</strong><br>${escaped}
          </p>`;
}

/**
 * Vrijeme prijave i odjave, iz postavki.
 *
 * Čita se iz baze u trenutku slanja, a ne pamti uz rezervaciju — kad vlasnik
 * promijeni sate u administraciji, promijene se svuda: na sajtu, na potvrdi, u
 * čestim pitanjima i u mailu koji tek ide.
 *
 * Ovo je i jedino mjesto koje gostu objašnjava zašto dan odlaska jednog i dan
 * dolaska drugog gosta smiju biti isti dan.
 */
async function stayTimes(locale: Locale): Promise<string> {
  const settings = await getSettings();
  const t = getStrings(locale);

  return footNote(t.booking.timesNote(settings.checkin_time, settings.checkout_time));
}

/**
 * Dugme koje vodi na gostovu stranicu s rezervacijom.
 *
 * Ide u SVAKI mail gostu, bez obzira na ishod — i u onaj o odbijanju. Ta
 * stranica uvijek pokazuje trenutno stanje, pa gost s jednim linkom u pretincu
 * zna gdje provjeriti, umjesto da traži stari mail ili zove telefonom. Odatle
 * i sam otkazuje.
 *
 * Adresa nosi `booking_public_link`, a NE `id` iz baze: token je dug i nasumičan, pa
 * se ne može pogoditi, a i ne odaje koliko rezervacija kuća uopće ima.
 */
function bookingButton(locale: Locale, booking: Booking): string {
  const t = getStrings(locale);
  const url = `${env.siteUrl}/rezervacija/${booking.booking_public_link}`;

  return `<p style="margin:24px 0 0">
            <a href="${url}" style="display:inline-block;background:#2a5a47;color:#faf7f1;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">
              ${t.email.openBooking}
            </a>
          </p>`;
}

function footNote(text: string): string {
  return `<p style="font-size:14px;line-height:1.6;color:#6b6157;margin:20px 0 0">${text}</p>`;
}

/**
 * Probni mail GOSTU — isti onaj koji stigne nakon zahtjeva za gotovinu.
 *
 * Šalje se na `OWNER_EMAIL`, a ne na izmišljenu adresu, i to s razlogom: dok
 * domen nije potvrđen u Resend-u, Resend dozvoljava slanje SAMO na adresu s
 * kojom je nalog otvoren. Proba na tuđu adresu bi tada pala s greškom koja
 * djeluje kao kvar, a nije.
 *
 * Podaci u probnom mailu su očigledno lažni; jedini tekst dolazi iz rječnika,
 * kao i u pravom mailu.
 */
export async function testGuestEmail(): Promise<SendResult> {
  if (!env.email.ownerEmail) {
    return { ok: false, detail: 'Nedostaje OWNER_EMAIL — nema se gdje poslati proba.' };
  }

  const locale = DEFAULT_LOCALE;
  const t = getStrings(locale);
  const today = new Date();
  const iso = (offsetDays: number) =>
    new Date(today.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);

  const primjer: Booking = {
    id: 1,
    booking_public_link: 'probaproba',
    guest_name: t.booking.namePlaceholder,
    guest_email: env.email.ownerEmail,
    guest_phone: null,
    guests: 2,
    note: null,
    start_date: iso(7),
    end_date: iso(9),
    status: 'pending_cash',
    payment_method: 'cash',
    total_cents: 60000,
    currency: 'BAM',
    price_breakdown: null,
    payment_reference: null,
    payment_id: null,
    hold_expires_at: null,
    admin_note: null,
    locale,
    created_at: today.toISOString(),
    updated_at: today.toISOString(),
  };

  return send(
    env.email.ownerEmail,
    subject(locale, t.email.cashRequestSubject),
    layout(
      locale,
      t.email.cashRequestTitle,
      `${intro(primjer, locale, t.email.cashRequestBody)}
       ${detailRows(primjer, locale)}
       ${footNote(t.email.payOnArrival)}`
    )
  );
}

/** Gostu — rezervacija je plaćena i potvrđena. */
export async function sendGuestConfirmation(booking: Booking): Promise<void> {
  if (!booking.guest_email) return;

  const locale = bookingLocale(booking);
  const t = getStrings(locale);

  await send(
    booking.guest_email,
    subject(locale, t.email.confirmedSubject),
    layout(
      locale,
      t.email.confirmedTitle,
      `${intro(booking, locale, t.email.confirmedBody)}
       ${detailRows(booking, locale)}
       ${await stayTimes(locale)}
       ${footNote(t.email.addressLater)}
       ${bookingButton(locale, booking)}
       ${mapsButton(locale)}`
    )
  );
}

/** Gostu — zahtjev za plaćanje gotovinom je zaprimljen. */
export async function sendGuestCashRequest(booking: Booking): Promise<void> {
  if (!booking.guest_email) return;

  const locale = bookingLocale(booking);
  const t = getStrings(locale);

  await send(
    booking.guest_email,
    subject(locale, t.email.cashRequestSubject),
    layout(
      locale,
      t.email.cashRequestTitle,
      `${intro(booking, locale, t.email.cashRequestBody)}
       ${detailRows(booking, locale)}
       ${await stayTimes(locale)}
       ${footNote(t.email.payOnArrival)}
       ${bookingButton(locale, booking)}`
    )
  );
}

/** Gostu — domaćin je potvrdio zahtjev za gotovinu. */
export async function sendGuestCashApproved(booking: Booking): Promise<void> {
  if (!booking.guest_email) return;

  const locale = bookingLocale(booking);
  const t = getStrings(locale);

  await send(
    booking.guest_email,
    subject(locale, t.email.cashApprovedSubject),
    layout(
      locale,
      t.email.cashApprovedTitle,
      `${intro(booking, locale, t.email.cashApprovedBody)}
       ${detailRows(booking, locale)}
       ${await stayTimes(locale)}
       ${footNote(t.email.payOnArrival)}
       ${bookingButton(locale, booking)}
       ${mapsButton(locale)}`
    )
  );
}

/**
 * Vlasniku — gost je SAM otkazao svoju rezervaciju.
 *
 * Ovo je jedina promjena termina koju vlasnik ne pokreće, pa je i jedina o
 * kojoj inače ne bi imao pojma: datum bi se tiho oslobodio u kalendaru, a on
 * bi i dalje računao na tog gosta.
 */
export async function sendOwnerGuestCancelled(
  booking: Booking,
  reason: string
): Promise<void> {
  if (!env.email.ownerEmail) return;

  const locale = DEFAULT_LOCALE;
  const t = getStrings(locale);

  await send(
    env.email.ownerEmail,
    subject(locale, t.email.ownerGuestCancelledTitle),
    layout(
      locale,
      t.email.ownerGuestCancelledTitle,
      `${detailRows(booking, locale)}
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #e9dcc7">
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowGuest}</td><td style="padding:8px 0;text-align:right">${booking.guest_name ?? '—'}</td></tr>
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowEmail}</td><td style="padding:8px 0;text-align:right">${booking.guest_email ?? '—'}</td></tr>
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowPhone}</td><td style="padding:8px 0;text-align:right">${booking.guest_phone ?? '—'}</td></tr>
       </table>
       ${reasonBlock(locale, reason)}`
    )
  );
}

/**
 * Gostu — domaćin je otkazao VEĆ POTVRĐENU rezervaciju.
 *
 * Ovo nije isto što i odbijen zahtjev, i zato ima svoj tekst. Odbijen zahtjev
 * nikad nije ni bio potvrđen; ovdje je gost dobio potvrdu, možda već kupio
 * kartu i rasporedio godišnji — pa mu se otkazivanje mora reći drugačije i
 * obavezno reći.
 *
 * Do sada se otkazivanje slalo NIGDJE: termin bi se u bazi oslobodio, a gost
 * bi i dalje mislio da dolazi.
 */
export async function sendGuestCancelled(booking: Booking, reason?: string | null): Promise<void> {
  if (!booking.guest_email) return;

  const locale = bookingLocale(booking);
  const t = getStrings(locale);

  await send(
    booking.guest_email,
    subject(locale, t.email.cancelledSubject),
    layout(
      locale,
      t.email.cancelledTitle,
      `${intro(booking, locale, t.email.cancelledBody)}
       ${detailRows(booking, locale)}
       ${reasonBlock(locale, reason)}
       ${bookingButton(locale, booking)}`
    )
  );
}

/** Gostu — domaćin je odbio zahtjev. */
export async function sendGuestCashRejected(
  booking: Booking,
  reason?: string | null
): Promise<void> {
  if (!booking.guest_email) return;

  const locale = bookingLocale(booking);
  const t = getStrings(locale);

  await send(
    booking.guest_email,
    subject(locale, t.email.cashRejectedSubject),
    layout(
      locale,
      t.email.cashRejectedTitle,
      `${intro(booking, locale, t.email.cashRejectedBody)}
       ${detailRows(booking, locale)}
       ${reasonBlock(locale, reason)}
       ${bookingButton(locale, booking)}`
    )
  );
}

/**
 * Vlasniku — stigla je nova rezervacija ili zahtjev.
 *
 * Ovaj mail ide vlasniku kuće, pa ide na jeziku kuće, a ne na jeziku gosta.
 * Gostov jezik se ipak vidi — u redu s podacima o gostu.
 */
export async function sendOwnerNotification(
  booking: Booking,
  kind: 'cash' | 'card'
): Promise<void> {
  if (!env.email.ownerEmail) return;

  const locale = DEFAULT_LOCALE;
  const t = getStrings(locale);

  const title = kind === 'cash' ? t.email.ownerCashTitle : t.email.ownerCardTitle;
  const hint = kind === 'cash' ? t.email.ownerCashHint : '';

  const action =
    kind === 'card'
      ? ''
      : `<p style="margin:20px 0 0">
           <a href="${env.siteUrl}/admin" style="display:inline-block;background:#2a5a47;color:#faf7f1;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">
             ${t.email.ownerOpenAdmin}
           </a>
         </p>
         <p style="font-size:13px;color:#b7791f;margin:16px 0 0">${hint}</p>`;

  const guestLocale = bookingLocale(booking);
  const languageName = getStrings(locale).language.names[guestLocale];

  await send(
    env.email.ownerEmail,
    subject(locale, title),
    layout(
      locale,
      title,
      `${detailRows(booking, locale)}
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px;border-top:1px solid #e9dcc7">
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowGuest}</td><td style="padding:8px 0;text-align:right">${booking.guest_name ?? '—'}</td></tr>
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowEmail}</td><td style="padding:8px 0;text-align:right">${booking.guest_email ?? '—'}</td></tr>
         <tr><td style="padding:8px 0;color:#6b6157">${t.email.rowPhone}</td><td style="padding:8px 0;text-align:right">${booking.guest_phone ?? '—'}</td></tr>
         <tr><td style="padding:8px 0;color:#6b6157">${t.language.label}</td><td style="padding:8px 0;text-align:right">${languageName}</td></tr>
       </table>
       ${booking.note ? `<p style="font-size:14px;color:#453d35;background:#f4ede0;padding:12px 16px;border-radius:10px;margin:16px 0 0"><strong>${t.email.rowNote}:</strong><br>${booking.note}</p>` : ''}
       ${action}`
    )
  );
}
