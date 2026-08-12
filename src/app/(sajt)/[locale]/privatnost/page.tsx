import type { Metadata } from 'next';

import { PlusFooter } from '@/components/plus/PlusFooter';
import { PlusLegal } from '@/components/plus/PlusLegal';
import { CONTACT } from '@/lib/contact';
import { localePath } from '@/lib/i18n';
import { getServerStrings } from '@/lib/i18n/server';
import { privacyDoc } from '@/lib/legal';
import { localeAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerStrings();
  const doc = privacyDoc(locale, {
    siteName: t.site.name,
    email: CONTACT.email,
    phone: CONTACT.phone,
  });

  return {
    title: doc.title,
    description: doc.lead,
    alternates: localeAlternates(locale, '/privatnost'),
  };
}

export default async function Privatnost() {
  const { locale, t } = await getServerStrings();
  const doc = privacyDoc(locale, {
    siteName: t.site.name,
    email: CONTACT.email,
    phone: CONTACT.phone,
  });

  return (
    <>
      <PlusLegal doc={doc} backLabel={t.confirmation.backHome} backHref={localePath(locale)} />
      <PlusFooter />
    </>
  );
}
