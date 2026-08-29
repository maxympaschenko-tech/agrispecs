import type { ReactNode } from 'react';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function BrandLayout({ children, params }: LayoutProps) {
  const { brand } = await params;
  const [brands, machines] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
  ]);
  const info = brands.find((item) => item.slug === brand);

  if (!info) return children;

  const publishedMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalUrl = `${baseUrl}/brands/${info.slug}`;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: `${info.name} tractor specs and model reference`,
      description: `Source-backed ${info.name} tractor specifications, maintenance, parts, attachments and compatibility references.`,
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'Farm Machine Specs',
      },
      breadcrumb: {
        '@id': `${canonicalUrl}#breadcrumb`,
      },
      mainEntity: publishedMachines.length > 0
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

  if (publishedMachines.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonicalUrl}#models`,
      name: `${info.name} models with published data`,
      numberOfItems: publishedMachines.length,
      itemListElement: publishedMachines.map((machine, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: machine.title,
        url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
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
