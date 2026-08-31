import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrands, getMachines } from '@/lib/catalog-service';
import { getNonTractorEquipment } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Brands',
  description: 'Browse agricultural equipment manufacturers with source-backed model specifications, maintenance, parts and compatibility references.',
  alternates: { canonical: '/brands' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function BrandsPage() {
  const [tractorBrands, tractors, equipment] = await Promise.all([
    getBrands(),
    getMachines(),
    getNonTractorEquipment(),
  ]);
  const publishableCounts = new Map<string, number>();
  const brandMap = new Map(tractorBrands.map((brand) => [brand.slug, brand]));

  for (const machine of tractors) {
    if (machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified') continue;
    publishableCounts.set(machine.brandSlug, (publishableCounts.get(machine.brandSlug) || 0) + 1);
  }

  for (const machine of equipment) {
    if (machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified') continue;
    publishableCounts.set(machine.brandSlug, (publishableCounts.get(machine.brandSlug) || 0) + 1);
    if (!brandMap.has(machine.brandSlug)) {
      brandMap.set(machine.brandSlug, { slug: machine.brandSlug, name: machine.brand });
    }
  }

  const publishableBrands = Array.from(brandMap.values())
    .filter((brand) => (publishableCounts.get(brand.slug) || 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/brands`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: 'Farm Equipment Brands',
        description: 'Browse agricultural equipment manufacturers with source-backed model specifications, maintenance, parts and compatibility references.',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#items` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Brands', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        numberOfItems: publishableBrands.length,
        itemListElement: publishableBrands.map((brand, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${baseUrl}/brands/${brand.slug}`,
          name: brand.name,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Manufacturers</span>
        <h1>Farm equipment brands</h1>
        <p className="section-lead">Browse manufacturers with source-backed tractor and agricultural equipment data already published in the catalog.</p>
        <div className="grid">
          {publishableBrands.map((brand) => (
            <Link className="card" href={`/brands/${brand.slug}`} key={brand.slug}>
              <span className="eyebrow">Manufacturer</span>
              <h3>{brand.name}</h3>
              <p>{publishableCounts.get(brand.slug)} model{publishableCounts.get(brand.slug) === 1 ? '' : 's'} with published data</p>
            </Link>
          ))}
        </div>
        {publishableBrands.length === 0 && <div className="notice">Source-backed manufacturer pages are being prepared.</div>}
      </div>
    </main>
  );
}
