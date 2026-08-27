import type { MetadataRoute } from 'next';
import { getMachines } from '@/lib/catalog-service';
import { getPartCategories } from '@/lib/part-category-service';
import { getIndexablePartNumbers } from '@/lib/part-index-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const staticPages: MetadataRoute.Sitemap = ['', '/tractors', '/brands', '/parts', '/fitment-checker', '/compare'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));

  const [machines, partNumbers, categories] = await Promise.all([
    getMachines(),
    getIndexablePartNumbers(),
    getPartCategories(),
  ]);

  const publishableMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );

  const brandPages: MetadataRoute.Sitemap = Array.from(
    new Map(publishableMachines.map((machine) => [machine.brandSlug, machine.brandSlug])).values(),
  ).map((brandSlug) => ({
    url: `${baseUrl}/brands/${brandSlug}`,
    lastModified: new Date(),
  }));

  const machinePages: MetadataRoute.Sitemap = publishableMachines.map((machine) => ({
    url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
    lastModified: new Date(),
  }));

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => category.partCount >= 2)
    .map((category) => ({
      url: `${baseUrl}/parts/category/${category.slug}`,
      lastModified: new Date(),
    }));

  const partPages: MetadataRoute.Sitemap = partNumbers.map((partNumber) => ({
    url: `${baseUrl}/parts/${partNumber.toLowerCase()}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...brandPages, ...machinePages, ...categoryPages, ...partPages];
}
