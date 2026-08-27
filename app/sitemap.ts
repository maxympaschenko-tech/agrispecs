import type { MetadataRoute } from 'next';
import { machines } from '@/lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
  const staticPages = ['', '/tractors', '/brands', '/parts', '/compare'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const machinePages = machines.map((machine) => ({
    url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...machinePages];
}
