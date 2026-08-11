import type { Metadata } from 'next';

import { PlusFooter } from '@/components/plus/PlusFooter';
import { PlusLegal } from '@/components/plus/PlusLegal';
import { CONTACT } from '@/lib/contact';
import { getServerStrings } from '@/lib/i18n/server';
import { termsDoc } from '@/lib/legal';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerStrings();
  const doc = termsDoc(locale, {
    siteName: t.site.name,
    email: CONTACT.email,
    phone: CONTACT.phone,
  });

  return { title: doc.title, description: doc.lead };
}

export default async function Uslovi() {
  const { locale, t } = await getServerStrings();
  const doc = termsDoc(locale, {
    siteName: t.site.name,
    email: CONTACT.email,
    phone: CONTACT.phone,
  });

  return (
    <>
      <PlusLegal doc={doc} backLabel={t.confirmation.backHome} />
      <PlusFooter />
    </>
  );
}
