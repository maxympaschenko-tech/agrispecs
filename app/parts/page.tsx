import type { Metadata } from 'next';
import Link from 'next/link';
import { getPartCatalogItems, type PartCatalogItem } from '@/lib/parts-catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Parts, Replacements and Cross References',
  description: 'Verified OEM part numbers, maintenance kits and kit contents, replacement numbers, aftermarket alternatives and farm equipment compatibility data.',
  alternates: { canonical: '/parts' },
};

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

export default async function PartsPage() {
  const parts = await getPartCatalogItems();
  const johnDeereParts = parts.filter((part) => part.manufacturerSlug === 'john-deere');
  const aftermarketParts = parts.filter((part) => part.manufacturerSlug && part.manufacturerSlug !== 'john-deere');
  const replacementLinked = parts.filter((part) => part.relationCount > 0).length;
  const kitLinked = parts.filter((part) => part.componentCount > 0 || part.kitMembershipCount > 0).length;

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Parts catalog</span>
        <h1>Farm equipment parts, replacements and cross references</h1>
        <p className="section-lead">
          Source-backed OEM part numbers, legacy replacements, maintenance kit contents, aftermarket alternatives and compatible equipment. Serial-number restrictions are shown when the technical source provides them.
        </p>

        <div className="parts-stats">
          <div><strong>{parts.length}</strong><span>source-backed part pages</span></div>
          <div><strong>{replacementLinked}</strong><span>with replacement or cross-reference data</span></div>
          <div><strong>{kitLinked}</strong><span>with verified Filter Pak component data</span></div>
        </div>

        <div className="parts-tool-callout">
          <div>
            <strong>Have a model and serial number?</strong>
            <span>Use the fitment checker to test a documented serial-number range.</span>
          </div>
          <Link className="tool-link" href="/fitment-checker">Open Fitment Checker →</Link>
        </div>

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

        {parts.length === 0 && <div className="notice">Verified part records are being added.</div>}
      </div>
    </main>
  );
}
