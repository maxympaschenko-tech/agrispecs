import type { Metadata } from 'next';
import Link from 'next/link';
import { getParts } from '@/lib/parts-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Parts Reference',
  description: 'Verified OEM part numbers, maintenance filters, replacement parts and farm equipment compatibility data.',
  alternates: { canonical: '/parts' },
};

export default async function PartsPage() {
  const parts = await getParts();
  const verifiedParts = parts.filter((part) => part.dataStatus === 'verified' || part.dataStatus === 'partial');

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Parts catalog</span>
        <h1>Farm equipment parts</h1>
        <p className="section-lead">
          Verified OEM part numbers, maintenance filters and equipment fitment. Compatibility is published only when a technical source is attached.
        </p>

        {verifiedParts.length > 0 ? (
          <div className="grid">
            {verifiedParts.map((part) => (
              <Link className="card" key={part.id} href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
                <span className="eyebrow">{part.categoryName || 'Part'}</span>
                <h3>{part.partNumber}</h3>
                <p>{part.name || 'OEM part'}{part.fitmentCount > 0 ? ` · ${part.fitmentCount} verified model fitment${part.fitmentCount === 1 ? '' : 's'}` : ''}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="notice">Verified part records are being added.</div>
        )}
      </div>
    </main>
  );
}
