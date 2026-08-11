import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Booking } from './types';

/**
 * Obavijest vlasniku preko Telegrama.
 *
 * Sve se ovdje vrti oko jednog pravila: obavijest smije pasti, rezervacija ne.
 * Zato nijedan test ne provjerava samo "je li poslano" nego i šta se desi kad
 * NE prođe — jer to je trenutak u kojem se lako izgubi već upisan termin.
 */

const REZERVACIJA: Booking = {
  id: 1,
  booking_public_link: 'abcdef1234567890',
  guest_name: 'Amina Hodžić',
  guest_email: 'amina@primjer.ba',
  guest_phone: '+387 61 123 456',
  guests: 4,
  note: null,
  start_date: '2026-10-10',
  end_date: '2026-10-12',
  status: 'pending_cash',
  payment_method: 'cash',
  total_cents: 60000,
  currency: 'BAM',
  price_breakdown: null,
  payment_reference: null,
  payment_id: null,
  hold_expires_at: null,
  admin_note: null,
  locale: 'en',
  created_at: '2026-08-07T10:00:00Z',
  updated_at: '2026-08-07T10:00:00Z',
};

/**
 * `env.ts` čita `process.env` jednom, pri uvozu. Zato se za svaki slučaj mora
 * očistiti keš modula i uvesti nanovo — inače bi svi testovi dijelili ključeve
 * onoga koji se prvi izvršio.
 */
async function ucitaj(kljucevi: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [ime, vrijednost] of Object.entries(kljucevi)) vi.stubEnv(ime, vrijednost);
  return import('./telegram');
}

const PODESENO = {
  TELEGRAM_BOT_TOKEN: '123456:TEST-TOKEN',
  TELEGRAM_CHAT_ID: '987654321',
};

/** Tijelo poslanog zahtjeva, već raspakovano iz JSON-a. */
function poslanoTijelo(poziv: ReturnType<typeof vi.fn>): { text: string; chat_id: string } {
  const [, init] = poziv.mock.calls[0] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendOwnerTelegram', () => {
  it('bez ključeva ne dira mrežu', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj({});

    expect(await sendOwnerTelegram(REZERVACIJA, 'cash')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('nedovoljno je imati samo token, bez broja razgovora', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj({ TELEGRAM_BOT_TOKEN: '123456:TEST-TOKEN' });

    expect(await sendOwnerTelegram(REZERVACIJA, 'cash')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('šalje poruku s podacima o gostu i terminu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj(PODESENO);

    expect(await sendOwnerTelegram(REZERVACIJA, 'cash')).toBe(true);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://api.telegram.org/bot123456:TEST-TOKEN/sendMessage');

    const tijelo = poslanoTijelo(fetchMock);
    expect(tijelo.chat_id).toBe('987654321');
    expect(tijelo.text).toContain('Amina Hodžić');
    expect(tijelo.text).toContain('+387 61 123 456');
    // Oznaka rezervacije — po njoj vlasnik nađe zahtjev u administraciji.
    expect(tijelo.text).toContain('ABCDEF12');
    // Zahtjev za gotovinu nosi i link na administraciju, jer traži odluku.
    expect(tijelo.text).toContain('/admin');
  });

  it('javlja na kojem je jeziku gost rezervisao', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj(PODESENO);
    await sendOwnerTelegram(REZERVACIJA, 'cash');

    // Poruka vlasniku je na bosanskom, ali mora reći da gost govori engleski —
    // inače ga vlasnik nazove i ne razumiju se.
    expect(poslanoTijelo(fetchMock).text).toContain('English');
  });

  it('pobjegne znakove koje bi Telegram pokušao pročitati kao oznake', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj(PODESENO);

    await sendOwnerTelegram(
      { ...REZERVACIJA, guest_name: 'Ana & <b>Marko</b>', note: 'dolazimo <kasno>' },
      'cash'
    );

    const { text } = poslanoTijelo(fetchMock);
    // Da ovo ostane sirovo, Telegram bi cijelu obavijest odbio greškom o
    // parsiranju — i vlasnik ne bi saznao ni da zahtjev postoji.
    expect(text).toContain('Ana &amp; &lt;b&gt;Marko&lt;/b&gt;');
    expect(text).toContain('dolazimo &lt;kasno&gt;');
    expect(text).not.toContain('<b>Marko');
  });

  it('prazna polja pokazuje kao crticu, a ne kao "undefined"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendOwnerTelegram } = await ucitaj(PODESENO);
    await sendOwnerTelegram({ ...REZERVACIJA, guest_phone: null, guests: null }, 'cash');

    expect(poslanoTijelo(fetchMock).text).not.toContain('undefined');
  });

  it('odbijenicu Telegrama ne pretvara u grešku', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"description":"chat not found"}', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    const greska = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendOwnerTelegram } = await ucitaj(PODESENO);

    expect(await sendOwnerTelegram(REZERVACIJA, 'cash')).toBe(false);
    // Razlog mora završiti u dnevniku — bez njega se ovakva greška traži satima.
    expect(greska.mock.calls[0]?.[0]).toContain('chat not found');
  });

  it('pukla mreža ne ruši rezervaciju', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendOwnerTelegram } = await ucitaj(PODESENO);

    await expect(sendOwnerTelegram(REZERVACIJA, 'cash')).resolves.toBe(false);
  });
});

describe('notifyOwner', () => {
  it('šalje na Telegram i kad mail nije podešen', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [ime, vrijednost] of Object.entries(PODESENO)) vi.stubEnv(ime, vrijednost);

    const { notifyOwner } = await import('./notify');
    await notifyOwner(REZERVACIJA, 'cash');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('kad nijedan kanal nije podešen, glasno kaže da niko nije obaviješten', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const greska = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.resetModules();
    vi.unstubAllEnvs();

    const { notifyOwner } = await import('./notify');
    await notifyOwner(REZERVACIJA, 'cash');

    const poruka = String(greska.mock.calls[0]?.[0] ?? '');
    expect(poruka).toContain('NEMA OBAVIJESTI VLASNIKU');
    // Poruka mora reći i ŠTA se podešava — inače je samo panika bez izlaza.
    expect(poruka).toContain('TELEGRAM_BOT_TOKEN');
    expect(poruka).toContain('RESEND_API_KEY');
  });
});
