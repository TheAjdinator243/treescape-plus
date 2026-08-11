import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: env.siteUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Pravni tekstovi se rijetko mijenjaju i nisu ono što se traži preko
    // pretraživača, ali moraju biti pronalazivi — i Googleu i onome ko
    // provjerava da sajt ima politiku privatnosti.
    {
      url: `${env.siteUrl}/privatnost`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${env.siteUrl}/uslovi`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
