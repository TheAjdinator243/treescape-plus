import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Administracija i stranice s potvrdama nemaju šta tražiti u pretrazi.
      disallow: ['/admin', '/admin/', '/api/', '/rezervacija/'],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
