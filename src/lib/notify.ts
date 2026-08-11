import 'server-only';

import { sendOwnerGuestCancelled, sendOwnerNotification } from './email';
import { isEmailConfigured, isTelegramConfigured } from './env';
import { sendOwnerTelegram } from './telegram';
import type { Booking } from './types';

/**
 * Obavijest vlasniku da je stigao novi zahtjev — na sve kanale odjednom.
 *
 * Kanali se biraju varijablama okruženja, ne kodom: podesiš mail, podesiš
 * Telegram, ili oba. Šta je podešeno, to se javi.
 *
 * Kanali se šalju USPOREDO i nezavisno (`allSettled`) — ako mail padne, poruka
 * na telefonu svejedno stigne. Ništa odavde ne baca grešku prema pozivaocu:
 * rezervacija je već upisana u bazu i ona se ne smije poništiti zato što
 * obavijest nije prošla.
 */

/** Da upozorenje ne pravi buku u dnevniku pri svakoj rezervaciji. */
let warned = false;

function warnIfSilent(): void {
  if (isEmailConfigured || isTelegramConfigured || warned) return;
  warned = true;

  console.error(
    '[treescape] NEMA OBAVIJESTI VLASNIKU — zahtjev za rezervaciju je upisan, ali niko\n' +
      '  o njemu nije obaviješten. Vidi se samo u /admin, ako neko tamo pogleda.\n' +
      '  Podesi bar jedan kanal u Vercel → Settings → Environment Variables:\n' +
      '    • Telegram (stiže na telefon za sekundu): TELEGRAM_BOT_TOKEN i TELEGRAM_CHAT_ID\n' +
      '    • Mail: RESEND_API_KEY i OWNER_EMAIL\n' +
      '  Nakon dodavanja obavezno pokreni novu objavu (Redeploy).'
  );
}

export async function notifyOwner(booking: Booking, kind: 'cash' | 'card'): Promise<void> {
  warnIfSilent();

  await Promise.allSettled([
    sendOwnerNotification(booking, kind),
    sendOwnerTelegram(booking, kind),
  ]);
}

/**
 * Gost je sam otkazao — vlasnika treba probuditi jednako kao za novu
 * rezervaciju. Ovo je jedina promjena termina koju on ne pokreće, pa bi mu
 * inače datum tiho nestao iz planova.
 */
export async function notifyOwnerGuestCancelled(
  booking: Booking,
  reason: string
): Promise<void> {
  warnIfSilent();

  await Promise.allSettled([
    sendOwnerGuestCancelled(booking, reason),
    sendOwnerTelegram(booking, 'guest_cancelled', reason),
  ]);
}
