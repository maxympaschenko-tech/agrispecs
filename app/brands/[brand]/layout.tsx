import type { ReactNode } from 'react';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';
import { getNonTractorEquipmentByBrand } from '@/lib/equipment-service';
import { getAttachmentCatalog } from '@/lib/attachments-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function attachmentTypeLabel(type: string) {
  if (type === 'front-loader') return 'Front loader';
  if (type === 'backhoe') return 'Backhoe';
  return type
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Attachment';
}

export default async function BrandLayout({ children, params }: LayoutProps) {
  const { brand } = await params;
  const [brands, tractors, equipment, attachmentCatalog] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
    getNonTractorEquipmentByBrand(brand),
    getAttachmentCatalog(),
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
  const brandAttachments = attachmentCatalog.filter(
    (attachment) => attachment.manufacturerSlug === info.slug,
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
    ...brandAttachments.map((attachment) => ({
      name: `${attachment.manufacturerName} ${attachment.modelName}`,
      url: `/attachments/${attachment.manufacturerSlug}/${attachment.slug}`,
      category: `${attachmentTypeLabel(attachment.attachmentType)} attachment`,
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
        ? { '@id': `${canonicalUrl}#catalog-items` }
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
      '@id': `${canonicalUrl}#catalog-items`,
      name: `${info.name} catalog items with published data`,
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
