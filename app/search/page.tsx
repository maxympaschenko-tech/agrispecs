import type { Metadata } from 'next';
import Link from 'next/link';
import { searchMachines } from '@/lib/catalog-service';
import { searchParts } from '@/lib/parts-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const term = q.trim();
  const [machines, parts] = term
    ? await Promise.all([searchMachines(term), searchParts(term)])
    : [[], []];
  const verifiedParts = parts.filter((part) => part.dataStatus === 'verified' || part.dataStatus === 'partial');

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Catalog search</span>
        <h1>Search</h1>
        <form className="search-shell" action="/search">
          <input name="q" defaultValue={q} aria-label="Search equipment or part number" placeholder="Try: John Deere 5075E or RE519626" />
          <button type="submit">Search</button>
        </form>

        <div style={{ marginTop: 28 }}>
          {term && machines.length === 0 && verifiedParts.length === 0 && <p>No matching equipment or verified part records yet.</p>}

          {machines.length > 0 && (
            <section className="search-group">
              <h2>Equipment</h2>
              <div className="grid">
                {machines.map((machine) => (
                  <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    <span className="eyebrow">Tractor</span>
                    <h3>{machine.title}</h3>
                    <p>Specifications, maintenance and compatible parts</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {verifiedParts.length > 0 && (
            <section className="search-group">
              <h2>Parts</h2>
              <div className="grid">
                {verifiedParts.map((part) => (
                  <Link className="card" key={part.id} href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
                    <span className="eyebrow">{part.categoryName || 'Part'}</span>
                    <h3>{part.partNumber}</h3>
                    <p>{part.name || 'OEM part'}{part.fitmentCount > 0 ? ` · ${part.fitmentCount} verified fitment${part.fitmentCount === 1 ? '' : 's'}` : ''}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
