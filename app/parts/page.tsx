import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogPagination } from '@/components/catalog-pagination';
import { getPartCategories } from '@/lib/part-category-service';
import { getPartImages } from '@/lib/part-images-service';
import {
  getPartCatalogPage,
  getPartCatalogStats,
  type PartCatalogItem,
} from '@/lib/parts-catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
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

function canonicalForPage(page: number) {
  return page <= 1 ? '/parts' : `/parts?page=${page}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  if (page === null) {
    return {
      title: 'Farm Equipment Parts',
      robots: { index: false, follow: true },
    };
  }

  return {
    title: page === 1
      ? 'Farm Equipment Parts, OEM Numbers and Cross References'
      : `Farm Equipment Parts - Page ${page}`,
    description: 'Source-backed OEM part numbers, maintenance kits, replacement numbers, cross references and farm equipment compatibility data by manufacturer.',
    alternates: { canonical: canonicalForPage(page) },
    robots: { index: true, follow: true },
  };
}

function PartCard({ part }: { part: PartCatalogItem }) {
  const details = [
    part.fitmentCount > 0 ? `${part.fitmentCount} documented fitment${part.fitmentCount === 1 ? '' : 's'}` : null,
    part.relationCount > 0 ? `${part.relationCount} replacement / cross-reference link${part.relationCount === 1 ? '' : 's'}` : null,
    part.componentCount > 0 ? `${part.componentCount} documented kit component${part.componentCount === 1 ? '' : 's'}` : null,
    part.kitMembershipCount > 0 ? `included in ${part.kitMembershipCount} documented kit${part.kitMembershipCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');
  const image = getPartImages(part.normalizedPartNumber, part.manufacturerSlug, part.categorySlug)[0];

  return (
    <Link className="card" href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
      {image && (
        <img
          src={image.imageUrl}
          alt={image.altText || `${part.partNumber} ${part.name || 'part'}`}
          loading="lazy"
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: '4 / 3',
            objectFit: 'contain',
            borderRadius: 12,
            marginBottom: 14,
          }}
        />
      )}
      <span className="eyebrow">{part.categoryName || 'Part'}{image?.imageKind === 'representative' ? ' · Representative image' : ''}{image?.imageKind === 'fallback' ? ' · Photo pending' : ''}</span>
      <h3>{part.partNumber}</h3>
      <p>{part.manufacturerName ? `${part.manufacturerName} · ` : ''}{part.name || 'Farm equipment part'}</p>
      {details && <p style={{ marginTop: 8 }}>{details}</p>}
    </Link>
  );
}

export default async function PartsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  if (page === null) notFound();

  const [catalog, stats, categories] = await Promise.all([
    getPartCatalogPage({ page }),
    getPartCatalogStats(),
    getPartCategories(),
  ]);

  if (page > 1 && (catalog.totalPages === 0 || page > catalog.totalPages)) notFound();

  const parts = catalog.items;
  const usefulCategories = categories.filter((category) => category.partCount >= 2);
  const manufacturerGroups = Array.from(
    parts.reduce<Map<string, { name: string; slug: string | null; items: PartCatalogItem[] }>>((groups, part) => {
      const key = part.manufacturerSlug || 'other-documented-parts';
      const current = groups.get(key) || {
        name: part.manufacturerName || 'Other documented parts',
        slug: part.manufacturerSlug,
        items: [],
      };
      current.items.push(part);
      groups.set(key, current);
      return groups;
    }, new Map()),
  ).map(([, group]) => group);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalPath = canonicalForPage(page);
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: page === 1 ? 'Farm Equipment Parts, OEM Numbers and Cross References' : `Farm Equipment Parts - Page ${page}`,
        description: 'Source-backed OEM part numbers, maintenance kits, replacement numbers, cross references and farm equipment compatibility data by manufacturer.',
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
          { '@type': 'ListItem', position: 2, name: 'Parts', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        numberOfItems: parts.length,
        itemListElement: parts.map((part, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${baseUrl}/parts/${part.normalizedPartNumber.toLowerCase()}`,
          name: `${part.manufacturerName ? `${part.manufacturerName} ` : ''}${part.partNumber}${part.name ? ` ${part.name}` : ''}`,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Parts catalog</span>
        <h1>Farm equipment parts, OEM numbers and cross references{page > 1 ? ` - Page ${page}` : ''}</h1>
        <p className="section-lead">
          Search source-backed OEM part numbers, legacy replacements, maintenance kit contents, documented alternatives and compatible equipment. Serial-number restrictions are shown when the technical source provides them.
        </p>

        {page === 1 && (
          <form className="search-shell" action="/search" style={{ marginBottom: 24 }}>
            <input name="q" aria-label="Search farm equipment part number" placeholder="Search a part number, for example RE519626" />
            <button type="submit">Search parts</button>
          </form>
        )}

        <div className="parts-stats">
          <div><strong>{stats.total}</strong><span>source-backed part pages</span></div>
          <div><strong>{stats.replacementLinked}</strong><span>with replacement or cross-reference data</span></div>
          <div><strong>{stats.kitLinked}</strong><span>with documented kit component data</span></div>
        </div>

        <div className="parts-tool-callout">
          <div>
            <strong>Have a machine model and serial number?</strong>
            <span>Use the fitment checker to test documented fitment and serial-number ranges across published farm equipment.</span>
          </div>
          <Link className="tool-link" href="/fitment-checker">Open Fitment Checker →</Link>
        </div>

        {page === 1 && usefulCategories.length > 0 && (
          <section className="catalog-group">
            <h2>Browse parts by category</h2>
            <p className="section-note">Categories are published when enough source-backed part records exist to make the page useful.</p>
            <div className="grid">
              {usefulCategories.map((category) => (
                <Link className="card" href={`/parts/category/${category.slug}`} key={category.id}>
                  <span className="eyebrow">Parts category</span>
                  <h3>{category.name}</h3>
                  <p>{category.partCount} source-backed part pages</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {manufacturerGroups.map((group) => (
          <section className="catalog-group" key={group.slug || group.name}>
            <h2>{group.name} parts</h2>
            <p className="section-note">
              Source-backed part numbers and documented replacement, kit or fitment relationships for {group.name}.
            </p>
            <div className="grid">
              {group.items.map((part) => <PartCard key={part.id} part={part} />)}
            </div>
          </section>
        ))}

        {parts.length === 0 && page === 1 && <div className="notice">Source-backed part records are being added.</div>}

        <CatalogPagination basePath="/parts" page={page} totalPages={catalog.totalPages} />
      </div>
    </main>
  );
}
