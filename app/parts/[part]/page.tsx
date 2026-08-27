import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPart, type PartFitment, type PartRelation } from '@/lib/parts-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ part: string }>;
};

function relationLabel(relation: PartRelation) {
  if (relation.relationType === 'replaces') {
    return relation.direction === 'outgoing' ? 'Replaced by' : 'Replaces';
  }
  if (relation.relationType === 'supersedes') {
    return relation.direction === 'outgoing' ? 'Superseded by' : 'Supersedes';
  }
  if (relation.relationType === 'alternative') return 'Alternative';
  return 'Cross reference';
}

function serialRangeLabel(fitment: PartFitment) {
  const prefix = fitment.serialPrefix || '';
  if (fitment.serialFrom && fitment.serialTo) return `${prefix}${fitment.serialFrom} to ${prefix}${fitment.serialTo}`;
  if (fitment.serialFrom) return `${prefix}${fitment.serialFrom} and later`;
  if (fitment.serialTo) return `through ${prefix}${fitment.serialTo}`;
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) return {};

  const publishable = part.dataStatus === 'verified' || part.dataStatus === 'partial';
  const hasReplacement = part.relations.some((relation) => relation.direction === 'outgoing' && relation.relationType === 'replaces');
  const title = hasReplacement
    ? `${part.manufacturerName || 'OEM'} ${part.partNumber} Replacement Part Number`
    : `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'Part'} Fitment`;
  const description = hasReplacement
    ? `${part.partNumber} replacement and supersession reference with the current OEM substitute part number and official source.`
    : `${part.partNumber} ${part.name || 'OEM part'} reference with verified compatible farm equipment, serial-number fitment notes and technical sources.`;

  return {
    title,
    description,
    alternates: { canonical: `/parts/${part.normalizedPartNumber.toLowerCase()}` },
    robots: publishable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PartPage({ params }: PageProps) {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) notFound();

  const sourceEntries = [
    ...part.fitments
      .filter((fitment) => fitment.sourceUrl)
      .map((fitment) => ({
        url: fitment.sourceUrl as string,
        title: fitment.sourceTitle || 'Technical source',
        publishedDate: fitment.sourcePublishedDate,
      })),
    ...part.relations
      .filter((relation) => relation.sourceUrl)
      .map((relation) => ({
        url: relation.sourceUrl as string,
        title: relation.sourceTitle || 'Official part substitution source',
        publishedDate: null,
      })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link> / {part.partNumber}
      </div>

      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">{part.categoryName || 'OEM part'}</span>
          <h1>{part.partNumber}</h1>
          <p>{part.manufacturerName ? `${part.manufacturerName} ` : ''}{part.name || 'Farm equipment part'}</p>
          {part.description && <p style={{ marginTop: 10 }}>{part.description}</p>}
          <div className="notice">
            Fitment and replacement relationships are shown only where a source record is attached. Always confirm serial number and machine configuration before ordering.
          </div>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            <a href="#part-details">Part details</a>
            {part.relations.length > 0 && <a href="#cross-references">Replacements & cross references</a>}
            <a href="#fitment">Compatible equipment</a>
            {sources.length > 0 && <a href="#sources">Sources</a>}
          </aside>

          <div>
            <section className="data-section" id="part-details">
              <h2>Part details</h2>
              <div className="placeholder-row"><span>Part number</span><span>{part.partNumber}</span></div>
              {part.manufacturerName && <div className="placeholder-row"><span>Manufacturer</span><span>{part.manufacturerName}</span></div>}
              {part.name && <div className="placeholder-row"><span>Description</span><span>{part.name}</span></div>}
              {part.categoryName && <div className="placeholder-row"><span>Category</span><span>{part.categoryName}</span></div>}
              <div className="placeholder-row"><span>Verified fitments</span><span>{part.fitmentCount}</span></div>
            </section>

            {part.relations.length > 0 && (
              <section className="data-section" id="cross-references">
                <h2>Replacements & cross references</h2>
                <p className="section-note">Direction matters: “Replaced by” points from a legacy number to the current substitute; “Replaces” identifies older numbers superseded by this part.</p>
                {part.relations.map((relation, index) => (
                  <div className="placeholder-row" key={`${relation.direction}-${relation.relationType}-${relation.normalizedPartNumber}-${index}`}>
                    <span>{relationLabel(relation)}</span>
                    <span>
                      <Link href={`/parts/${relation.normalizedPartNumber.toLowerCase()}`}>
                        {relation.partNumber}{relation.name ? ` · ${relation.name}` : ''}
                      </Link>
                    </span>
                  </div>
                ))}
              </section>
            )}

            <section className="data-section" id="fitment">
              <h2>Compatible equipment</h2>
              {part.fitments.length > 0 ? part.fitments.map((fitment, index) => {
                const serialRange = serialRangeLabel(fitment);
                return (
                  <div className="part-fitment" key={`${fitment.machineId}-${index}`}>
                    <div>
                      <Link className="part-fitment-machine" href={`/tractors/${fitment.brandSlug}/${fitment.modelSlug}`}>
                        {fitment.brand} {fitment.model}
                      </Link>
                      {serialRange && <p><strong>Serial:</strong> {serialRange}</p>}
                      {fitment.configurationNote && <p><strong>Configuration:</strong> {fitment.configurationNote}</p>}
                      {fitment.fitmentNote && <p>{fitment.fitmentNote}</p>}
                    </div>
                    {fitment.quantity !== null && <span>Qty: {fitment.quantity}</span>}
                  </div>
                );
              }) : (
                <p>No direct equipment fitment has been published for this part number. Check the replacement relationship above when available.</p>
              )}
            </section>

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                {sources.map((source) => (
                  <div className="placeholder-row" key={source.url}>
                    <span>{source.publishedDate || 'Official source'}</span>
                    <span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
