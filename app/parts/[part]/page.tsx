import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPart, type PartFitment, type PartRelation } from '@/lib/parts-service';
import { getReplacementChain } from '@/lib/replacement-chain-service';
import { getReplacementSetMembershipsForPart, getReplacementSetsForLegacyPart } from '@/lib/replacement-set-service';
import { getSourceProvenanceByUrls, type SourceProvenance } from '@/lib/source-provenance-service';
import { getAmbiguousPublishedPartNumbers } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';

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
    fitment.versionIsCurrent ? 'current version' : 'historical version',
  ].filter(Boolean).join(' · ');
}

function fitmentConfidenceLabel(fitment: PartFitment) {
  if (fitment.fitmentConfidence === 'official') return 'Official direct fitment';
  if (fitment.fitmentConfidence === 'high') return 'High-confidence reference';
  if (fitment.fitmentConfidence === 'medium') return 'Medium-confidence reference';
  return 'Low-confidence reference';
}

function fitmentSortRank(fitment: PartFitment) {
  const confidenceRank = fitment.fitmentConfidence === 'official'
    ? 0
    : fitment.fitmentConfidence === 'high'
      ? 1
      : fitment.fitmentConfidence === 'medium'
        ? 2
        : 3;
  const versionRank = fitment.versionIsCurrent ? 0 : fitment.machineVersionId === null ? 1 : 2;
  return confidenceRank * 10 + versionRank;
}

function fitmentMachineHref(fitment: PartFitment) {
  return fitment.equipmentTypeSlug === 'tractor'
    ? `/tractors/${fitment.brandSlug}/${fitment.modelSlug}`
    : `/equipment/${fitment.equipmentTypeSlug}/${fitment.brandSlug}/${fitment.modelSlug}`;
}

function sourceProvenanceLabel(source: SourceProvenance | undefined) {
  if (!source) return 'Source record';
  if (source.authorityLevel === 'official') {
    return source.sourceType === 'government'
      ? `${source.sourceName} · official government source`
      : `${source.sourceName} · official source`;
  }
  if (source.authorityLevel === 'primary') return `${source.sourceName} · primary ${source.sourceType} source`;
  return `${source.sourceName} · ${source.sourceType} reference`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) return {};

  const replacementSets = await getReplacementSetsForLegacyPart(part.id);
  const publishable = part.dataStatus === 'verified' || part.dataStatus === 'partial';
  const hasSingleReplacement = part.relations.some((relation) => relation.direction === 'outgoing' && relation.relationType === 'replaces');
  const hasReplacementSet = replacementSets.length > 0;
  const hasReplacement = hasSingleReplacement || hasReplacementSet;
  const hasComponents = part.components.length > 0;
  const title = hasReplacement
    ? `${part.manufacturerName || 'OEM'} ${part.partNumber} Replacement Part Number`
    : `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'Part'} Fitment`;
  const description = hasReplacementSet
    ? `${part.partNumber} service replacement reference showing the complete source-backed multi-part replacement set, compatible equipment and technical sources.`
    : hasSingleReplacement
      ? `${part.partNumber} replacement and supersession reference with the current OEM substitute part number, source-backed fitment${hasComponents ? ', kit contents' : ''} and technical sources.`
      : `${part.partNumber} ${part.name || 'OEM part'} reference with source-backed compatible farm equipment, fitment confidence, serial-number notes${hasComponents ? ', kit contents' : ''} and technical sources.`;

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

  const [replacementChain, replacementSets, replacementMemberships] = await Promise.all([
    getReplacementChain(part.id),
    getReplacementSetsForLegacyPart(part.id),
    getReplacementSetMembershipsForPart(part.id),
  ]);
  const relatedPartNumbers = [
    ...replacementChain.nodes.map((node) => node.normalizedPartNumber),
    ...replacementSets.flatMap((set) => set.items.map((item) => item.normalizedPartNumber)),
    ...replacementMemberships.map((membership) => membership.legacyNormalizedPartNumber),
    ...part.components.map((component) => component.normalizedPartNumber),
    ...part.includedInKits.map((kit) => kit.normalizedPartNumber),
    ...part.relations.map((relation) => relation.normalizedPartNumber),
  ];
  const ambiguousRelatedPartNumbers = await getAmbiguousPublishedPartNumbers(relatedPartNumbers);
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
        title: relation.sourceTitle || 'Part substitution source',
        publishedDate: null,
      })),
    ...replacementSets
      .filter((set) => set.sourceUrl)
      .map((set) => ({
        url: set.sourceUrl as string,
        title: set.sourceTitle || 'Service replacement-set source',
        publishedDate: null,
      })),
    ...replacementMemberships
      .filter((membership) => membership.sourceUrl)
      .map((membership) => ({
        url: membership.sourceUrl as string,
        title: membership.sourceTitle || 'Service replacement-set source',
        publishedDate: null,
      })),
    ...part.components
      .filter((component) => component.sourceUrl)
      .map((component) => ({
        url: component.sourceUrl as string,
        title: component.sourceTitle || 'Kit contents source',
        publishedDate: null,
      })),
    ...part.includedInKits
      .filter((kit) => kit.sourceUrl)
      .map((kit) => ({
        url: kit.sourceUrl as string,
        title: kit.sourceTitle || 'Kit contents source',
        publishedDate: null,
      })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());
  const provenance = await getSourceProvenanceByUrls(sources.map((source) => source.url));
  const provenanceByUrl = new Map(provenance.map((source) => [source.url, source]));
  const checkerHref = `/fitment-checker?part=${encodeURIComponent(part.partNumber)}`;
  const finalReplacement = replacementChain.nodes.at(-1);
  const categoryHref = part.categorySlug ? `/parts/category/${part.categorySlug}` : null;
  const orderedFitments = [...part.fitments].sort((a, b) => (
    a.brand.localeCompare(b.brand)
    || a.model.localeCompare(b.model, undefined, { numeric: true })
    || fitmentSortRank(a) - fitmentSortRank(b)
    || (a.configurationNote || '').localeCompare(b.configurationNote || '')
  ));

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
              <Link href={getPartReferenceHref(
                finalReplacement.normalizedPartNumber,
                finalReplacement.manufacturerSlug,
                ambiguousRelatedPartNumbers,
              )}>{finalReplacement.partNumber}</Link>
            </div>
          )}
          {replacementSets.length > 0 && (
            <div className="replacement-summary">
              <strong>Service replacement:</strong> this legacy part is replaced by a documented multi-part service set. See the required items below.
            </div>
          )}
          {replacementMemberships.length > 0 && (
            <div className="replacement-summary">
              <strong>Replacement-set component:</strong> this part is required in a documented multi-part service replacement. See the legacy part below.
            </div>
          )}
          <div className="notice">
            Fitment and replacement relationships are shown only where a source record is attached. Confidence labels distinguish direct model fitment from broader engine- or family-level references. Always confirm serial number, machine generation and configuration before ordering.
          </div>
          <Link className="tool-link" href={checkerHref}>Check this part by serial number →</Link>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            <a href="#part-details">Part details</a>
            {replacementSets.length > 0 && <a href="#service-replacement">Service replacement set</a>}
            {replacementMemberships.length > 0 && <a href="#replacement-set-membership">Used in service replacement</a>}
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
              <div className="placeholder-row"><span>Source-backed fitments</span><span>{orderedFitments.length}</span></div>
              {replacementSets.length > 0 && <div className="placeholder-row"><span>Service replacement sets</span><span>{replacementSets.length}</span></div>}
              {replacementMemberships.length > 0 && <div className="placeholder-row"><span>Service replacement memberships</span><span>{replacementMemberships.length}</span></div>}
              {part.components.length > 0 && <div className="placeholder-row"><span>Verified kit components</span><span>{part.components.length}</span></div>}
            </section>

            {replacementSets.length > 0 && (
              <section className="data-section" id="service-replacement">
                <h2>Service replacement set</h2>
                <p className="section-note">Some legacy assemblies are replaced by multiple parts rather than one superseding part number. All listed items belong to the same source-backed replacement set.</p>
                {replacementSets.map((set) => (
                  <div key={set.id} style={{ marginBottom: 22 }}>
                    <h3>{set.title}</h3>
                    {set.notes && <p className="section-note">{set.notes}</p>}
                    {set.items.map((item) => (
                      <div className="placeholder-row" key={`${set.id}-${item.normalizedPartNumber}`}>
                        <span>
                          <Link href={getPartReferenceHref(
                            item.normalizedPartNumber,
                            item.manufacturerSlug,
                            ambiguousRelatedPartNumbers,
                          )}>{item.partNumber}</Link>
                        </span>
                        <span>
                          {item.role || item.name || 'Replacement component'}
                          {item.name && item.role ? ` · ${item.name}` : ''}
                          {item.quantity !== null ? ` · Qty ${item.quantity}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}

            {replacementMemberships.length > 0 && (
              <section className="data-section" id="replacement-set-membership">
                <h2>Used in service replacement</h2>
                <p className="section-note">This part is one component of a documented multi-part service replacement. The legacy number links back to the complete required set.</p>
                {replacementMemberships.map((membership) => (
                  <div className="placeholder-row" key={`${membership.id}-${membership.legacyNormalizedPartNumber}`}>
                    <span>
                      <Link href={getPartReferenceHref(
                        membership.legacyNormalizedPartNumber,
                        membership.legacyManufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{membership.legacyPartNumber}</Link>
                    </span>
                    <span>
                      {membership.role || 'Replacement component'}
                      {membership.quantity !== null ? ` · Qty ${membership.quantity}` : ''}
                      {' · '}{membership.title}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {part.components.length > 0 && (
              <section className="data-section" id="kit-contents">
                <h2>Kit contents</h2>
                <p className="section-note">Components below are included only when the official source explicitly lists them for this kit.</p>
                {part.components.map((component) => (
                  <div className="placeholder-row" key={component.normalizedPartNumber}>
                    <span>
                      <Link href={getPartReferenceHref(
                        component.normalizedPartNumber,
                        component.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{component.partNumber}</Link>
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
                      <Link href={getPartReferenceHref(
                        kit.normalizedPartNumber,
                        kit.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{kit.partNumber}</Link>
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
                          <Link href={getPartReferenceHref(
                            node.normalizedPartNumber,
                            node.manufacturerSlug,
                            ambiguousRelatedPartNumbers,
                          )}>{node.partNumber}</Link>
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
                      <Link href={getPartReferenceHref(
                        relation.normalizedPartNumber,
                        relation.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>
                        {relation.partNumber}{relation.name ? ` · ${relation.name}` : ''}
                      </Link>
                    </span>
                  </div>
                ))}
              </section>
            )}

            <section className="data-section" id="fitment">
              <h2>Compatible equipment</h2>
              {orderedFitments.length > 0 ? orderedFitments.map((fitment, index) => {
                const serialRange = serialRangeLabel(fitment);
                const versionLabel = fitmentVersionLabel(fitment);
                const modelCheckerHref = `/fitment-checker?part=${encodeURIComponent(part.partNumber)}&model=${encodeURIComponent(fitment.model)}`;
                const machineHref = fitmentMachineHref(fitment);
                return (
                  <div className="part-fitment" key={`${fitment.machineId}-${fitment.machineVersionId ?? 'generic'}-${index}`}>
                    <div>
                      <Link className="part-fitment-machine" href={machineHref}>
                        {fitment.brand} {fitment.model}
                      </Link>
                      <p><strong>Equipment type:</strong> {fitment.equipmentType}</p>
                      <p><strong>Fitment confidence:</strong> {fitmentConfidenceLabel(fitment)}</p>
                      {versionLabel && <p><strong>Version:</strong> {versionLabel}</p>}
                      {serialRange && <p><strong>Serial:</strong> {serialRange}</p>}
                      {fitment.configurationNote && <p><strong>Configuration:</strong> {fitment.configurationNote}</p>}
                      {fitment.fitmentNote && <p>{fitment.fitmentNote}</p>}
                      {fitment.sourceUrl && (
                        <p>
                          <strong>Source:</strong>{' '}
                          <a href={fitment.sourceUrl} target="_blank" rel="noopener noreferrer">
                            {fitment.sourceTitle || 'Fitment source'}{fitment.sourcePublishedDate ? ` · ${fitment.sourcePublishedDate}` : ''}
                          </a>
                        </p>
                      )}
                      <p>
                        <Link href={machineHref}>View machine specs →</Link>
                        {' · '}
                        <Link href={modelCheckerHref}>Check a serial number for this model →</Link>
                      </p>
                    </div>
                    {fitment.quantity !== null && <span>Qty: {fitment.quantity}</span>}
                  </div>
                );
              }) : (
                <p>No source-backed equipment fitment has been published for this part number. Check the replacement relationship above when available.</p>
              )}
            </section>

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                {sources.map((source) => {
                  const sourceProvenance = provenanceByUrl.get(source.url);
                  return (
                    <div className="placeholder-row" key={source.url}>
                      <span>
                        {sourceProvenanceLabel(sourceProvenance)}
                        {source.publishedDate ? ` · ${source.publishedDate}` : ''}
                      </span>
                      <span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
