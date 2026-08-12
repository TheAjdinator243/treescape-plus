import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Administracija i stranice s potvrdama nemaju šta tražiti u pretrazi.
      //
      // Potvrde sada stoje pod jezikom (`/en/rezervacija/<token>`), pa ide i
      // pravilo sa zvjezdicom. Staro, bez jezika, ostaje zbog linkova iz
      // ranijih mailova — oni se preusmjeravaju, ali do preusmjerenja ih
      // pretraživač ipak zatraži.
      disallow: ['/admin', '/admin/', '/api/', '/rezervacija/', '/*/rezervacija/'],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
