import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMachine, getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';
import { getMachineImages } from '@/lib/machine-images-service';
import { getMachinePartsWithConfigurations } from '@/lib/machine-parts-service';
import { getMachineMaintenance } from '@/lib/maintenance-service';
import { getMachineCapacities } from '@/lib/capacities-service';
import { getMachineAttachments } from '@/lib/attachments-service';
import { getSourceProvenanceByUrls, type SourceProvenance } from '@/lib/source-provenance-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ brand: string; model: string }>;
};

type VersionScopedRecord = {
  machineVersionId: number | null;
  versionMarketName: string | null;
  versionModelYearStart: number | null;
  versionModelYearEnd: number | null;
  versionConfiguration: string | null;
  versionIsCurrent: boolean | null;
  sourcePublishedDate: string | null;
};

const sectionOrder = [
  'Machine Configuration',
  'Engine',
  'Transmission',
  'PTO',
  'Hydraulics',
  'Dimensions & Weight',
  'Capacities',
  'Steering & Brakes',
  'Electrical',
];

function sectionId(section: string) {
  return section.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function attachmentTypeLabel(type: string) {
  if (type === 'front-loader') return 'Front loader';
  if (type === 'backhoe') return 'Backhoe';
  return type
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Attachment';
}

function hasConfigurationCondition(note: string | null) {
  if (!note) return false;
  return /\b(requires?|required|restricted|only|depending|must|except|2wd|mfwd|specific (?:axle|configuration|transmission))\b/i.test(note);
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

function maintenanceConfidenceLabel(value: 'official' | 'high' | 'medium' | 'low') {
  if (value === 'official') return 'Official source';
  if (value === 'high') return 'High-confidence source-backed interval';
  if (value === 'medium') return 'Medium-confidence reference';
  return 'Low-confidence reference — verify before service';
}

function trimNumber(value: number, digits = 1) {
  const rounded = Number(value.toFixed(digits));
  return String(rounded);
}

function formatSpecValue(spec: MachineSpec) {
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return 'Not available';

  const value = spec.valueNumber;

  if (spec.unit === 'kW') {
    return `${trimNumber(value * 1.34102209, 1)} hp (${trimNumber(value, 1)} kW)`;
  }

  if (spec.unit === 'L/min') {
    return `${trimNumber(value / 3.785411784, 1)} gpm (${trimNumber(value, 1)} L/min)`;
  }

  if (spec.specKey === 'capacities.fuel_tank' && spec.unit === 'L') {
    return `${trimNumber(value / 3.785411784, 1)} US gal (${trimNumber(value, 1)} L)`;
  }

  return `${trimNumber(value, Number.isInteger(value) ? 0 : 1)}${spec.unit ? ` ${spec.unit}` : ''}`;
}

function formatCapacity(value: number, unit: string) {
  if (unit !== 'L') return `${trimNumber(value, 1)} ${unit}`;
  if (value < 4) return `${trimNumber(value * 1.056688, 1)} US qt (${trimNumber(value, 1)} L)`;
  return `${trimNumber(value / 3.785411784, 1)} US gal (${trimNumber(value, 1)} L)`;
}

function versionContext(record: VersionScopedRecord) {
  if (record.machineVersionId === null) return null;

  const years = record.versionModelYearStart && record.versionModelYearEnd
    ? `MY${record.versionModelYearStart}-${record.versionModelYearEnd}`
    : record.versionModelYearStart
      ? `MY${record.versionModelYearStart}+`
      : null;

  const published = record.sourcePublishedDate ? `source ${record.sourcePublishedDate}` : null;
  const current = record.versionIsCurrent ? 'current version' : null;

  return [
    record.versionMarketName,
    years,
    record.versionConfiguration,
    current,
    published,
  ].filter(Boolean).join(' · ');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
  if (!machine) return {};

  const publishable = machine.dataStatus === 'partial' || machine.dataStatus === 'verified';
  const images = await getMachineImages(machine.id);
  const primaryImage = images.find((image) => image.isPrimary) || images[0];

  return {
    title: `${machine.title} Specs, Parts and Maintenance`,
    description: `${machine.title} specifications, maintenance information, compatible parts, fluids, filters, attachments and reference data.`,
    alternates: { canonical: `/tractors/${machine.brandSlug}/${machine.modelSlug}` },
    robots: publishable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: primaryImage
      ? {
          title: `${machine.title} Specs, Parts and Maintenance`,
          description: `${machine.title} specifications, parts and maintenance reference.`,
          images: [{ url: primaryImage.imageUrl, alt: primaryImage.altText || machine.title }],
        }
      : undefined,
  };
}

export default async function TractorModelPage({ params }: PageProps) {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
  if (!machine) notFound();

  const versions = await getMachineVersions(machine.id);
  const selectedVersion = versions.find((version) => version.specCount > 0) || versions[0];

  const [images, machineParts, maintenance, capacities, attachments, specs] = await Promise.all([
    getMachineImages(machine.id),
    getMachinePartsWithConfigurations(machine.id, selectedVersion?.id),
    getMachineMaintenance(machine.id),
    getMachineCapacities(machine.id),
    getMachineAttachments(machine.id),
    selectedVersion ? getMachineSpecs(machine.id, selectedVersion.id) : Promise.resolve([]),
  ]);

  const primaryImage = images.find((image) => image.isPrimary) || images[0];
  const verifiedParts = machineParts.filter((part) => part.dataStatus === 'verified' || part.dataStatus === 'partial');

  const specsBySection = new Map<string, MachineSpec[]>();
  for (const spec of specs) {
    const group = specsBySection.get(spec.section) || [];
    group.push(spec);
    specsBySection.set(spec.section, group);
  }

  const availableSections = sectionOrder.filter((section) => specsBySection.has(section));
  const sourceEntries = [
    ...specs.filter((spec) => spec.sourceUrl).map((spec) => ({
      url: spec.sourceUrl as string,
      title: spec.sourceTitle || 'Technical source',
      publishedDate: spec.sourcePublishedDate,
    })),
    ...maintenance.filter((task) => task.sourceUrl).map((task) => ({
      url: task.sourceUrl as string,
      title: task.sourceTitle || 'Maintenance source',
      publishedDate: task.sourcePublishedDate,
    })),
    ...capacities.filter((capacity) => capacity.sourceUrl).map((capacity) => ({
      url: capacity.sourceUrl as string,
      title: capacity.sourceTitle || 'Capacity source',
      publishedDate: capacity.sourcePublishedDate,
    })),
    ...attachments.filter((attachment) => attachment.sourceUrl).map((attachment) => ({
      url: attachment.sourceUrl as string,
      title: attachment.sourceTitle || 'Attachment compatibility source',
      publishedDate: null,
    })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());
  const provenance = await getSourceProvenanceByUrls(sources.map((source) => source.url));
  const provenanceByUrl = new Map(provenance.map((source) => [source.url, source]));

  const versionYears = selectedVersion
    ? selectedVersion.modelYearStart && selectedVersion.modelYearEnd
      ? `MY${selectedVersion.modelYearStart}-${selectedVersion.modelYearEnd}`
      : selectedVersion.modelYearStart
        ? `MY${selectedVersion.modelYearStart}-current`
        : null
    : null;

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/tractors">Tractors</Link> / {machine.brand} / {machine.model}
      </div>
      <div className="container">
        <section className="machine-header">
          <div className={primaryImage ? 'machine-header-grid' : undefined}>
            <div>
              <span className="eyebrow">Tractor reference</span>
              <h1>{machine.title}</h1>
              <p>Specifications, maintenance, parts and compatibility reference.</p>

              {selectedVersion && (
                <div className="notice">
                  <strong>Specification set:</strong>{' '}
                  {[selectedVersion.marketName, versionYears, selectedVersion.configuration].filter(Boolean).join(' - ')}
                  {selectedVersion.notes ? ` ${selectedVersion.notes}` : ''}
                </div>
              )}

              {specs.length === 0 && (
                <div className="notice">
                  Numerical specifications are published only after source verification.
                </div>
              )}
            </div>

            {primaryImage && (
              <figure className="machine-photo">
                <img src={primaryImage.imageUrl} alt={primaryImage.altText || machine.title} loading="eager" />
                <figcaption>
                  {primaryImage.caption && <span>{primaryImage.caption} </span>}
                  Photo:{' '}
                  <a href={primaryImage.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                    {primaryImage.author || 'source'}
                  </a>
                  {primaryImage.licenseName && (
                    <>
                      {' '}·{' '}
                      {primaryImage.licenseUrl ? (
                        <a href={primaryImage.licenseUrl} target="_blank" rel="noopener noreferrer">{primaryImage.licenseName}</a>
                      ) : primaryImage.licenseName}
                    </>
                  )}
                </figcaption>
              </figure>
            )}
          </div>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            {availableSections.map((section) => (
              <a key={section} href={`#${sectionId(section)}`}>{section}</a>
            ))}
            {capacities.length > 0 && <a href="#capacities-fluids">Capacities & fluids</a>}
            {maintenance.length > 0 && <a href="#maintenance">Maintenance</a>}
            {verifiedParts.length > 0 && <a href="#parts">Parts & kits</a>}
            {attachments.length > 0 && <a href="#attachments">Attachment fitment</a>}
            {sources.length > 0 && <a href="#sources">Sources</a>}
          </aside>

          <div>
            {availableSections.map((section) => (
              <section className="data-section" id={sectionId(section)} key={section}>
                <h2>{section}</h2>
                {specsBySection.get(section)?.map((spec) => (
                  <div className="placeholder-row" key={spec.specKey}>
                    <span>{spec.label}</span>
                    <span>{formatSpecValue(spec)}</span>
                  </div>
                ))}
              </section>
            ))}

            {capacities.length > 0 && (
              <section className="data-section" id="capacities-fluids">
                <h2>Capacities & fluids</h2>
                <p className="section-note">Configuration- and generation-specific values are kept separate. Match the station, transmission, axle and version context before servicing the machine.</p>
                <div className="capacity-list">
                  {capacities.map((capacity) => {
                    const context = versionContext(capacity);
                    return (
                      <div className="capacity-row" key={capacity.id}>
                        <div>
                          <strong>{capacity.label}</strong>
                          {capacity.configuration && <span>{capacity.configuration}</span>}
                          {capacity.fluidName && <small>{capacity.fluidName}</small>}
                          {context && <small><strong>Applies to:</strong> {context}</small>}
                        </div>
                        <div>
                          <strong>{formatCapacity(capacity.valueNumber, capacity.unit)}</strong>
                          {capacity.notes && <small>{capacity.notes}</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {maintenance.length > 0 && (
              <section className="data-section" id="maintenance">
                <h2>Maintenance schedule</h2>
                <p className="section-note">Tasks are ordered by service interval within each machine-version context. Intervals are tied to the cited maintenance source, and each task shows its evidence confidence. Operating conditions and serial-number ranges can change the required service.</p>
                <div className="maintenance-list">
                  {maintenance.map((task) => {
                    const context = versionContext(task);
                    return (
                      <div className="maintenance-row" key={task.id}>
                        <div>
                          <span className="maintenance-section">{task.section}</span>
                          <strong>{task.action} {task.title.toLowerCase()}</strong>
                          {task.partNumber && (
                            <Link href={`/parts/${task.partNumber.toLowerCase()}`}>{task.partNumber}{task.partName ? ` · ${task.partName}` : ''}</Link>
                          )}
                          {context && <small><strong>Applies to:</strong> {context}</small>}
                          <small><strong>Evidence:</strong> {maintenanceConfidenceLabel(task.confidence)}</small>
                          {task.sourceUrl && (
                            <small>
                              <strong>Source:</strong>{' '}
                              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer">{task.sourceTitle || 'Maintenance source'} →</a>
                            </small>
                          )}
                          {task.notes && <small>{task.notes}</small>}
                        </div>
                        <div>
                          <strong>{task.intervalText}</strong>
                          {task.initialIntervalHours !== null && <span>Initial service: {task.initialIntervalHours} hours</span>}
                          {task.capacityValue !== null && <span>Capacity: {trimNumber(task.capacityValue, 1)} {task.capacityUnit || ''}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {verifiedParts.length > 0 && (
              <section className="data-section" id="parts">
                <h2>Compatible parts & kits</h2>
                <p className="section-note">This source-backed list can include maintenance parts, mounting hardware and accessory kits. Configuration-specific fitment is shown directly under each part when available; still review the part page for serial-number, build and source details before ordering or installing.</p>
                <div className="parts-list">
                  {verifiedParts.map((part) => (
                    <Link className="part-row" key={part.id} href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
                      <span>
                        <strong>{part.partNumber}</strong>
                        <small>{part.name || part.categoryName || 'OEM part'}</small>
                        {part.configurationNotes.map((note) => (
                          <small key={note}><strong>Applies to:</strong> {note}</small>
                        ))}
                      </span>
                      <span>{part.categoryName || 'Part'} →</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {attachments.length > 0 && (
              <section className="data-section" id="attachments">
                <h2>Verified attachment fitment</h2>
                <p className="section-note">Attachment fitment is stored separately from service parts. A listed attachment may still require a specific axle, driveline, transmission or tractor configuration; verify the requirement below before ordering or installing.</p>
                <div className="maintenance-list">
                  {attachments.map((attachment) => {
                    const typeLabel = attachmentTypeLabel(attachment.attachmentType);
                    const isLoader = attachment.attachmentType === 'front-loader';
                    const conditional = hasConfigurationCondition(attachment.compatibilityNote);
                    return (
                      <div className="maintenance-row" key={attachment.id}>
                        <div>
                          <span className="maintenance-section">{typeLabel}{conditional ? ' · Conditional fitment' : ''}</span>
                          <strong><Link href={`/attachments/${machine.brandSlug}/${attachment.slug}`}>{machine.brand} {attachment.modelName}</Link></strong>
                          {attachment.compatibilityNote && <small><strong>{conditional ? 'Requirement' : 'Fitment note'}:</strong> {attachment.compatibilityNote}</small>}
                          {attachment.configurationText && <small><strong>{typeLabel} details:</strong> {attachment.configurationText}</small>}
                        </div>
                        <div>
                          {attachment.liftCapacityText && <strong>{attachment.liftCapacityText}</strong>}
                          {attachment.liftHeightText && <span>{isLoader ? 'Lift height' : 'Working height'}: {attachment.liftHeightText}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                {sources.map((source) => (
                  <div className="placeholder-row" key={source.url}>
                    <span>{source.publishedDate || sourceProvenanceLabel(provenanceByUrl.get(source.url))}</span>
                    <span>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
                    </span>
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
