import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Kojim putem ide mail.
 *
 * Ovo su testovi za jednu tihu vrstu kvara: mail se "šalje", nigdje nema
 * greške, a gostu ništa ne stiže — jer nijedan put nije podešen, ili je
 * podešen onaj koji u tom trenutku ne može do tuđe adrese.
 */

async function ucitaj(kljucevi: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [ime, vrijednost] of Object.entries(kljucevi)) vi.stubEnv(ime, vrijednost);
  return import('./env');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('emailTransport', () => {
  it('bez ijednog ključa nema puta — i to nije greška', async () => {
    const { emailTransport, isEmailConfigured } = await ucitaj({});

    expect(emailTransport()).toBeNull();
    expect(isEmailConfigured).toBe(false);
  });

  it('Gmail traži i adresu i lozinku za aplikacije', async () => {
    const samoAdresa = await ucitaj({ GMAIL_USER: 'vlasnik@gmail.com' });
    expect(samoAdresa.emailTransport()).toBeNull();

    const samoLozinka = await ucitaj({ GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' });
    expect(samoLozinka.emailTransport()).toBeNull();

    const oboje = await ucitaj({
      GMAIL_USER: 'vlasnik@gmail.com',
      GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
    });
    expect(oboje.emailTransport()).toBe('gmail');
  });

  it('sam Resend ključ je dovoljan', async () => {
    const { emailTransport } = await ucitaj({ RESEND_API_KEY: 're_test' });
    expect(emailTransport()).toBe('resend');
  });

  it('kad su podešena oba, Gmail ima prednost', async () => {
    // Namjerno: Resend bez potvrđenog domena ne može pisati pravom gostu, a
    // Gmail može. Da je obrnuto, gost bi tiho ostao bez maila.
    const { emailTransport } = await ucitaj({
      RESEND_API_KEY: 're_test',
      GMAIL_USER: 'vlasnik@gmail.com',
      GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop',
    });

    expect(emailTransport()).toBe('gmail');
  });

  it('OWNER_EMAIL ne otvara put sam za sebe', async () => {
    // Adresa vlasnika kaže KOME se javlja, ne ČIME. Bez puta nema slanja.
    const { emailTransport } = await ucitaj({ OWNER_EMAIL: 'vlasnik@primjer.ba' });
    expect(emailTransport()).toBeNull();
  });

  it('prazan ključ se broji kao da ga nema', async () => {
    // Vercel rado ostavi varijablu praznu umjesto da je obriše.
    const { emailTransport } = await ucitaj({ RESEND_API_KEY: '   ' });
    expect(emailTransport()).toBeNull();
  });
});

describe('send bez podešenog puta', () => {
  it('ne baca grešku i kaže šta nedostaje', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();

    expect(rezultat.ok).toBe(false);
    // Poruka mora imenovati oba puta — inače vlasnik ne zna šta mu je izbor.
    expect(rezultat.detail).toContain('OWNER_EMAIL');
  });

  it('s adresom vlasnika, ali bez puta, javlja oba načina', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@primjer.ba');

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();

    expect(rezultat.ok).toBe(false);
    expect(rezultat.detail).toContain('GMAIL_USER');
    expect(rezultat.detail).toContain('RESEND_API_KEY');
  });

  it('imenuje koja varijabla nedostaje, a koja je tu', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    // Najčešći slučaj: adresa unesena, lozinka za aplikacije nije.
    vi.stubEnv('GMAIL_USER', 'vlasnik@gmail.com');
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@gmail.com');

    const { testGuestEmail } = await import('./email');
    const { detail } = await testGuestEmail();

    expect(detail).toContain('GMAIL_USER: IMA');
    expect(detail).toContain('GMAIL_APP_PASSWORD: NEMA');
    // Tri najčešća uzroka moraju biti ponuđena, inače se traži naslijepo.
    expect(detail).toContain('Redeploy');
    expect(detail).toContain('Production');
  });

  it('nikada ne ispisuje same vrijednosti', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('GMAIL_USER', 'vlasnik@gmail.com');
    vi.stubEnv('RESEND_API_KEY', '');

    const { testGuestEmail } = await import('./email');
    const { detail } = await testGuestEmail();

    // Poruka ide na ekran i u dnevnik — tajne u njoj nemaju šta tražiti.
    expect(detail).not.toContain('vlasnik@gmail.com');
  });
});

describe('lozinka za aplikacije s razmacima', () => {
  it('razmaci iz Googleovog prikaza ne obaraju prijavu', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    // Tačno onako kako Google pokaže i kako se prepiše.
    vi.stubEnv('GMAIL_USER', 'vlasnik@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'alzx zksq yxuc odbp');
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@gmail.com');

    const poslano: { pass?: string }[] = [];
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: (opts: { auth?: { pass?: string } }) => {
          poslano.push({ pass: opts.auth?.pass });
          return { sendMail: async () => ({}) };
        },
      },
    }));

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();

    expect(rezultat.ok).toBe(true);
    expect(poslano[0]?.pass).toBe('alzxzksqyxucodbp');
  });
});

describe('poruka o grešci objašnjava zašto', () => {
  async function sResendom(env: Record<string, string>, poruka: string) {
    vi.resetModules();
    vi.unstubAllEnvs();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.doMock('resend', () => ({
      Resend: class {
        emails = { send: async () => ({ error: { message: poruka } }) };
      },
    }));
    const { testGuestEmail } = await import('./email');
    return (await testGuestEmail()).detail;
  }

  it('Gmail adresa preko Resenda je slijepa ulica, i to se kaže', async () => {
    const detalj = await sResendom(
      {
        RESEND_API_KEY: 're_test',
        OWNER_EMAIL: 'vlasnik@gmail.com',
        EMAIL_FROM: 'TreeScape <vlasnik@gmail.com>',
      },
      'The gmail.com domain is not verified. Please, add and verify your domain on https://resend.com/domains'
    );

    // Ključno: ne smije zvučati kao "potvrdi domen gmail.com", jer to je nemoguće.
    expect(detalj).toContain('ne može slati');
    expect(detalj).toContain('GMAIL_APP_PASSWORD');
  });

  it('napola podešen Gmail se prijavi kao pravi uzrok', async () => {
    const detalj = await sResendom(
      {
        RESEND_API_KEY: 're_test',
        OWNER_EMAIL: 'vlasnik@gmail.com',
        GMAIL_USER: 'vlasnik@gmail.com',
      },
      'The gmail.com domain is not verified.'
    );

    expect(detalj).toContain('GMAIL_APP_PASSWORD');
    expect(detalj).toContain('napola podešen');
  });
});

describe('lažno zelena proba', () => {
  it('uspjeh preko onboarding@resend.dev nosi upozorenje da gost svejedno neće dobiti', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@gmail.com');
    // Zadana vrijednost EMAIL_FROM — Resendova zajednička adresa.
    vi.doMock('resend', () => ({
      Resend: class {
        emails = { send: async () => ({ error: null }) };
      },
    }));

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();

    // Poslano jeste — ali samo vlasniku, i to ništa ne dokazuje.
    expect(rezultat.ok).toBe(true);
    expect(rezultat.detail).toContain('NE dokazuje');
    expect(rezultat.detail).toContain('GMAIL_USER');
  });

  it('s potvrđenim domenom nema upozorenja', async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@treescape.ba');
    vi.stubEnv('EMAIL_FROM', 'TreeScape <rezervacije@treescape.ba>');
    vi.doMock('resend', () => ({
      Resend: class {
        emails = { send: async () => ({ error: null }) };
      },
    }));

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();

    expect(rezultat.ok).toBe(true);
    expect(rezultat.detail).not.toContain('NE dokazuje');
  });
});

describe('lozinka za aplikacije: šta se sve zalijepi pri prepisu', () => {
  async function posalji(lozinka: string) {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('GMAIL_USER', 'vlasnik@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', lozinka);
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@gmail.com');

    const vidjeno: string[] = [];
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: (o: { auth?: { pass?: string } }) => {
          vidjeno.push(o.auth?.pass ?? '');
          return { sendMail: async () => ({}) };
        },
      },
    }));

    const { testGuestEmail } = await import('./email');
    const rezultat = await testGuestEmail();
    return { poslana: vidjeno[0], rezultat };
  }

  it('navodnici iz raw editora se skidaju', async () => {
    // Railway raw editor i uvoz .env rado ostave navodnike u vrijednosti.
    const { poslana, rezultat } = await posalji('"alzx zksq yxuc odbp"');
    expect(poslana).toBe('alzxzksqyxucodbp');
    expect(rezultat.ok).toBe(true);
  });

  it('novi red i razmaci na krajevima se skidaju', async () => {
    const { poslana } = await posalji('  alzx zksq yxuc odbp\n');
    expect(poslana).toBe('alzxzksqyxucodbp');
  });
});

describe('Googleova odbijenica', () => {
  async function odbij(lozinka: string) {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('GMAIL_USER', 'vlasnik@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', lozinka);
    vi.stubEnv('OWNER_EMAIL', 'vlasnik@gmail.com');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: async () => {
            throw new Error('Invalid login: 535-5.7.8 Username and Password not accepted.');
          },
        }),
      },
    }));

    const { testGuestEmail } = await import('./email');
    return (await testGuestEmail()).detail;
  }

  it('nabraja uzroke, jer Google ne kaže koji je', async () => {
    const detalj = await odbij('alzx zksq yxuc odbp');
    expect(detalj).toContain('poništena');
    expect(detalj).toContain('dvostruka provjera');
  });

  it('pogrešnu dužinu javi prvu — nju jedinu možemo provjeriti sami', async () => {
    const detalj = await odbij('prekratka');
    expect(detalj).toContain('9 znakova');
    expect(detalj).toContain('16');
  });

  it('nikada ne ispisuje samu lozinku', async () => {
    const detalj = await odbij('alzx zksq yxuc odbp');
    expect(detalj).not.toContain('alzx');
    expect(detalj).not.toContain('alzxzksqyxucodbp');
  });
});

describe('link na mape u mailu gostu', () => {
  const REZ = {
    id: 'b', booking_public_link: 'abcdef1234567890', guest_name: 'Ana', guest_email: 'ana@primjer.ba',
    guest_phone: null, guests: 2, note: null, start_date: '2026-10-10', end_date: '2026-10-12',
    status: 'confirmed', payment_method: 'cash', total_cents: 60000, currency: 'BAM',
    price_breakdown: null, payment_reference: null, payment_id: null, hold_expires_at: null,
    admin_note: null, locale: 'bs', created_at: '', updated_at: '',
  };

  async function posalji(koji: 'cashApproved' | 'cashRequest' | 'cashRejected') {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('GMAIL_USER', 'v@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'aaaabbbbccccdddd');
    vi.stubEnv('OWNER_EMAIL', 'v@gmail.com');

    const sent: { html?: string }[] = [];
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: async (m: { html?: string }) => {
            sent.push(m);
            return {};
          },
        }),
      },
    }));

    const mod = await import('./email');
    const fn = {
      cashApproved: mod.sendGuestCashApproved,
      cashRequest: mod.sendGuestCashRequest,
      cashRejected: mod.sendGuestCashRejected,
    }[koji];

    await fn(REZ as never);
    return sent[0]?.html ?? '';
  }

  it('potvrđen termin nosi link na mape', async () => {
    expect(await posalji('cashApproved')).toContain('maps.app.goo.gl');
  });

  it('zahtjev koji tek čeka odluku NE nosi link', async () => {
    // Sajt i česta pitanja kažu da adresa stiže "nakon potvrde rezervacije" —
    // slanje uz nepotvrđen zahtjev bi bilo protivno onome što gostu piše.
    expect(await posalji('cashRequest')).not.toContain('maps.app.goo.gl');
  });

  it('odbijen zahtjev NE nosi link', async () => {
    expect(await posalji('cashRejected')).not.toContain('maps.app.goo.gl');
  });
});

describe('otkazivanje i razlog', () => {
  const REZ = {
    id: 'b', booking_public_link: 'abcdef1234567890', guest_name: 'Ana', guest_email: 'ana@primjer.ba',
    guest_phone: null, guests: 2, note: null, start_date: '2026-10-10', end_date: '2026-10-12',
    status: 'confirmed', payment_method: 'cash', total_cents: 60000, currency: 'BAM',
    price_breakdown: null, payment_reference: null, payment_id: null, hold_expires_at: null,
    admin_note: null, locale: 'bs', created_at: '', updated_at: '',
  };

  async function posalji(
    koji: 'cancelled' | 'rejected',
    reason?: string | null,
    booking: Record<string, unknown> = REZ
  ) {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('GMAIL_USER', 'v@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'aaaabbbbccccdddd');
    vi.stubEnv('OWNER_EMAIL', 'v@gmail.com');

    const sent: { html?: string; subject?: string }[] = [];
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: () => ({
          sendMail: async (m: { html?: string; subject?: string }) => {
            sent.push(m);
            return {};
          },
        }),
      },
    }));

    const mod = await import('./email');
    const fn = koji === 'cancelled' ? mod.sendGuestCancelled : mod.sendGuestCashRejected;
    await fn(booking as never, reason);
    return sent[0];
  }

  it('otkazana potvrđena rezervacija uopće šalje mail', async () => {
    // Ranije se ovdje nije slalo ništa — gost bi i dalje mislio da dolazi.
    const mail = await posalji('cancelled', 'Kvar na grijanju.');
    expect(mail?.subject).toContain('otkazana');
  });

  it('razlog stiže gostu', async () => {
    expect((await posalji('cancelled', 'Kvar na grijanju.'))?.html).toContain('Kvar na grijanju.');
    expect((await posalji('rejected', 'Termin je već dogovoren.'))?.html).toContain(
      'Termin je već dogovoren.'
    );
  });

  it('bez razloga nema praznog okvira', async () => {
    const html = (await posalji('cancelled'))?.html ?? '';
    // Natpis "Razlog:" bez ičega ispod bio bi gori od izostavljanja.
    expect(html).not.toContain('Razlog');
  });

  it('razlog koji domaćin napiše ne može razbiti mail', async () => {
    const html = (await posalji('cancelled', 'Radovi <b>na</b> vodi & struji'))?.html ?? '';
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });

  it('otkazivanje blokiranog termina ne šalje ništa — tamo nema gosta', async () => {
    const blokiran = { ...REZ, guest_email: null, guest_name: null };
    expect(await posalji('cancelled', 'Održavanje', blokiran)).toBeUndefined();
  });
});
