import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPart, type PartFitment, type PartRelation } from '@/lib/parts-service';
import { getReplacementChain } from '@/lib/replacement-chain-service';

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

function fitmentVersionLabel(fitment: PartFitment) {
  if (fitment.machineVersionId === null) return null;
  const years = fitment.versionModelYearStart && fitment.versionModelYearEnd
    ? `MY${fitment.versionModelYearStart}-${fitment.versionModelYearEnd}`
    : fitment.versionModelYearStart
      ? `MY${fitment.versionModelYearStart}+`
      : null;
  return [
    fitment.versionMarketName,
    years,
    fitment.versionConfiguration,
    fitment.versionIsCurrent ? 'current version' : null,
  ].filter(Boolean).join(' · ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) return {};

  const publishable = part.dataStatus === 'verified' || part.dataStatus === 'partial';
  const hasReplacement = part.relations.some((relation) => relation.direction === 'outgoing' && relation.relationType === 'replaces');
  const hasComponents = part.components.length > 0;
  const title = hasReplacement
    ? `${part.manufacturerName || 'OEM'} ${part.partNumber} Replacement Part Number`
    : `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'Part'} Fitment`;
  const description = hasReplacement
    ? `${part.partNumber} replacement and supersession reference with the current OEM substitute part number, verified fitment${hasComponents ? ', kit contents' : ''} and official source.`
    : `${part.partNumber} ${part.name || 'OEM part'} reference with verified compatible farm equipment, serial-number fitment notes${hasComponents ? ', kit contents' : ''} and technical sources.`;

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

  const replacementChain = await getReplacementChain(part.id);
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
    ...part.components
      .filter((component) => component.sourceUrl)
      .map((component) => ({
        url: component.sourceUrl as string,
        title: component.sourceTitle || 'Official kit contents source',
        publishedDate: null,
      })),
    ...part.includedInKits
      .filter((kit) => kit.sourceUrl)
      .map((kit) => ({
        url: kit.sourceUrl as string,
        title: kit.sourceTitle || 'Official kit contents source',
        publishedDate: null,
      })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());
  const checkerHref = `/fitment-checker?part=${encodeURIComponent(part.partNumber)}`;
  const finalReplacement = replacementChain.nodes.at(-1);
  const categoryHref = part.categorySlug ? `/parts/category/${part.categorySlug}` : null;

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link>
        {categoryHref && part.categoryName ? <> / <Link href={categoryHref}>{part.categoryName}</Link></> : null}
        {' / '}{part.partNumber}
      </div>

      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">{part.categoryName || 'OEM part'}</span>
          <h1>{part.partNumber}</h1>
          <p>{part.manufacturerName ? `${part.manufacturerName} ` : ''}{part.name || 'Farm equipment part'}</p>
          {part.description && <p style={{ marginTop: 10 }}>{part.description}</p>}
          {finalReplacement && (
            <div className="replacement-summary">
              <strong>Current replacement chain ends at:</strong>{' '}
              <Link href={`/parts/${finalReplacement.normalizedPartNumber.toLowerCase()}`}>{finalReplacement.partNumber}</Link>
            </div>
          )}
          <div className="notice">
            Fitment and replacement relationships are shown only where a source record is attached. Always confirm serial number, machine generation and configuration before ordering.
          </div>
          <Link className="tool-link" href={checkerHref}>Check this part by serial number →</Link>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            <a href="#part-details">Part details</a>
            {part.components.length > 0 && <a href="#kit-contents">Kit contents</a>}
            {part.includedInKits.length > 0 && <a href="#included-in-kits">Included in Filter Paks</a>}
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
              {part.categoryName && (
                <div className="placeholder-row">
                  <span>Category</span>
                  <span>{categoryHref ? <Link href={categoryHref}>{part.categoryName}</Link> : part.categoryName}</span>
                </div>
              )}
              <div className="placeholder-row"><span>Verified fitments</span><span>{part.fitmentCount}</span></div>
              {part.components.length > 0 && <div className="placeholder-row"><span>Verified kit components</span><span>{part.components.length}</span></div>}
            </section>

            {part.components.length > 0 && (
              <section className="data-section" id="kit-contents">
                <h2>Kit contents</h2>
                <p className="section-note">Components below are included only when the official source explicitly lists them for this kit.</p>
                {part.components.map((component) => (
                  <div className="placeholder-row" key={component.normalizedPartNumber}>
                    <span>
                      <Link href={`/parts/${component.normalizedPartNumber.toLowerCase()}`}>{component.partNumber}</Link>
                    </span>
                    <span>
                      {component.name || 'OEM component'}
                      {component.quantity !== null ? ` · Qty ${component.quantity}` : ''}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {part.includedInKits.length > 0 && (
              <section className="data-section" id="included-in-kits">
                <h2>Included in Filter Paks</h2>
                <p className="section-note">Official kits currently recorded as containing this part.</p>
                {part.includedInKits.map((kit) => (
                  <div className="placeholder-row" key={kit.normalizedPartNumber}>
                    <span>
                      <Link href={`/parts/${kit.normalizedPartNumber.toLowerCase()}`}>{kit.partNumber}</Link>
                    </span>
                    <span>{kit.name || 'Filter Pak'}</span>
                  </div>
                ))}
              </section>
            )}

            {part.relations.length > 0 && (
              <section className="data-section" id="cross-references">
                <h2>Replacements & cross references</h2>
                <p className="section-note">Direction matters: “Replaced by” points from a legacy number to the current substitute; “Replaces” identifies older numbers superseded by this part.</p>
                {replacementChain.nodes.length > 0 && (
                  <div className="replacement-chain" aria-label="Verified replacement chain">
                    <strong>Verified replacement chain</strong>
                    <div>
                      <Link href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>{part.partNumber}</Link>
                      {replacementChain.nodes.map((node) => (
                        <span key={node.id}>
                          <b>→</b>
                          <Link href={`/parts/${node.normalizedPartNumber.toLowerCase()}`}>{node.partNumber}</Link>
                        </span>
                      ))}
                    </div>
                    {!replacementChain.complete && (
                      <small>{replacementChain.ambiguous ? 'The chain branches or loops after this point, so no single final replacement is asserted.' : 'The verified chain continues beyond the current depth limit.'}</small>
                    )}
                  </div>
                )}
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
                const versionLabel = fitmentVersionLabel(fitment);
                const modelCheckerHref = `/fitment-checker?part=${encodeURIComponent(part.partNumber)}&model=${encodeURIComponent(fitment.model)}`;
                return (
                  <div className="part-fitment" key={`${fitment.machineId}-${fitment.machineVersionId ?? 'generic'}-${index}`}>
                    <div>
                      <Link className="part-fitment-machine" href={`/tractors/${fitment.brandSlug}/${fitment.modelSlug}`}>
                        {fitment.brand} {fitment.model}
                      </Link>
                      {versionLabel && <p><strong>Version:</strong> {versionLabel}</p>}
                      {serialRange && <p><strong>Serial:</strong> {serialRange}</p>}
                      {fitment.configurationNote && <p><strong>Configuration:</strong> {fitment.configurationNote}</p>}
                      {fitment.fitmentNote && <p>{fitment.fitmentNote}</p>}
                      <p><Link href={modelCheckerHref}>Check a serial number for this model →</Link></p>
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
