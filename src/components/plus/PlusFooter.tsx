import Link from 'next/link';

import { Parallax } from '@/components/motion/Parallax';
import { CONTACT } from '@/lib/contact';
import { getServerStrings } from '@/lib/i18n/server';

/**
 * Podnožje.
 *
 * Kontakt podaci dolaze iz iste konstante kao u ostalim verzijama — promijeniš
 * broj na jednom mjestu, promijeni se na svim sajtovima.
 *
 * Ime kuće ide preko cijele širine, na dnu: posljednje što gost vidi treba da
 * bude ime, a ne spisak linkova.
 */
export async function PlusFooter() {
  const { t } = await getServerStrings();
  const year = new Date().getFullYear();

  const links = [
    { href: '#o-kuci', label: t.nav.about },
    { href: '#galerija', label: t.nav.gallery },
    { href: '#sadrzaji', label: t.nav.amenities },
    { href: '#pitanja', label: t.nav.faq },
    { href: '#rezervacija', label: t.nav.book },
  ];

  return (
    <footer className="plus-surface-deepest plus-dim-on">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="plus-eyebrow-onlight">{t.footer.contact}</p>
            <ul className="space-y-2.5 text-base">
              <li>
                <a
                  href={CONTACT.phoneHref}
                  dir="ltr"
                  className="inline-block transition-colors hover:plus-ink-on"
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  dir="ltr"
                  className="inline-block transition-colors hover:plus-ink-on"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li className="plus-dimmer-on">{t.footer.address}</li>
            </ul>
          </div>

          <div>
            <p className="plus-eyebrow-onlight">{t.footer.quickLinks}</p>
            <ul className="space-y-2.5 text-base">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="transition-colors hover:plus-ink-on">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="plus-eyebrow-onlight">{t.site.tagline}</p>
            <p className="max-w-xs text-base leading-relaxed plus-dimmer-on">
              {t.site.description}
            </p>
          </div>
        </div>

        {/* Ime kuće preko cijele širine — `clamp` da se skalira s ekranom
            umjesto da se lomi ili prelijeva na uske telefone.

            Kreće se sporije od podnožja koje ga nosi, pa se pri dolasku na dno
            stranice "podigne" u vidno polje umjesto da samo dođe s njim.
            `overflow-hidden` na omotaču drži taj višak unutar podnožja. */}
        <div className="mt-16 overflow-hidden">
          <Parallax speed={0.05}>
            <p
              className="plus-ghost select-none leading-none"
              style={{
                fontFamily: 'var(--font-plus-display)',
                fontSize: 'clamp(3rem, 16vw, 12rem)',
              }}
              aria-hidden="true"
            >
              {t.site.name}
            </p>
          </Parallax>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t plus-rule-on pt-6 text-xs plus-dimmer-on">
          <p>
            © {year} {t.site.name}. {t.footer.rights}
          </p>

          {/* Pravni tekstovi stoje u dnu, gdje ih gost i traži. */}
          <p className="flex gap-5">
            <Link href="/privatnost" className="transition-colors hover:plus-ink-on">
              {t.footer.privacy}
            </Link>
            <Link href="/uslovi" className="transition-colors hover:plus-ink-on">
              {t.footer.terms}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
