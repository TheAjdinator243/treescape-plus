import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-guard';
import { testGuestEmail } from '@/lib/email';
import { env, isEmailConfigured, isTelegramConfigured, platformSiteUrl } from '@/lib/env';
import { localeFromRequest } from '@/lib/i18n';
import { testTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provjera kanala obavijesti — iz administracije, bez pravljenja rezervacije.
 *
 * Ruta traži prijavu DVA puta: jednom u `proxy.ts`, jednom ovdje kroz
 * `requireAdmin`. Ovdje je to posebno bitno jer svaki poziv šalje pravi mail i
 * pravu Telegram poruku — nezaštićena, bila bi besplatan alat za zatrpavanje
 * vlasnikovog pretinca i trošenje kvote kod Resenda.
 *
 * Odgovor namjerno nosi i razlog kvara: ovo vidi samo vlasnik, a bez razloga
 * bi "ne stiže mi ništa" ostalo pogađanje.
 *
 * Token se NIKADA ne vraća — samo je li podešen.
 */
/**
 * Adresa koja završava u linkovima u mailu — i upozorenje ako je sumnjiva.
 *
 * Pogrešan `NEXT_PUBLIC_SITE_URL` je podmukao kvar: sajt radi, mail stigne, a
 * dugme u njemu vodi na Vercelovu stranicu "DEPLOYMENT_NOT_FOUND". Vidi se tek
 * kad gost klikne. Zato proba sada uvijek pokaže koja se adresa koristi.
 */
function siteUrlNote(): string {
  const platform = platformSiteUrl();
  const mismatch = platform && platform !== env.siteUrl;

  return (
    `\n\nLinkovi u mailu vode na: ${env.siteUrl}` +
    (mismatch
      ? `\nPAŽNJA: ova objava zapravo živi na ${platform}. ` +
        'NEXT_PUBLIC_SITE_URL pokazuje na drugo mjesto, pa dugme "Otvori rezervaciju" ' +
        'gostu neće raditi. Ispravi varijablu, pa Redeploy.'
      : '')
  );
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request, localeFromRequest(request));
  if (denied) return denied;

  // `?kanal=mail` šalje GOSTOV mail na vlasnikovu adresu; bez njega se
  // provjerava Telegram. Dva dugmeta, jedna ruta.
  const kanal = new URL(request.url).searchParams.get('kanal');

  if (kanal === 'mail') {
    const email = await testGuestEmail();
    return NextResponse.json({
      channel: 'email',
      configured: isEmailConfigured,
      ok: email.ok,
      detail: email.detail + siteUrlNote(),
    });
  }

  const telegram = await testTelegram();
  return NextResponse.json({
    channel: 'telegram',
    configured: isTelegramConfigured,
    ok: telegram.ok,
    detail: telegram.detail,
  });
}
