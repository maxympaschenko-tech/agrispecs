import type { MetadataRoute } from 'next';
import { getMachines } from '@/lib/catalog-service';
import { getNonTractorEquipment, getNonTractorEquipmentTypes } from '@/lib/equipment-service';
import { getPartCategories } from '@/lib/part-category-service';
import { getIndexablePartNumbers } from '@/lib/part-index-service';
import { getAttachmentCatalog } from '@/lib/attachments-service';
import { comparisonPresets } from '@/lib/comparison-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const staticPages: MetadataRoute.Sitemap = [
    '',
    '/tractors',
    '/equipment',
    '/equipment/compare',
    '/brands',
    '/parts',
    '/attachments',
    '/fitment-checker',
    '/compare',
    '/methodology',
    '/about',
    '/editorial-policy',
    '/contact',
    '/privacy',
    '/terms',
  ].map((path) => ({ url: `${baseUrl}${path}` }));

  const [machines, equipment, equipmentTypes, partNumbers, categories, attachments] = await Promise.all([
    getMachines(),
    getNonTractorEquipment(),
    getNonTractorEquipmentTypes(),
    getIndexablePartNumbers(),
    getPartCategories(),
    getAttachmentCatalog(),
  ]);

  const publishableMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishableEquipment = equipment.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );

  const publishableMachineKeys = new Set(
    publishableMachines.map((machine) => `${machine.brand}\u0000${machine.model}`),
  );

  const brandPages: MetadataRoute.Sitemap = Array.from(
    new Set([
      ...publishableMachines.map((machine) => machine.brandSlug),
      ...publishableEquipment.map((machine) => machine.brandSlug),
    ]),
  ).map((brandSlug) => ({
    url: `${baseUrl}/brands/${brandSlug}`,
  }));

  const machinePages: MetadataRoute.Sitemap = publishableMachines.map((machine) => ({
    url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
  }));

  const equipmentTypePages: MetadataRoute.Sitemap = equipmentTypes.map((type) => ({
    url: `${baseUrl}/equipment/${type.slug}`,
  }));

  const equipmentPages: MetadataRoute.Sitemap = publishableEquipment.map((machine) => ({
    url: `${baseUrl}/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`,
  }));

  const comparisonPages: MetadataRoute.Sitemap = comparisonPresets
    .filter((preset) =>
      preset.machines.every((machine) => publishableMachineKeys.has(`${machine.brand}\u0000${machine.model}`)),
    )
    .map((preset) => ({
      url: `${baseUrl}/compare/${preset.slug}`,
    }));

  const categoryPages: MetadataRoute.Sitemap = categories
    .filter((category) => category.partCount >= 2)
    .map((category) => ({
      url: `${baseUrl}/parts/category/${category.slug}`,
    }));

  const partPages: MetadataRoute.Sitemap = partNumbers.map((partNumber) => ({
    url: `${baseUrl}/parts/${partNumber.toLowerCase()}`,
  }));

  const attachmentPages: MetadataRoute.Sitemap = attachments
    .filter((attachment) => attachment.compatibleMachineCount > 0)
    .map((attachment) => ({
      url: `${baseUrl}/attachments/${attachment.manufacturerSlug}/${attachment.slug}`,
    }));

  return [
    ...staticPages,
    ...brandPages,
    ...machinePages,
    ...equipmentTypePages,
    ...equipmentPages,
    ...comparisonPages,
    ...categoryPages,
    ...partPages,
    ...attachmentPages,
  ];
}
