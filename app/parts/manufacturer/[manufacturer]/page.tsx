import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogPagination } from '@/components/catalog-pagination';
import { getAmbiguousPublishedPartNumbers } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';
import { getCachedPartCategories } from '@/lib/parts-catalog-cache';
import {
  getPartCatalogPage,
  getPartManufacturerSummaries,
  type PartCatalogItem,
} from '@/lib/parts-catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ manufacturer: string }>;
  searchParams: Promise<{ page?: string }>;
};

function normalizeSlug(value: string) {
  try {
    const normalized = decodeURIComponent(value).trim().toLowerCase();
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : '';
  } catch {
    return '';
  }
}

function parsePage(value?: string) {
  if (!value) return 1;
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return null;
  return page;
}

function canonicalForPage(manufacturerSlug: string, page: number) {
  const basePath = `/parts/manufacturer/${manufacturerSlug}`;
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function PartCard({ part, href }: { part: PartCatalogItem; href: string }) {
  const details = [
    part.fitmentCount > 0 ? `${part.fitmentCount} documented fitment${part.fitmentCount === 1 ? '' : 's'}` : null,
    part.relationCount > 0 ? `${part.relationCount} replacement / cross-reference link${part.relationCount === 1 ? '' : 's'}` : null,
    part.componentCount > 0 ? `${part.componentCount} kit component${part.componentCount === 1 ? '' : 's'}` : null,
    part.kitMembershipCount > 0 ? `included in ${part.kitMembershipCount} kit${part.kitMembershipCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link className="card" href={href}>
      <span className="eyebrow">{part.categoryName || 'Part'}</span>
      <h3>{part.partNumber}</h3>
      <p>{part.name || 'Farm equipment part'}</p>
      {details && <p style={{ marginTop: 8 }}>{details}</p>}
      <span className="tool-link">View part reference →</span>
    </Link>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ manufacturer: rawManufacturer }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const manufacturerSlug = normalizeSlug(rawManufacturer);
  const page = parsePage(pageParam);
  if (!manufacturerSlug || page === null) {
    return {
      title: 'Farm Equipment Parts by Manufacturer',
      robots: { index: false, follow: true },
    };
  }

  const manufacturers = await getPartManufacturerSummaries();
  const manufacturer = manufacturers.find((item) => item.slug === manufacturerSlug);
  if (!manufacturer) return {};

  const title = page === 1
    ? `${manufacturer.name} Parts, OEM Numbers and Fitment`
    : `${manufacturer.name} Parts - Page ${page}`;

  return {
    title,
    description: `Source-backed ${manufacturer.name} farm equipment part numbers, documented fitment, replacement references and maintenance-kit relationships.`,
    alternates: { canonical: canonicalForPage(manufacturer.slug, page) },
    robots: manufacturer.partCount >= 2 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PartManufacturerPage({ params, searchParams }: PageProps) {
  const [{ manufacturer: rawManufacturer }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const manufacturerSlug = normalizeSlug(rawManufacturer);
  const page = parsePage(pageParam);
  if (!manufacturerSlug || page === null) notFound();

  const manufacturers = await getPartManufacturerSummaries();
  const manufacturer = manufacturers.find((item) => item.slug === manufacturerSlug);
  if (!manufacturer) notFound();

  const [catalog, categories] = await Promise.all([
    getPartCatalogPage({ manufacturerSlug, page }),
    getCachedPartCategories(),
  ]);
  if (page > 1 && (catalog.totalPages === 0 || page > catalog.totalPages)) notFound();

  const ambiguousPartNumbers = await getAmbiguousPublishedPartNumbers(
    catalog.items.map((part) => part.normalizedPartNumber),
  );
  const indexableCategorySlugs = new Set(
    categories.filter((category) => category.partCount >= 2).map((category) => category.slug),
  );
  const categoryGroups = Array.from(
    catalog.items.reduce<Map<string, { name: string; slug: string | null; count: number }>>((groups, part) => {
      const name = part.categoryName || 'Other documented parts';
      const slug = part.categorySlug && indexableCategorySlugs.has(part.categorySlug) ? part.categorySlug : null;
      const key = part.categorySlug || name;
      const current = groups.get(key) || { name, slug, count: 0 };
      current.count += 1;
      groups.set(key, current);
      return groups;
    }, new Map()).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalPath = canonicalForPage(manufacturer.slug, page);
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: page === 1 ? `${manufacturer.name} Parts, OEM Numbers and Fitment` : `${manufacturer.name} Parts - Page ${page}`,
        description: `Source-backed ${manufacturer.name} farm equipment part numbers, documented fitment, replacement references and maintenance-kit relationships.`,
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#items` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Parts', item: `${baseUrl}/parts` },
          { '@type': 'ListItem', position: 3, name: manufacturer.name, item: canonicalUrl },
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
          name: `${manufacturer.name} ${part.partNumber}${part.name ? ` ${part.name}` : ''}`,
        })),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link> / {manufacturer.name}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Parts manufacturer</span>
          <h1>{manufacturer.name} parts, OEM numbers and fitment{page > 1 ? ` - Page ${page}` : ''}</h1>
          <p className="section-lead">
            Source-backed {manufacturer.name} part numbers with documented machine fitment, replacement or cross-reference relationships and maintenance-kit context where a cited technical source supports the relationship.
          </p>

          <div className="parts-stats">
            <div><strong>{manufacturer.partCount.toLocaleString('en-US')}</strong><span>Source-backed part pages</span></div>
            <div><strong>{categoryGroups.length.toLocaleString('en-US')}</strong><span>Categories on this page</span></div>
            <div><strong>Source-backed</strong><span>Published relationship policy</span></div>
          </div>

          <div className="notice">
            A part appearing in this manufacturer catalog does not imply universal compatibility. Open the part reference and fitment source before ordering, especially where model year, serial range or configuration can change applicability.
          </div>

          {categoryGroups.length > 0 && (
            <p className="section-note">
              <strong>Categories on this page:</strong>{' '}
              {categoryGroups.map((group, index) => (
                <span key={group.slug || group.name}>
                  {index > 0 ? ' · ' : ''}
                  {group.slug ? <Link href={`/parts/category/${group.slug}`}>{group.name}</Link> : group.name} ({group.count})
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

          <CatalogPagination
            basePath={`/parts/manufacturer/${manufacturer.slug}`}
            page={page}
            totalPages={catalog.totalPages}
          />

          <section className="catalog-group">
            <h2>More parts reference tools</h2>
            <div className="grid">
              <Link className="card" href="/parts">
                <span className="eyebrow">Parts catalog</span>
                <h3>Browse all manufacturers and categories</h3>
                <p>Return to the complete source-backed farm equipment parts catalog.</p>
              </Link>
              <Link className="card" href="/fitment-checker">
                <span className="eyebrow">Compatibility</span>
                <h3>Check a part against a machine</h3>
                <p>Use model and serial-number context to test documented fitment records.</p>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
