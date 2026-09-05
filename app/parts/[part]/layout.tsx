import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPart } from '@/lib/parts-service';
import { hasAmbiguousPublishedPartNumber } from '@/lib/part-identity-service';
import { getPartImages } from '@/lib/part-images-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ part: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function needsVisibleAttribution(licenseName: string | null) {
  if (!licenseName) return false;
  return /\bCC\s+BY\b|\bCC\s+BY-SA\b|Creative Commons Attribution/i.test(licenseName);
}

export default async function PartLayout({ children, params }: LayoutProps) {
  const { part: slug } = await params;
  if (await hasAmbiguousPublishedPartNumber(slug)) {
    redirect(`/parts/resolve/${encodeURIComponent(slug)}`);
  }

  const part = await getPart(slug);

  if (!part) return children;

  const images = getPartImages(part.normalizedPartNumber, part.manufacturerSlug, part.categorySlug);
  const primaryImage = images[0];
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalPath = `/parts/${part.normalizedPartNumber.toLowerCase()}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const exactImageUrl = primaryImage?.imageKind === 'exact' && primaryImage.imageUrl
    ? `${baseUrl}${primaryImage.imageUrl}`
    : undefined;
  const productId = `${canonicalUrl}#product`;
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

  const productProperties = [
    part.categoryName ? { '@type': 'PropertyValue', name: 'Part category', value: part.categoryName } : null,
    { '@type': 'PropertyValue', name: 'Source-backed compatible machines', value: String(part.fitments.length) },
    part.components.length > 0
      ? { '@type': 'PropertyValue', name: 'Documented kit components', value: String(part.components.length) }
      : null,
  ].filter(Boolean);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${part.manufacturerName ? `${part.manufacturerName} ` : ''}${part.partNumber} ${part.name || 'part reference'}`,
        description: part.description || `${part.partNumber} source-backed farm equipment part fitment, replacement and cross-reference reference.`,
        image: exactImageUrl,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: {
          '@id': `${canonicalUrl}#breadcrumb`,
        },
        mainEntity: {
          '@id': productId,
        },
      },
      {
        '@type': 'Product',
        '@id': productId,
        url: canonicalUrl,
        name: `${part.manufacturerName ? `${part.manufacturerName} ` : ''}${part.partNumber}${part.name ? ` ${part.name}` : ''}`,
        sku: part.partNumber,
        mpn: part.partNumber,
        category: part.categoryName || 'Farm equipment part',
        description: part.description || part.name || `${part.partNumber} farm equipment part reference.`,
        image: exactImageUrl,
        brand: part.manufacturerName
          ? {
              '@type': 'Brand',
              name: part.manufacturerName,
            }
          : undefined,
        additionalProperty: productProperties,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: breadcrumbItems,
      },
    ],
  };

  const showAttribution = needsVisibleAttribution(primaryImage?.licenseName || null);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      {primaryImage && (
        <section className="section" style={{ paddingTop: 18, paddingBottom: 0 }}>
          <div className="container">
            <figure className="machine-photo" style={{ maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
              <img src={primaryImage.imageUrl} alt={primaryImage.altText || `${part.partNumber} ${part.name || 'part'}`} loading="eager" />
              <figcaption>
                {primaryImage.imageKind === 'fallback' && <strong>Exact part photo pending. </strong>}
                {primaryImage.imageKind === 'representative' && <strong>Representative image. </strong>}
                {primaryImage.caption && <span>{primaryImage.caption} </span>}
                {showAttribution && primaryImage.sourcePageUrl && (
                  <>
                    Photo:{' '}
                    <a href={primaryImage.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                      {primaryImage.author || 'source'}
                    </a>
                    {primaryImage.licenseName && (
                      <>
                        {' '}·{' '}
                        {primaryImage.licenseUrl ? (
                          <a href={primaryImage.licenseUrl} target="_blank" rel="noopener noreferrer">{primaryImage.licenseName}</a>
                        ) : primaryImage.licenseName}
                      </>
                    )}
                  </>
                )}
              </figcaption>
            </figure>
          </div>
        </section>
      )}
      {children}
    </>
  );
}
