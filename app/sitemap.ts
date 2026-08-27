import type { MetadataRoute } from 'next';
import { getMachines } from '@/lib/catalog-service';
import { getIndexablePartNumbers } from '@/lib/part-index-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const staticPages: MetadataRoute.Sitemap = ['', '/tractors', '/brands', '/parts', '/fitment-checker', '/compare'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const [machines, partNumbers] = await Promise.all([getMachines(), getIndexablePartNumbers()]);

  const machinePages: MetadataRoute.Sitemap = machines
    .filter((machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified')
    .map((machine) => ({
      url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
      lastModified: new Date(),
    }));

  const partPages: MetadataRoute.Sitemap = partNumbers.map((partNumber) => ({
    url: `${baseUrl}/parts/${partNumber.toLowerCase()}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...machinePages, ...partPages];
}
