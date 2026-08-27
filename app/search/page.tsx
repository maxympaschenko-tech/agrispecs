import type { Metadata } from 'next';
import Link from 'next/link';
import { searchMachines } from '@/lib/catalog-service';

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
  const results = term ? await searchMachines(term) : [];

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Catalog search</span>
        <h1>Search</h1>
        <form className="search-shell" action="/search">
          <input name="q" defaultValue={q} aria-label="Search equipment or part number" placeholder="Machine model or part number" />
          <button type="submit">Search</button>
        </form>
        <div style={{ marginTop: 28 }}>
          {term && results.length === 0 && <p>No matching equipment records yet. Part-number search will be added as the parts catalog is populated.</p>}
          <div className="grid">
            {results.map((machine) => (
              <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                <h3>{machine.title}</h3>
                <p>Tractor reference page</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
