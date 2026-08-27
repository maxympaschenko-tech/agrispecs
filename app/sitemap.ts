import type { MetadataRoute } from 'next';
import { getMachines } from '@/lib/catalog-service';
import { getParts } from '@/lib/parts-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const staticPages: MetadataRoute.Sitemap = ['', '/tractors', '/brands', '/parts', '/compare'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const [machines, parts] = await Promise.all([getMachines(), getParts()]);

  const machinePages: MetadataRoute.Sitemap = machines
    .filter((machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified')
    .map((machine) => ({
      url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
      lastModified: new Date(),
    }));

  const partPages: MetadataRoute.Sitemap = parts
    .filter((part) => (part.dataStatus === 'partial' || part.dataStatus === 'verified') && part.fitmentCount > 0)
    .map((part) => ({
      url: `${baseUrl}/parts/${part.normalizedPartNumber.toLowerCase()}`,
      lastModified: new Date(),
    }));

  return [...staticPages, ...machinePages, ...partPages];
}
