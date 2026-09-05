import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByBrand, getEquipmentMachine } from '@/lib/equipment-service';
import { getMachineAttachments, getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';

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

function formatAttachmentType(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) return {};
  const publishable = machine.dataStatus === 'partial' || machine.dataStatus === 'verified';
  return {
    title: `${machine.title} ${machine.equipmentType} Specs`,
    description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications, configuration and source-backed market reference data.`,
    alternates: { canonical: `/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}` },
    robots: publishable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function EquipmentModelPage({ params }: PageProps) {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) notFound();

  const [versions, brandEquipment, attachments] = await Promise.all([
    getMachineVersions(machine.id),
    getNonTractorEquipmentByBrand(machine.brandSlug),
    getMachineAttachments(machine.id),
  ]);
  const selectedVersion = versions.find((version) => version.isCurrent)
    || versions.find((version) => version.specCount > 0)
    || versions[0];
  const specs = selectedVersion ? await getMachineSpecs(machine.id, selectedVersion.id) : [];
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
  const sources = Array.from(
    new Map(
      specs
        .filter((spec) => spec.sourceUrl)
        .map((spec) => [
          spec.sourceUrl as string,
          {
            url: spec.sourceUrl as string,
            title: spec.sourceTitle || 'Manufacturer source',
            publishedDate: spec.sourcePublishedDate,
          },
        ]),
    ).values(),
  );
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
          <p>Source-backed specifications and published market/configuration reference for this {machine.equipmentType.toLowerCase()}.</p>
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
            {attachments.length > 0 && <a href="#compatible-attachments">Compatible attachments</a>}
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

            {attachments.length > 0 && (
              <section className="data-section" id="compatible-attachments">
                <h2>Compatible attachments</h2>
                <p className="section-note">Manufacturer-backed fitment records for this machine. Open an attachment page for its published configuration and full fitment list. A compatibility listing does not mean the attachment is standard equipment; hydraulic flow, hitch, carrier, model year and dealer configuration may still matter.</p>
                <div className="parts-list">
                  {attachments.map((attachment) => (
                    <div className="part-row" key={`${attachment.id}-${attachment.slug}`}>
                      <span>
                        <strong><Link href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>{attachment.modelName}</Link></strong>
                        <small>{attachment.manufacturerName} · {formatAttachmentType(attachment.attachmentType)} · {attachment.confidence === 'official' ? 'Official fitment' : `${attachment.confidence} confidence`}</small>
                        {attachment.configurationText && <small>{attachment.configurationText}</small>}
                        {attachment.liftCapacityText && <small>Lift/capacity: {attachment.liftCapacityText}</small>}
                        {attachment.liftHeightText && <small>Lift height: {attachment.liftHeightText}</small>}
                        {attachment.compatibilityNote && <small>{attachment.compatibilityNote}</small>}
                      </span>
                      <span>
                        <Link href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>Fitment →</Link>
                        {attachment.sourceUrl && <>{' · '}<a href={attachment.sourceUrl} target="_blank" rel="noopener noreferrer">Source →</a></>}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                <p className="section-note">Specifications on this page are tied to the cited source records and the selected market/configuration version.</p>
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
