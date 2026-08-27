import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogPagination } from '@/components/catalog-pagination';
import { getPartCategories } from '@/lib/part-category-service';
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
      ? 'Farm Equipment Parts, Replacements and Cross References'
      : `Farm Equipment Parts - Page ${page}`,
    description: 'Verified OEM part numbers, maintenance kits and kit contents, replacement numbers, aftermarket alternatives and farm equipment compatibility data.',
    alternates: { canonical: canonicalForPage(page) },
    robots: { index: true, follow: true },
  };
}

function PartCard({ part }: { part: PartCatalogItem }) {
  const details = [
    part.fitmentCount > 0 ? `${part.fitmentCount} verified fitment${part.fitmentCount === 1 ? '' : 's'}` : null,
    part.relationCount > 0 ? `${part.relationCount} replacement / cross-reference link${part.relationCount === 1 ? '' : 's'}` : null,
    part.componentCount > 0 ? `${part.componentCount} verified kit component${part.componentCount === 1 ? '' : 's'}` : null,
    part.kitMembershipCount > 0 ? `included in ${part.kitMembershipCount} verified kit${part.kitMembershipCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link className="card" href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
      <span className="eyebrow">{part.categoryName || 'Part'}</span>
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
  const johnDeereParts = parts.filter((part) => part.manufacturerSlug === 'john-deere');
  const aftermarketParts = parts.filter((part) => part.manufacturerSlug && part.manufacturerSlug !== 'john-deere');
  const usefulCategories = categories.filter((category) => category.partCount >= 2);

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Parts catalog</span>
        <h1>Farm equipment parts, replacements and cross references{page > 1 ? ` - Page ${page}` : ''}</h1>
        <p className="section-lead">
          Source-backed OEM part numbers, legacy replacements, maintenance kit contents, aftermarket alternatives and compatible equipment. Serial-number restrictions are shown when the technical source provides them.
        </p>

        <div className="parts-stats">
          <div><strong>{stats.total}</strong><span>source-backed part pages</span></div>
          <div><strong>{stats.replacementLinked}</strong><span>with replacement or cross-reference data</span></div>
          <div><strong>{stats.kitLinked}</strong><span>with verified Filter Pak component data</span></div>
        </div>

        <div className="parts-tool-callout">
          <div>
            <strong>Have a model and serial number?</strong>
            <span>Use the fitment checker to test a documented serial-number range.</span>
          </div>
          <Link className="tool-link" href="/fitment-checker">Open Fitment Checker →</Link>
        </div>

        {page === 1 && usefulCategories.length > 0 && (
          <section className="catalog-group">
            <h2>Browse parts by category</h2>
            <p className="section-note">Only categories with multiple source-backed part pages are published here.</p>
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

        {johnDeereParts.length > 0 && (
          <section className="catalog-group">
            <h2>John Deere OEM & legacy part numbers</h2>
            <p className="section-note">Includes current OEM numbers, source-backed Filter Pak contents, and legacy numbers where Deere publishes a substitute replacement.</p>
            <div className="grid">
              {johnDeereParts.map((part) => <PartCard key={part.id} part={part} />)}
            </div>
          </section>
        )}

        {aftermarketParts.length > 0 && (
          <section className="catalog-group">
            <h2>Aftermarket alternatives</h2>
            <p className="section-note">Shown only where the cited source lists the part as an alternative buying option or cross-reference.</p>
            <div className="grid">
              {aftermarketParts.map((part) => <PartCard key={part.id} part={part} />)}
            </div>
          </section>
        )}

        {parts.length === 0 && page === 1 && <div className="notice">Verified part records are being added.</div>}

        <CatalogPagination basePath="/parts" page={page} totalPages={catalog.totalPages} />
      </div>
    </main>
  );
}
