import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogPagination } from '@/components/catalog-pagination';
import { getAmbiguousPublishedPartNumbers } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';
import { getCachedPartCategory, getCachedPartCatalogStats } from '@/lib/parts-catalog-cache';
import {
  getPartCatalogPage,
  getPartManufacturerSummaries,
  type PartCatalogItem,
} from '@/lib/parts-catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
};

const descriptions: Record<string,string> = {
  'engine-oil-filters': 'Source-backed engine oil filter part numbers, replacements, maintenance-kit relationships and documented farm equipment fitment.',
  'fuel-filters': 'Source-backed fuel filter, fuel-water separator and fuel filter element part numbers with compatible equipment and replacement relationships.',
  'air-filters': 'Source-backed primary and secondary engine air filter part numbers with documented equipment fitment and maintenance-kit relationships.',
  'hydraulic-filters': 'Source-backed hydraulic, transmission and hydrostatic filter part numbers with compatible equipment, replacements and kit membership data.',
  'cab-air-filters': 'Source-backed cab fresh-air and recirculation filter part numbers for farm equipment, with documented model fitment where available.',
  'maintenance-kits': 'John Deere Filter Pak and maintenance-kit part numbers with documented kit contents, replacement chains, compatible models and serial-number rules.',
  'engine-oils': 'Source-backed engine oil products referenced by official farm equipment maintenance guides and service schedules.',
  'transmission-hydraulic-fluids': 'Source-backed transmission and hydraulic fluids referenced by official maintenance guides, including system capacities where documented.',
  'fluids': 'Source-backed farm equipment fluids referenced by official maintenance and technical sources.',
  'steering-parts': 'Source-backed tractor tie rods, steering ball joints and related steering parts with 2WD or MFWD configuration notes, replacement numbers and documented model fitment.',
  'alternators': 'Source-backed tractor alternator part numbers with rated amperage, voltage and documented equipment fitment where published by the manufacturer.',
  'batteries': 'Source-backed tractor battery part numbers and electrical-system fitment from official replacement-parts guides.',
  'brake-parts': 'Source-backed tractor brake disk and brake-system replacement part numbers with documented compatible models.',
  'drive-belts': 'Source-backed tractor fan and auxiliary drive belt part numbers with published length or configuration notes and documented model fitment.',
  'clutch-parts': 'Source-backed PTO and transmission clutch part numbers with configuration notes and documented tractor fitment.',
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function parsePage(value?: string) {
  if (!value) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return null;
  return page;
}

function descriptionFor(slug: string, name: string) {
  return descriptions[slug] || `Source-backed ${name.toLowerCase()} part numbers, compatibility, replacements and technical references for farm equipment.`;
}

function canonicalForPage(categorySlug: string, page: number) {
  const basePath = `/parts/category/${categorySlug}`;
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

function PartCard({ part, href }: { part: PartCatalogItem; href: string }) {
  const details = [
    part.fitmentCount > 0 ? `${part.fitmentCount} documented fitment${part.fitmentCount === 1 ? '' : 's'}` : null,
    part.relationCount > 0 ? `${part.relationCount} replacement / cross-reference link${part.relationCount === 1 ? '' : 's'}` : null,
    part.componentCount > 0 ? `${part.componentCount} documented kit component${part.componentCount === 1 ? '' : 's'}` : null,
    part.kitMembershipCount > 0 ? `included in ${part.kitMembershipCount} documented kit${part.kitMembershipCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link className="card" href={href}>
      <span className="eyebrow">{part.manufacturerName || 'Part'}</span>
      <h3>{part.partNumber}</h3>
      <p>{part.name || part.categoryName || 'Farm equipment part'}</p>
      {details && <p style={{ marginTop: 8 }}>{details}</p>}
    </Link>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ category: slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const [category, page] = await Promise.all([getCachedPartCategory(slug), Promise.resolve(parsePage(pageParam))]);
  if (!category) return {};

  if (page === null) {
    return {
      title: category.name,
      robots: { index: false, follow: true },
    };
  }

  const indexable = category.partCount >= 2;
  return {
    title: page === 1
      ? `${category.name} - Farm Equipment Parts & Compatibility`
      : `${category.name} - Page ${page}`,
    description: descriptionFor(category.slug, category.name),
    alternates: { canonical: canonicalForPage(category.slug, page) },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PartCategoryPage({ params, searchParams }: PageProps) {
  const [{ category: slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = parsePage(pageParam);
  if (page === null) notFound();

  const category = await getCachedPartCategory(slug);
  if (!category) notFound();

  const [catalog, stats, manufacturers] = await Promise.all([
    getPartCatalogPage({ categorySlug: category.slug, page }),
    getCachedPartCatalogStats(category.slug),
    getPartManufacturerSummaries(),
  ]);

  if (page > 1 && (catalog.totalPages === 0 || page > catalog.totalPages)) notFound();

  const ambiguousPartNumbers = await getAmbiguousPublishedPartNumbers(
    catalog.items.map((part) => part.normalizedPartNumber),
  );
  const indexableManufacturerSlugs = new Set(
    manufacturers.filter((manufacturer) => manufacturer.partCount >= 2).map((manufacturer) => manufacturer.slug),
  );
  const manufacturerGroups = Array.from(
    catalog.items.reduce<Map<string, { name: string; slug: string | null; count: number }>>((groups, part) => {
      const name = part.manufacturerName || 'Other documented parts';
      const slug = part.manufacturerSlug && indexableManufacturerSlugs.has(part.manufacturerSlug)
        ? part.manufacturerSlug
        : null;
      const key = part.manufacturerSlug || name;
      const current = groups.get(key) || { name, slug, count: 0 };
      current.count += 1;
      groups.set(key, current);
      return groups;
    }, new Map()).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const basePath = `/parts/category/${category.slug}`;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalPath = canonicalForPage(category.slug, page);
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: page === 1 ? `${category.name} - Farm Equipment Parts & Compatibility` : `${category.name} - Page ${page}`,
        description: descriptionFor(category.slug, category.name),
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
          { '@type': 'ListItem', position: 2, name: 'Parts', item: `${baseUrl}/parts` },
          { '@type': 'ListItem', position: 3, name: category.name, item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        numberOfItems: catalog.items.length,
        itemListElement: catalog.items.map((part, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${baseUrl}${getPartReferenceHref(
            part.normalizedPartNumber,
            part.manufacturerSlug,
            ambiguousPartNumbers,
          )}`,
          name: `${part.manufacturerName ? `${part.manufacturerName} ` : ''}${part.partNumber}${part.name ? ` ${part.name}` : ''}`,
        })),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link> / {category.name}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Parts category</span>
          <h1>{category.name}{page > 1 ? ` - Page ${page}` : ''}</h1>
          <p className="section-lead">{descriptionFor(category.slug, category.name)}</p>

          <div className="parts-stats">
            <div><strong>{stats.total}</strong><span>source-backed part pages</span></div>
            <div><strong>{stats.replacementLinked}</strong><span>with replacement or cross-reference data</span></div>
            <div><strong>{stats.kitLinked}</strong><span>with documented kit relationships</span></div>
          </div>

          <div className="parts-tool-callout">
            <div>
              <strong>Need to check a part against a machine?</strong>
              <span>Use the model and serial-number checker for documented fitment ranges across published farm equipment.</span>
            </div>
            <Link className="tool-link" href="/fitment-checker">Open Fitment Checker →</Link>
          </div>

          {manufacturerGroups.length > 0 && (
            <p className="section-note">
              <strong>Manufacturers on this page:</strong>{' '}
              {manufacturerGroups.map((group, index) => (
                <span key={group.slug || group.name}>
                  {index > 0 ? ' · ' : ''}
                  {group.slug ? <Link href={`/parts/manufacturer/${group.slug}`}>{group.name}</Link> : group.name} ({group.count})
                </span>
              ))}
            </p>
          )}

          <div className="grid">
            {catalog.items.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                href={getPartReferenceHref(
                  part.normalizedPartNumber,
                  part.manufacturerSlug,
                  ambiguousPartNumbers,
                )}
              />
            ))}
          </div>

          <CatalogPagination basePath={basePath} page={page} totalPages={catalog.totalPages} />
        </div>
      </section>
    </main>
  );
}
