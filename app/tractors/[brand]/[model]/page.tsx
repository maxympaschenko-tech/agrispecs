import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMachine, getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';
import { machines as seedMachines } from '@/lib/catalog';

type PageProps = {
  params: Promise<{ brand: string; model: string }>;
};

const sectionOrder = [
  'Engine',
  'Transmission',
  'PTO',
  'Hydraulics',
  'Capacities',
  'Steering & Brakes',
  'Electrical',
];

function sectionId(section: string) {
  return section.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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

export function generateStaticParams() {
  return seedMachines.map((machine) => ({
    brand: machine.brandSlug,
    model: machine.modelSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
  if (!machine) return {};

  return {
    title: `${machine.title} Specs, Parts and Maintenance`,
    description: `${machine.title} specifications, maintenance information, compatible parts, fluids, filters, attachments and reference data.`,
    alternates: { canonical: `/tractors/${machine.brandSlug}/${machine.modelSlug}` },
  };
}

export default async function TractorModelPage({ params }: PageProps) {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
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

  const availableSections = sectionOrder.filter((section) => specsBySection.has(section));
  const sources = Array.from(
    new Map(
      specs
        .filter((spec) => spec.sourceUrl)
        .map((spec) => [spec.sourceUrl, {
          title: spec.sourceTitle || 'Source',
          url: spec.sourceUrl as string,
          publishedDate: spec.sourcePublishedDate,
        }]),
    ).values(),
  );

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
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            {availableSections.map((section) => (
              <a key={section} href={`#${sectionId(section)}`}>{section}</a>
            ))}
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

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                {sources.map((source) => (
                  <div className="placeholder-row" key={source.url}>
                    <span>{source.publishedDate || 'Official source'}</span>
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
