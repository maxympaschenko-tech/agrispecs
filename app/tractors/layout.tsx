import type { ReactNode } from 'react';
import { getMachines } from '@/lib/catalog-service';

type LayoutProps = { children: ReactNode };

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function TractorsLayout({ children }: LayoutProps) {
  const machines = await getMachines();
  const publishedMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalUrl = `${baseUrl}/tractors`;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: 'Tractor specs by brand and model',
      description: 'Source-backed tractor specifications, maintenance, parts, attachment fitment and comparison references by manufacturer and model.',
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'Farm Machine Specs',
      },
      mainEntity: publishedMachines.length > 0 ? { '@id': `${canonicalUrl}#models` } : undefined,
    },
  ];

  if (publishedMachines.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonicalUrl}#models`,
      name: 'Published tractor models',
      numberOfItems: publishedMachines.length,
      itemListElement: publishedMachines.map((machine, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: machine.title,
        url: `${baseUrl}/tractors/${machine.brandSlug}/${machine.modelSlug}`,
      })),
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@graph': graph }) }}
      />
      {children}
    </>
  );
}
