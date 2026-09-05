import type { ReactNode } from 'react';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';
import { getNonTractorEquipmentByBrand } from '@/lib/equipment-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function BrandLayout({ children, params }: LayoutProps) {
  const { brand } = await params;
  const [brands, tractors, equipment] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
    getNonTractorEquipmentByBrand(brand),
  ]);
  const tractorBrand = brands.find((item) => item.slug === brand);
  const equipmentBrand = equipment[0]
    ? { slug: equipment[0].brandSlug, name: equipment[0].brand }
    : undefined;
  const info = tractorBrand || equipmentBrand;

  if (!info) return children;

  const publishedTractors = tractors.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishedEquipment = equipment.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishedItems = [
    ...publishedTractors.map((machine) => ({
      name: machine.title,
      url: `/tractors/${machine.brandSlug}/${machine.modelSlug}`,
      category: 'Tractor',
    })),
    ...publishedEquipment.map((machine) => ({
      name: machine.title,
      url: `/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`,
      category: machine.equipmentType,
    })),
  ];

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/brands/${info.slug}`;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: `${info.name} farm equipment specs and model reference`,
      description: `Source-backed ${info.name} tractor and agricultural equipment specifications, maintenance, parts, attachments and compatibility references.`,
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'Farm Machine Specs',
      },
      breadcrumb: {
        '@id': `${canonicalUrl}#breadcrumb`,
      },
      about: {
        '@type': 'Brand',
        name: info.name,
      },
      mainEntity: publishedItems.length > 0
        ? { '@id': `${canonicalUrl}#models` }
        : undefined,
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Brands',
          item: `${baseUrl}/brands`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: info.name,
          item: canonicalUrl,
        },
      ],
    },
  ];

  if (publishedItems.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonicalUrl}#models`,
      name: `${info.name} models with published data`,
      numberOfItems: publishedItems.length,
      itemListElement: publishedItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `${baseUrl}${item.url}`,
        additionalType: item.category,
      })),
    });
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      {children}
    </>
  );
}
