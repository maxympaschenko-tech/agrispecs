import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPublishedPartNumberMatches } from '@/lib/part-identity-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Choose Part Manufacturer',
  robots: { index: false, follow: true },
};

type PageProps = {
  params: Promise<{ part: string }>;
};

export default async function PartManufacturerResolverPage({ params }: PageProps) {
  const { part: slug } = await params;
  const matches = await getPublishedPartNumberMatches(slug);

  if (matches.length === 0) notFound();
  if (matches.length === 1) {
    redirect(`/parts/${matches[0].normalizedPartNumber.toLowerCase()}`);
  }

  const displayNumber = matches[0].partNumber;

  return (
    <main className="section">
      <div className="container">
        <div className="breadcrumbs">
          <Link href="/">Home</Link> / <Link href="/parts">Parts</Link> / {displayNumber}
        </div>

        <span className="eyebrow">Part number disambiguation</span>
        <h1>Choose the manufacturer for {displayNumber}</h1>
        <p className="section-lead">
          More than one published manufacturer record uses this normalized part number. Choose the manufacturer before relying on fitment, replacement or cross-reference data.
        </p>

        <div className="notice">
          Part numbers are not globally unique across the farm-equipment industry. Farm Machine Specs keeps each manufacturer record separate rather than guessing which brand a number belongs to.
        </div>

        <div className="grid" style={{ marginTop: 24 }}>
          {matches.map((match) => (
            match.manufacturerSlug ? (
              <Link
                className="card"
                key={match.id}
                href={`/parts/${match.manufacturerSlug}/${match.normalizedPartNumber.toLowerCase()}`}
              >
                <span className="eyebrow">Manufacturer-specific record</span>
                <h3>{match.manufacturerName || 'Manufacturer'} {match.partNumber}</h3>
                <p>Open the source-backed fitment, replacement and part-reference record for this manufacturer.</p>
                <span className="tool-link">Open exact part record</span>
              </Link>
            ) : (
              <div className="card" key={match.id}>
                <span className="eyebrow">Manufacturer unresolved</span>
                <h3>{match.partNumber}</h3>
                <p>This published record does not yet have a manufacturer slug, so it is intentionally not exposed through a manufacturer-qualified URL.</p>
              </div>
            )
          ))}
        </div>

        <p style={{ marginTop: 28 }}>
          <Link className="tool-link" href="/parts">Return to parts catalog</Link>
        </p>
      </div>
    </main>
  );
}
