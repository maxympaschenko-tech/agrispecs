import type { ReactNode } from 'react';
import Link from 'next/link';
import { getPart } from '@/lib/parts-service';
import { getAmbiguousPublishedPartNumbers, getPublishedPartNumberMatchCount } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';
import { getPartImages } from '@/lib/part-images-service';
import { getReplacementChain, type ReplacementChain } from '@/lib/replacement-chain-service';
import {
  getReplacementSetMembershipsForPart,
  getReplacementSetsForLegacyPart,
  type ReplacementSet,
  type ReplacementSetMembership,
} from '@/lib/replacement-set-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ part: string; manufacturer: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function needsVisibleAttribution(licenseName: string | null) {
  if (!licenseName) return false;
  return /\bCC\s+BY\b|\bCC\s+BY-SA\b|Creative Commons Attribution/i.test(licenseName);
}

export default async function ManufacturerPartLayout({ children, params }: LayoutProps) {
  const { part: manufacturer, manufacturer: slug } = await params;
  const part = await getPart(slug, manufacturer);
  const publishable = part && (part.dataStatus === 'partial' || part.dataStatus === 'verified');
  if (!part || !publishable || !part.manufacturerSlug) return children;

  const matchCount = await getPublishedPartNumberMatchCount(part.normalizedPartNumber);
  let replacementChain: ReplacementChain = { nodes: [], complete: true, ambiguous: false };
  let replacementSets: ReplacementSet[] = [];
  let replacementMemberships: ReplacementSetMembership[] = [];

  if (matchCount > 1) {
    [replacementChain, replacementSets, replacementMemberships] = await Promise.all([
      getReplacementChain(part.id),
      getReplacementSetsForLegacyPart(part.id),
      getReplacementSetMembershipsForPart(part.id),
    ]);
  }

  const replacementPartNumbers = [
    ...replacementChain.nodes.map((node) => node.normalizedPartNumber),
    ...replacementSets.flatMap((set) => set.items.map((item) => item.normalizedPartNumber)),
    ...replacementMemberships.map((membership) => membership.legacyNormalizedPartNumber),
  ];
  const ambiguousReplacementPartNumbers = replacementPartNumbers.length > 0
    ? await getAmbiguousPublishedPartNumbers(replacementPartNumbers)
    : new Set<string>();
  const hasReplacementContext = replacementChain.nodes.length > 0
    || replacementSets.length > 0
    || replacementMemberships.length > 0;

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalPath = matchCount > 1
    ? `/parts/${part.manufacturerSlug}/${part.normalizedPartNumber.toLowerCase()}`
    : `/parts/${part.normalizedPartNumber.toLowerCase()}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const images = getPartImages(part.normalizedPartNumber, part.manufacturerSlug, part.categorySlug);
  const primaryImage = images[0];
  const exactImageUrl = primaryImage?.imageKind === 'exact' && primaryImage.imageUrl
    ? `${baseUrl}${primaryImage.imageUrl}`
    : undefined;
  const productId = `${canonicalUrl}#product`;
  const hasManufacturerCatalogContext = part.fitmentCount > 0
    || part.relations.length > 0
    || part.components.length > 0
    || part.includedInKits.length > 0;
  const manufacturerHubHref = hasManufacturerCatalogContext
    ? `/parts/manufacturer/${part.manufacturerSlug}`
    : null;

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

  if (manufacturerHubHref && part.manufacturerName) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: `${part.manufacturerName} parts`,
      item: `${baseUrl}${manufacturerHubHref}`,
    });
  }

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
    name: `${part.manufacturerName || 'OEM'} ${part.partNumber}`,
    item: canonicalUrl,
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'part reference'}`,
        description: part.description || `${part.manufacturerName || 'OEM'} ${part.partNumber} source-backed farm equipment part reference.`,
        image: exactImageUrl,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': productId },
      },
      {
        '@type': 'Product',
        '@id': productId,
        url: canonicalUrl,
        name: `${part.manufacturerName || 'OEM'} ${part.partNumber}${part.name ? ` ${part.name}` : ''}`,
        sku: part.partNumber,
        mpn: part.partNumber,
        category: part.categoryName || 'Farm equipment part',
        description: part.description || part.name || `${part.partNumber} farm equipment part reference.`,
        image: exactImageUrl,
        brand: part.manufacturerName
          ? { '@type': 'Brand', name: part.manufacturerName }
          : undefined,
        additionalProperty: [
          part.categoryName ? { '@type': 'PropertyValue', name: 'Part category', value: part.categoryName } : null,
          { '@type': 'PropertyValue', name: 'Documented compatible machines', value: String(part.fitmentCount) },
          matchCount > 1 ? { '@type': 'PropertyValue', name: 'Part-number identity', value: 'Manufacturer-qualified due to cross-brand number collision' } : null,
          replacementChain.nodes.length > 0
            ? { '@type': 'PropertyValue', name: 'Verified replacement chain length', value: String(replacementChain.nodes.length) }
            : null,
          replacementSets.length > 0
            ? { '@type': 'PropertyValue', name: 'Documented service replacement sets', value: String(replacementSets.length) }
            : null,
        ].filter(Boolean),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
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
      {manufacturerHubHref && part.manufacturerName && (
        <div className="container" style={{ paddingTop: 12 }}>
          <p className="section-note">
            Manufacturer catalog: <Link href={manufacturerHubHref}>browse all source-backed {part.manufacturerName} parts →</Link>
          </p>
        </div>
      )}
      {hasReplacementContext && (
        <section className="section" style={{ paddingTop: 12, paddingBottom: 0 }}>
          <div className="container">
            <div className="replacement-summary">
              <strong>Source-backed replacement context for this manufacturer-specific record</strong>
              {replacementChain.nodes.length > 0 && (
                <p style={{ marginTop: 8 }}>
                  Verified chain: <span>{part.partNumber}</span>
                  {replacementChain.nodes.map((node) => (
                    <span key={node.id}>
                      {' → '}
                      <Link href={getPartReferenceHref(
                        node.normalizedPartNumber,
                        node.manufacturerSlug,
                        ambiguousReplacementPartNumbers,
                      )}>{node.partNumber}</Link>
                    </span>
                  ))}
                  {!replacementChain.complete && (
                    <small style={{ display: 'block', marginTop: 6 }}>
                      {replacementChain.ambiguous
                        ? 'The verified chain branches or loops after this point, so no single final replacement is asserted.'
                        : 'The verified chain continues beyond the current depth limit.'}
                    </small>
                  )}
                </p>
              )}
              {replacementSets.map((set) => (
                <div key={set.id} style={{ marginTop: 10 }}>
                  <strong>{set.title}</strong>
                  {set.items.map((item) => (
                    <span key={`${set.id}-${item.normalizedPartNumber}`} style={{ display: 'block' }}>
                      <Link href={getPartReferenceHref(
                        item.normalizedPartNumber,
                        item.manufacturerSlug,
                        ambiguousReplacementPartNumbers,
                      )}>{item.partNumber}</Link>
                      {item.role ? ` · ${item.role}` : item.name ? ` · ${item.name}` : ''}
                      {item.quantity !== null ? ` · Qty ${item.quantity}` : ''}
                    </span>
                  ))}
                  {set.notes && <small style={{ display: 'block' }}>{set.notes}</small>}
                  {set.sourceUrl && (
                    <small style={{ display: 'block' }}>
                      <a href={set.sourceUrl} target="_blank" rel="noopener noreferrer">{set.sourceTitle || 'Replacement-set source'} →</a>
                    </small>
                  )}
                </div>
              ))}
              {replacementMemberships.map((membership) => (
                <div key={`${membership.id}-${membership.legacyNormalizedPartNumber}`} style={{ marginTop: 10 }}>
                  <strong>Used in service replacement for: </strong>
                  <Link href={getPartReferenceHref(
                    membership.legacyNormalizedPartNumber,
                    membership.legacyManufacturerSlug,
                    ambiguousReplacementPartNumbers,
                  )}>{membership.legacyPartNumber}</Link>
                  {membership.role ? ` · ${membership.role}` : ''}
                  {membership.quantity !== null ? ` · Qty ${membership.quantity}` : ''}
                  {membership.sourceUrl && (
                    <small style={{ display: 'block' }}>
                      <a href={membership.sourceUrl} target="_blank" rel="noopener noreferrer">{membership.sourceTitle || 'Replacement-set source'} →</a>
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {children}
    </>
  );
}
