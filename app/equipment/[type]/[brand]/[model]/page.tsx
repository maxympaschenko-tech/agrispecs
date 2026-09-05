import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByBrand, getEquipmentMachine } from '@/lib/equipment-service';
import { getMachineAttachments, getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';
import { getMachineImages } from '@/lib/machine-images-service';
import { getMachinePartsWithConfigurations } from '@/lib/machine-parts-service';
import { getAmbiguousPublishedPartNumbers } from '@/lib/part-identity-service';
import { getPartReferenceHref } from '@/lib/part-url';
import { groupAttachmentEvidence, uniqueEvidenceValues } from '@/lib/attachment-evidence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string; brand: string; model: string }>;
};

const sectionOrder = [
  'Machine Configuration',
  'Engine',
  'Loader Performance',
  'Excavator Performance',
  'Backhoe Performance',
  'Cotton Harvesting System',
  'Module Builder',
  'Windrower System',
  'Cutting System',
  'Conditioning System',
  'Raking System',
  'Tedding System',
  'Harvesting System',
  'Header Connection',
  'Kernel Processing',
  'Planting System',
  'Seeding System',
  'Air Cart System',
  'Tillage System',
  'Strip-Till System',
  'Nutrient Application System',
  'Liquid Application System',
  'Dry Application System',
  'Application System',
  'Bale Formation',
  'Pickup & Feeding',
  'Wrapping System',
  'Tying System',
  'Precision Technology',
  'Tractor Requirements',
  'Travel',
  'Feeding',
  'Threshing & Separating',
  'Cleaning',
  'Grain Handling',
  'Transmission',
  'PTO',
  'Hydraulics',
  'Dimensions & Transport',
  'Dimensions & Weight',
  'Capacities',
  'Steering & Brakes',
  'Electrical',
];

function sectionId(section: string) {
  return section.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function trimNumber(value: number, digits = 1) {
  return String(Number(value.toFixed(digits)));
}

function formatSpecValue(spec: MachineSpec) {
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return 'Not available';
  const value = spec.valueNumber;
  if (spec.unit === 'kW') return `${trimNumber(value * 1.34102209, 1)} hp (${trimNumber(value, 1)} kW)`;
  if (spec.unit === 'L/min') return `${trimNumber(value / 3.785411784, 1)} gpm (${trimNumber(value, 1)} L/min)`;
  return `${trimNumber(value, Number.isInteger(value) ? 0 : 1)}${spec.unit ? ` ${spec.unit}` : ''}`;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function absoluteUrl(baseUrl: string, value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}

function formatAttachmentType(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAttachmentConfidence(value: 'official' | 'high' | 'medium' | 'low') {
  if (value === 'official') return 'Official fitment';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} confidence`;
}

function formatPartFitmentConfidence(value: 'official' | 'high' | 'medium' | 'low') {
  if (value === 'official') return 'Official direct fitment';
  if (value === 'high') return 'High-confidence source-backed fitment';
  if (value === 'medium') return 'Medium-confidence fitment reference';
  return 'Low-confidence fitment reference — verify before ordering';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) return {};
  const publishable = machine.dataStatus === 'partial' || machine.dataStatus === 'verified';
  const images = publishable ? await getMachineImages(machine.id) : [];
  const primaryImage = images.find((image) => image.isPrimary) || images[0];
  const exactPrimaryImage = primaryImage?.imageKind === 'exact' ? primaryImage : undefined;
  return {
    title: `${machine.title} ${machine.equipmentType} Specs`,
    description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications, configuration and source-backed market reference data.`,
    alternates: { canonical: `/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}` },
    robots: publishable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: exactPrimaryImage
      ? {
          title: `${machine.title} ${machine.equipmentType} Specs`,
          description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications and source-backed market reference data.`,
          images: [{ url: exactPrimaryImage.imageUrl, alt: exactPrimaryImage.altText || machine.title }],
        }
      : undefined,
  };
}

export default async function EquipmentModelPage({ params }: PageProps) {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) notFound();

  const [versions, brandEquipment, attachments, images] = await Promise.all([
    getMachineVersions(machine.id),
    getNonTractorEquipmentByBrand(machine.brandSlug),
    getMachineAttachments(machine.id),
    getMachineImages(machine.id),
  ]);
  const attachmentGroups = groupAttachmentEvidence(attachments);
  const selectedVersion = versions.find((version) => version.isCurrent)
    || versions.find((version) => version.specCount > 0)
    || versions[0];
  const [specs, machineParts] = await Promise.all([
    selectedVersion ? getMachineSpecs(machine.id, selectedVersion.id) : Promise.resolve([]),
    getMachinePartsWithConfigurations(machine.id, selectedVersion?.id),
  ]);
  const publishedParts = machineParts.filter((part) => part.dataStatus === 'partial' || part.dataStatus === 'verified');
  const ambiguousPartNumbers = await getAmbiguousPublishedPartNumbers(
    publishedParts.map((part) => part.normalizedPartNumber),
  );
  const primaryImage = images.find((image) => image.isPrimary) || images[0];
  const exactPrimaryImage = primaryImage?.imageKind === 'exact' ? primaryImage : undefined;
  const specsBySection = new Map<string, MachineSpec[]>();
  for (const spec of specs) {
    const group = specsBySection.get(spec.section) || [];
    group.push(spec);
    specsBySection.set(spec.section, group);
  }
  const orderedSections = [
    ...sectionOrder.filter((section) => specsBySection.has(section)),
    ...Array.from(specsBySection.keys()).filter((section) => !sectionOrder.includes(section)),
  ];
  const sourceEntries = [
    ...specs.filter((spec) => spec.sourceUrl).map((spec) => ({
      url: spec.sourceUrl as string,
      title: spec.sourceTitle || 'Manufacturer source',
      publishedDate: spec.sourcePublishedDate,
    })),
    ...publishedParts.flatMap((part) => part.fitmentEvidence
      .filter((evidence) => evidence.sourceUrl)
      .map((evidence) => ({
        url: evidence.sourceUrl as string,
        title: evidence.sourceTitle || `${part.partNumber} fitment source`,
        publishedDate: null,
      }))),
    ...attachments.filter((attachment) => attachment.sourceUrl).map((attachment) => ({
      url: attachment.sourceUrl as string,
      title: attachment.sourceTitle || 'Attachment compatibility source',
      publishedDate: null,
    })),
  ];
  const sources = Array.from(new Map(sourceEntries.map((source) => [source.url, source])).values());
  const relatedModels = brandEquipment
    .filter((item) =>
      item.id !== machine.id
      && item.equipmentTypeSlug === machine.equipmentTypeSlug
      && (item.dataStatus === 'partial' || item.dataStatus === 'verified'),
    )
    .slice(0, 6);

  const versionYears = selectedVersion
    ? selectedVersion.modelYearStart && selectedVersion.modelYearEnd
      ? `MY${selectedVersion.modelYearStart}-${selectedVersion.modelYearEnd}`
      : selectedVersion.modelYearStart
        ? `MY${selectedVersion.modelYearStart}+`
        : null
    : null;
  const referenceContext = selectedVersion
    ? [
        selectedVersion.marketName,
        versionYears,
        selectedVersion.configuration,
        selectedVersion.isCurrent ? 'Current' : null,
      ].filter(Boolean).join(' · ')
    : null;
  const additionalProperty = [
    referenceContext
      ? { '@type': 'PropertyValue', name: 'Reference context', value: referenceContext }
      : null,
    ...specs.map((spec) => (
      spec.valueText || spec.valueNumber !== null
        ? { '@type': 'PropertyValue', name: spec.label, value: formatSpecValue(spec) }
        : null
    )),
  ].filter(Boolean);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${machine.title} ${machine.equipmentType} Specs`,
        description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications and source-backed market reference data.`,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#product` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Equipment', item: `${baseUrl}/equipment` },
          { '@type': 'ListItem', position: 3, name: machine.equipmentType, item: `${baseUrl}/equipment/${machine.equipmentTypeSlug}` },
          { '@type': 'ListItem', position: 4, name: machine.brand, item: `${baseUrl}/brands/${machine.brandSlug}` },
          { '@type': 'ListItem', position: 5, name: machine.model, item: canonicalUrl },
        ],
      },
      {
        '@type': 'Product',
        '@id': `${canonicalUrl}#product`,
        url: canonicalUrl,
        name: machine.title,
        model: machine.model,
        category: `${machine.equipmentType} agricultural equipment`,
        description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications and source-backed market reference data.`,
        brand: { '@type': 'Brand', name: machine.brand },
        ...(exactPrimaryImage ? { image: [absoluteUrl(baseUrl, exactPrimaryImage.imageUrl)] } : {}),
        ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> / <Link href={`/equipment/${machine.equipmentTypeSlug}`}>{machine.equipmentType}</Link> / <Link href={`/brands/${machine.brandSlug}`}>{machine.brand}</Link> / {machine.model}
      </div>
      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">{machine.equipmentType} reference</span>
          <h1>{machine.title}</h1>
          <p>Source-backed specifications, parts and published market/configuration reference for this {machine.equipmentType.toLowerCase()}.</p>
          {selectedVersion && (
            <div className="notice">
              <strong>Specification set:</strong>{' '}
              {referenceContext || selectedVersion.slug}
              {selectedVersion.notes ? ` ${selectedVersion.notes}` : ''}
            </div>
          )}
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            {orderedSections.map((section) => <a key={section} href={`#${sectionId(section)}`}>{section}</a>)}
            {publishedParts.length > 0 && <a href="#compatible-parts">Compatible parts & kits</a>}
            {attachmentGroups.length > 0 && <a href="#compatible-attachments">Compatible attachments</a>}
            {sources.length > 0 && <a href="#sources">Sources</a>}
            {relatedModels.length > 0 && <a href="#related-models">Related models</a>}
          </aside>
          <div>
            {orderedSections.map((section) => (
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

            {specs.length === 0 && (
              <section className="data-section">
                <h2>Specifications</h2>
                <div className="notice">Numerical specifications are published only when a cited source supports the selected reference context.</div>
              </section>
            )}

            {publishedParts.length > 0 && (
              <section className="data-section" id="compatible-parts">
                <h2>Compatible parts & kits</h2>
                <p className="section-note">Parts shown here have a cited relationship to this machine and are limited to the selected reference context plus generic machine-level fitment. Open the part reference for replacement, kit and wider fitment context before ordering.</p>
                <div className="parts-list">
                  {publishedParts.map((part) => {
                    const partHref = getPartReferenceHref(
                      part.normalizedPartNumber,
                      part.manufacturerSlug,
                      ambiguousPartNumbers,
                    );
                    return (
                      <div className="part-row" key={part.id}>
                        <span>
                          <strong><Link href={partHref}>{part.partNumber}</Link></strong>
                          <small>{part.manufacturerName ? `${part.manufacturerName} · ` : ''}{part.name || part.categoryName || 'Farm equipment part'}</small>
                          {part.configurationNotes.map((note) => (
                            <small key={note}><strong>Applies to:</strong> {note}</small>
                          ))}
                          {part.fitmentEvidence.map((evidence, index) => (
                            <small key={`${evidence.confidence}-${evidence.sourceUrl || evidence.sourceTitle}-${index}`}>
                              <strong>Evidence:</strong> {formatPartFitmentConfidence(evidence.confidence)}
                              {' · '}
                              {evidence.sourceUrl ? (
                                <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer">{evidence.sourceTitle} →</a>
                              ) : evidence.sourceTitle}
                            </small>
                          ))}
                        </span>
                        <span><Link href={partHref}>{part.categoryName || 'Part'} →</Link></span>
                      </div>
                    );
                  })}
                </div>
                <p className="section-note">A documented part relationship is not a substitute for serial-number or configuration verification. Use the part page and Fitment Checker when the source publishes narrower applicability.</p>
              </section>
            )}

            {attachmentGroups.length > 0 && (
              <section className="data-section" id="compatible-attachments">
                <h2>Compatible attachments</h2>
                <p className="section-note">Manufacturer-backed fitment records for this machine. Multiple cited records for the same attachment are grouped together below rather than shown as duplicate attachments. Open an attachment page for its published configuration and full fitment list.</p>
                <div className="parts-list">
                  {attachmentGroups.map(({ attachmentId, records }) => {
                    const attachment = records[0];
                    if (!attachment) return null;
                    const configurations = uniqueEvidenceValues(records.map((record) => record.configurationText));
                    const capacities = uniqueEvidenceValues(records.map((record) => record.liftCapacityText));
                    const heights = uniqueEvidenceValues(records.map((record) => record.liftHeightText));
                    const notes = uniqueEvidenceValues(records.map((record) => record.compatibilityNote));
                    const confidenceLabels = uniqueEvidenceValues(records.map((record) => formatAttachmentConfidence(record.confidence)));
                    const evidenceSources = Array.from(
                      new Map(
                        records
                          .filter((record) => record.sourceUrl)
                          .map((record) => [record.sourceUrl as string, {
                            url: record.sourceUrl as string,
                            title: record.sourceTitle || 'Fitment source',
                          }]),
                      ).values(),
                    );

                    return (
                      <div className="part-row" key={attachmentId}>
                        <span>
                          <strong><Link href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>{attachment.modelName}</Link></strong>
                          <small>{attachment.manufacturerName} · {formatAttachmentType(attachment.attachmentType)} · {confidenceLabels.join(' · ')}</small>
                          {records.length > 1 && <small>{records.length} cited fitment records grouped for this attachment</small>}
                          {configurations.map((value) => <small key={`configuration-${value}`}>{value}</small>)}
                          {capacities.map((value) => <small key={`capacity-${value}`}>Lift/capacity: {value}</small>)}
                          {heights.map((value) => <small key={`height-${value}`}>Lift height: {value}</small>)}
                          {notes.map((value) => <small key={`note-${value}`}>{value}</small>)}
                        </span>
                        <span>
                          <Link href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>Fitment →</Link>
                          {evidenceSources.map((source, index) => (
                            <span key={source.url}>{' · '}<a href={source.url} target="_blank" rel="noopener noreferrer">{evidenceSources.length === 1 ? 'Source' : `Source ${index + 1}`} →</a></span>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="section-note">A compatibility listing does not mean the attachment is standard equipment; hydraulic flow, hitch, carrier, model year and dealer configuration may still matter.</p>
              </section>
            )}

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                <p className="section-note">Specifications, documented part fitment and attachment fitment on this page are tied to cited source records. Specification and part records use the selected market/configuration version where one is available.</p>
                <div className="parts-list">
                  {sources.map((source) => (
                    <a className="part-row" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
                      <span>
                        <strong>{source.title}</strong>
                        {source.publishedDate && <small>{source.publishedDate}</small>}
                      </span>
                      <span>Source →</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {relatedModels.length > 0 && (
              <section className="data-section" id="related-models">
                <h2>More {machine.brand} {machine.equipmentType.toLowerCase()} models</h2>
                <p className="section-note">Continue through the same manufacturer and equipment type without leaving the source-backed catalog hierarchy.</p>
                <div className="grid">
                  {relatedModels.map((related) => (
                    <Link className="card" key={related.id} href={`/equipment/${related.equipmentTypeSlug}/${related.brandSlug}/${related.modelSlug}`}>
                      <span className="eyebrow">{related.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                      <h3>{related.title}</h3>
                      <p>{related.equipmentType} specifications and published market reference.</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
