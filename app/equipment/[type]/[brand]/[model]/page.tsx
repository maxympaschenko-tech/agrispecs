import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEquipmentMachine } from '@/lib/equipment-service';
import { getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string; brand: string; model: string }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) return {};
  const publishable = machine.dataStatus === 'partial' || machine.dataStatus === 'verified';
  return {
    title: `${machine.title} ${machine.equipmentType} Specs`,
    description: `${machine.title} ${machine.equipmentType.toLowerCase()} specifications, configuration and source-backed current market reference data.`,
    alternates: { canonical: `/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}` },
    robots: publishable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function EquipmentModelPage({ params }: PageProps) {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) notFound();

  const versions = await getMachineVersions(machine.id);
  const selectedVersion = versions.find((version) => version.specCount > 0) || versions[0];
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
        .map((spec) => [spec.sourceUrl as string, { url: spec.sourceUrl as string, title: spec.sourceTitle || 'Manufacturer source', publishedDate: spec.sourcePublishedDate }]),
    ).values(),
  );

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> / {machine.equipmentType} / {machine.brand} / {machine.model}
      </div>
      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">{machine.equipmentType} reference</span>
          <h1>{machine.title}</h1>
          <p>Source-backed specifications and current market configuration for this {machine.equipmentType.toLowerCase()}.</p>
          {selectedVersion && (
            <div className="notice">
              <strong>Specification set:</strong>{' '}
              {[selectedVersion.marketName, selectedVersion.configuration].filter(Boolean).join(' · ')}
              {selectedVersion.notes ? ` ${selectedVersion.notes}` : ''}
            </div>
          )}
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            {orderedSections.map((section) => <a key={section} href={`#${sectionId(section)}`}>{section}</a>)}
            {sources.length > 0 && <a href="#sources">Sources</a>}
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
                <div className="notice">Numerical specifications are published only after source verification.</div>
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
          </div>
        </div>
      </div>
    </main>
  );
}
