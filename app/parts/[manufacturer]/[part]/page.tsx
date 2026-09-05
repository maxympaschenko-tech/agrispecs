import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getPart, type PartFitment, type PartRelation } from '@/lib/parts-service';
import { getAmbiguousPublishedPartNumbers, getPublishedPartNumberMatchCount } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ manufacturer: string; part: string }>;
};

function isPublished(status: string) {
  return status === 'partial' || status === 'verified';
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

function fitmentConfidenceRank(fitment: PartFitment) {
  if (fitment.fitmentConfidence === 'official') return 0;
  if (fitment.fitmentConfidence === 'high') return 1;
  if (fitment.fitmentConfidence === 'medium') return 2;
  return 3;
}

function fitmentMachineHref(fitment: PartFitment) {
  return fitment.equipmentTypeSlug === 'tractor'
    ? `/tractors/${fitment.brandSlug}/${fitment.modelSlug}`
    : `/equipment/${fitment.equipmentTypeSlug}/${fitment.brandSlug}/${fitment.modelSlug}`;
}

function relationLabel(relation: PartRelation) {
  if (relation.relationType === 'replaces') return relation.direction === 'outgoing' ? 'Replaced by' : 'Replaces';
  if (relation.relationType === 'supersedes') return relation.direction === 'outgoing' ? 'Superseded by' : 'Supersedes';
  if (relation.relationType === 'alternative') return 'Alternative';
  return 'Cross reference';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { manufacturer, part: slug } = await params;
  const part = await getPart(slug, manufacturer);
  if (!part || !isPublished(part.dataStatus)) return {};

  const matchCount = await getPublishedPartNumberMatchCount(part.normalizedPartNumber);
  const canonical = matchCount > 1 && part.manufacturerSlug
    ? `/parts/${part.manufacturerSlug}/${part.normalizedPartNumber.toLowerCase()}`
    : `/parts/${part.normalizedPartNumber.toLowerCase()}`;

  return {
    title: `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'Part'} Fitment`,
    description: `${part.manufacturerName || 'OEM'} ${part.partNumber} source-backed farm equipment part reference with documented fitment, replacement and cross-reference data where available.`,
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function ManufacturerPartPage({ params }: PageProps) {
  const { manufacturer, part: slug } = await params;
  const part = await getPart(slug, manufacturer);
  if (!part || !isPublished(part.dataStatus) || !part.manufacturerSlug) notFound();

  const matchCount = await getPublishedPartNumberMatchCount(part.normalizedPartNumber);
  if (matchCount <= 1) {
    redirect(`/parts/${part.normalizedPartNumber.toLowerCase()}`);
  }

  const relatedPartNumbers = [
    ...part.relations.map((relation) => relation.normalizedPartNumber),
    ...part.components.map((component) => component.normalizedPartNumber),
    ...part.includedInKits.map((kit) => kit.normalizedPartNumber),
  ];
  const ambiguousRelatedPartNumbers = await getAmbiguousPublishedPartNumbers(relatedPartNumbers);

  const orderedFitments = [...part.fitments].sort((a, b) => (
    a.brand.localeCompare(b.brand)
    || a.model.localeCompare(b.model, undefined, { numeric: true })
    || fitmentConfidenceRank(a) - fitmentConfidenceRank(b)
  ));

  const sourceEntries = [
    ...part.fitments
      .filter((fitment) => fitment.sourceUrl)
      .map((fitment) => ({ url: fitment.sourceUrl as string, title: fitment.sourceTitle || 'Technical fitment source' })),
    ...part.relations
      .filter((relation) => relation.sourceUrl)
      .map((relation) => ({ url: relation.sourceUrl as string, title: relation.sourceTitle || 'Part relationship source' })),
    ...part.components
      .filter((component) => component.sourceUrl)
      .map((component) => ({ url: component.sourceUrl as string, title: component.sourceTitle || 'Kit contents source' })),
    ...part.includedInKits
      .filter((kit) => kit.sourceUrl)
      .map((kit) => ({ url: kit.sourceUrl as string, title: kit.sourceTitle || 'Kit contents source' })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());
  const categoryHref = part.categorySlug ? `/parts/category/${part.categorySlug}` : null;

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link>
        {part.manufacturerName ? <> / {part.manufacturerName}</> : null}
        {' / '}{part.partNumber}
      </div>

      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">Manufacturer-qualified part record</span>
          <h1>{part.manufacturerName} {part.partNumber}</h1>
          <p>{part.name || 'Farm equipment part'}</p>
          {part.description && <p style={{ marginTop: 10 }}>{part.description}</p>}
          <div className="notice">
            This manufacturer-qualified URL is used because the same normalized part number exists in more than one published manufacturer record. Fitment and replacement data below belongs only to {part.manufacturerName}.
          </div>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            <a href="#part-details">Part details</a>
            {part.relations.length > 0 && <a href="#cross-references">Replacements & cross references</a>}
            {part.components.length > 0 && <a href="#kit-contents">Kit contents</a>}
            {part.includedInKits.length > 0 && <a href="#included-in-kits">Included in kits</a>}
            <a href="#fitment">Compatible equipment</a>
            {sources.length > 0 && <a href="#sources">Sources</a>}
          </aside>

          <div>
            <section className="data-section" id="part-details">
              <h2>Part details</h2>
              <div className="placeholder-row"><span>Manufacturer</span><span>{part.manufacturerName}</span></div>
              <div className="placeholder-row"><span>Part number</span><span>{part.partNumber}</span></div>
              {part.name && <div className="placeholder-row"><span>Description</span><span>{part.name}</span></div>}
              {part.categoryName && (
                <div className="placeholder-row">
                  <span>Category</span>
                  <span>{categoryHref ? <Link href={categoryHref}>{part.categoryName}</Link> : part.categoryName}</span>
                </div>
              )}
              <div className="placeholder-row"><span>Documented fitments</span><span>{orderedFitments.length}</span></div>
            </section>

            {part.relations.length > 0 && (
              <section className="data-section" id="cross-references">
                <h2>Replacements & cross references</h2>
                {part.relations.map((relation, index) => (
                  <div className="placeholder-row" key={`${relation.direction}-${relation.relationType}-${relation.normalizedPartNumber}-${index}`}>
                    <span>{relationLabel(relation)}</span>
                    <span>
                      <Link href={getPartReferenceHref(
                        relation.normalizedPartNumber,
                        relation.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{relation.partNumber}</Link>
                      {relation.manufacturerName ? ` · ${relation.manufacturerName}` : ''}
                      {relation.name ? ` · ${relation.name}` : ''}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {part.components.length > 0 && (
              <section className="data-section" id="kit-contents">
                <h2>Kit contents</h2>
                <p className="section-note">Components appear only where a source-backed kit relationship is recorded.</p>
                {part.components.map((component) => (
                  <div className="placeholder-row" key={component.normalizedPartNumber}>
                    <span>
                      <Link href={getPartReferenceHref(
                        component.normalizedPartNumber,
                        component.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{component.partNumber}</Link>
                    </span>
                    <span>{component.name || 'OEM component'}{component.quantity !== null ? ` · Qty ${component.quantity}` : ''}</span>
                  </div>
                ))}
              </section>
            )}

            {part.includedInKits.length > 0 && (
              <section className="data-section" id="included-in-kits">
                <h2>Included in kits</h2>
                {part.includedInKits.map((kit) => (
                  <div className="placeholder-row" key={kit.normalizedPartNumber}>
                    <span>
                      <Link href={getPartReferenceHref(
                        kit.normalizedPartNumber,
                        kit.manufacturerSlug,
                        ambiguousRelatedPartNumbers,
                      )}>{kit.partNumber}</Link>
                    </span>
                    <span>{kit.name || 'Maintenance kit'}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="data-section" id="fitment">
              <h2>Compatible equipment</h2>
              {orderedFitments.length === 0 ? (
                <p className="section-note">No published direct machine fitment is recorded for this manufacturer-specific part yet.</p>
              ) : (
                orderedFitments.map((fitment, index) => {
                  const serialRange = serialRangeLabel(fitment);
                  const versionLabel = fitmentVersionLabel(fitment);
                  return (
                    <div className="fitment-item" key={`${fitment.machineId}-${index}`}>
                      <h3><Link href={fitmentMachineHref(fitment)}>{fitment.brand} {fitment.model}</Link></h3>
                      <p>{fitment.equipmentType} · {fitmentConfidenceLabel(fitment)}</p>
                      {versionLabel && <p><strong>Version:</strong> {versionLabel}</p>}
                      {serialRange && <p><strong>Serial range:</strong> {serialRange}</p>}
                      {fitment.configurationNote && <p><strong>Configuration:</strong> {fitment.configurationNote}</p>}
                      {fitment.fitmentNote && <p>{fitment.fitmentNote}</p>}
                      {fitment.sourceUrl && (
                        <p>
                          <a href={fitment.sourceUrl} target="_blank" rel="noopener noreferrer">
                            {fitment.sourceTitle || 'Open fitment source'}
                          </a>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                <p className="section-note">Manufacturer-specific fitment and relationship claims above are tied to these recorded technical sources.</p>
                <ul className="source-list">
                  {sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
