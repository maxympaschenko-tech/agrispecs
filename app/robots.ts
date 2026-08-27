import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/search?*'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
