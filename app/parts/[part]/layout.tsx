import type { ReactNode } from 'react';
import { getPart } from '@/lib/parts-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ part: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function PartLayout({ children, params }: LayoutProps) {
  const { part: slug } = await params;
  const part = await getPart(slug);

  if (!part) return children;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalPath = `/parts/${part.normalizedPartNumber.toLowerCase()}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: baseUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Parts',
      item: `${baseUrl}/parts`,
    },
  ];

  if (part.categorySlug && part.categoryName) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: part.categoryName,
      item: `${baseUrl}/parts/category/${part.categorySlug}`,
    });
  }

  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: part.partNumber,
    item: canonicalUrl,
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${part.manufacturerName ? `${part.manufacturerName} ` : ''}${part.partNumber} ${part.name || 'part reference'}`,
        description: part.description || `${part.partNumber} source-backed farm equipment part fitment, replacement and cross-reference reference.`,
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
          '@type': 'Thing',
          name: part.partNumber,
          description: part.name || undefined,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
    ],
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
