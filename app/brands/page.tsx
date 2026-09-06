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
  const tractorCounts = new Map<string, number>();
  const equipmentCounts = new Map<string, number>();
  const equipmentTypeGroups = new Map<string, Map<string, { name: string; count: number }>>();
  const brandMap = new Map(tractorBrands.map((brand) => [brand.slug, brand]));

  for (const machine of tractors) {
    if (machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified') continue;
    publishableCounts.set(machine.brandSlug, (publishableCounts.get(machine.brandSlug) || 0) + 1);
    tractorCounts.set(machine.brandSlug, (tractorCounts.get(machine.brandSlug) || 0) + 1);
  }

  for (const machine of equipment) {
    if (machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified') continue;
    publishableCounts.set(machine.brandSlug, (publishableCounts.get(machine.brandSlug) || 0) + 1);
    equipmentCounts.set(machine.brandSlug, (equipmentCounts.get(machine.brandSlug) || 0) + 1);

    const brandTypes = equipmentTypeGroups.get(machine.brandSlug) || new Map<string, { name: string; count: number }>();
    const existingType = brandTypes.get(machine.equipmentTypeSlug);
    brandTypes.set(machine.equipmentTypeSlug, {
      name: machine.equipmentType,
      count: (existingType?.count || 0) + 1,
    });
    equipmentTypeGroups.set(machine.brandSlug, brandTypes);

    if (!brandMap.has(machine.brandSlug)) {
      brandMap.set(machine.brandSlug, { slug: machine.brandSlug, name: machine.brand });
    }
  }

  const publishableBrands = Array.from(brandMap.values())
    .filter((brand) => (publishableCounts.get(brand.slug) || 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalPublishedTractors = Array.from(tractorCounts.values()).reduce((total, count) => total + count, 0);
  const totalPublishedEquipment = Array.from(equipmentCounts.values()).reduce((total, count) => total + count, 0);
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

        <div className="parts-stats">
          <div><strong>{publishableBrands.length.toLocaleString('en-US')}</strong><span>Manufacturers with published data</span></div>
          <div><strong>{totalPublishedTractors.toLocaleString('en-US')}</strong><span>Published tractor models</span></div>
          <div><strong>{totalPublishedEquipment.toLocaleString('en-US')}</strong><span>Published non-tractor models</span></div>
        </div>

        <div className="grid">
          {publishableBrands.map((brand) => {
            const tractorCount = tractorCounts.get(brand.slug) || 0;
            const equipmentCount = equipmentCounts.get(brand.slug) || 0;
            const totalCount = publishableCounts.get(brand.slug) || 0;
            const typeHubs = Array.from(
              equipmentTypeGroups.get(brand.slug) || new Map<string, { name: string; count: number }>(),
            )
              .filter(([, type]) => type.count >= 2)
              .sort(([, a], [, b]) => b.count - a.count || a.name.localeCompare(b.name))
              .slice(0, 3);

            return (
              <div className="card" key={brand.slug}>
                <span className="eyebrow">Manufacturer</span>
                <h3><Link href={`/brands/${brand.slug}`}>{brand.name}</Link></h3>
                <p>
                  {totalCount.toLocaleString('en-US')} model{totalCount === 1 ? '' : 's'} with published data
                  {tractorCount > 0 ? ` · ${tractorCount.toLocaleString('en-US')} tractor${tractorCount === 1 ? '' : 's'}` : ''}
                  {equipmentCount > 0 ? ` · ${equipmentCount.toLocaleString('en-US')} other equipment` : ''}
                </p>
                {typeHubs.length > 0 && (
                  <p className="section-note">
                    <strong>Equipment catalogs:</strong>{' '}
                    {typeHubs.map(([typeSlug, type], index) => (
                      <span key={typeSlug}>
                        {index > 0 ? ' · ' : ''}
                        <Link href={`/equipment/${typeSlug}/${brand.slug}`}>
                          {type.name} ({type.count})
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
                <Link className="tool-link" href={`/brands/${brand.slug}`}>View {brand.name} manufacturer page →</Link>
              </div>
            );
          })}
        </div>
        {publishableBrands.length === 0 && <div className="notice">Source-backed manufacturer pages are being prepared.</div>}
      </div>
    </main>
  );
}
