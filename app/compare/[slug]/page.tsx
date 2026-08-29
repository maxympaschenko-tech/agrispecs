import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMachines, getMachineVersions, getMachineSpecs, type MachineSpec } from '@/lib/catalog-service';
import { comparisonPresets, getComparisonPreset } from '@/lib/comparison-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ComparedMachine = {
  id: string;
  title: string;
  brandSlug: string;
  modelSlug: string;
  versionLabel: string;
  specs: MachineSpec[];
};

type CompareRow = {
  key: string;
  label: string;
  rows: Array<MachineSpec | undefined>;
};

function formatSpec(spec: MachineSpec | undefined) {
  if (!spec) return '—';
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return '—';
  return `${spec.valueNumber.toLocaleString('en-US')}${spec.unit ? ` ${spec.unit}` : ''}`;
}

export function generateStaticParams() {
  return comparisonPresets.map((preset) => ({ slug: preset.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const preset = getComparisonPreset(slug);
  if (!preset) return {};

  return {
    title: `${preset.title} - Tractor Specs Comparison`,
    description: preset.description,
    alternates: { canonical: `/compare/${preset.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ComparisonPresetPage({ params }: PageProps) {
  const { slug } = await params;
  const preset = getComparisonPreset(slug);
  if (!preset) notFound();

  const machines = (await getMachines()).filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );

  const selected = preset.machines
    .map((target) => machines.find((machine) => machine.brand === target.brand && machine.model === target.model))
    .filter((machine): machine is NonNullable<typeof machine> => Boolean(machine));

  if (selected.length < 2) notFound();

  const compared: ComparedMachine[] = await Promise.all(
    selected.map(async (machine) => {
      const versions = await getMachineVersions(machine.id);
      const version = versions.find((item) => item.isCurrent && item.specCount > 0) ?? versions[0];
      const specs = version ? await getMachineSpecs(machine.id, version.id) : [];
      return {
        id: machine.id,
        title: machine.title,
        brandSlug: machine.brandSlug,
        modelSlug: machine.modelSlug,
        versionLabel: version?.marketName || version?.slug || 'Current record',
        specs: specs.filter((spec) => spec.confidence === 'official' || spec.confidence === 'high'),
      };
    }),
  );

  const specMap = new Map<string, { section: string; label: string; rows: Array<MachineSpec | undefined> }>();
  compared.forEach((machine, machineIndex) => {
    machine.specs.forEach((spec) => {
      const existing = specMap.get(spec.specKey) ?? {
        section: spec.section,
        label: spec.label,
        rows: Array.from({ length: compared.length }, () => undefined),
      };
      existing.rows[machineIndex] = spec;
      specMap.set(spec.specKey, existing);
    });
  });

  const sections = Array.from(specMap.entries())
    .filter(([, item]) => item.rows.filter(Boolean).length >= Math.min(2, compared.length))
    .reduce<Map<string, CompareRow[]>>((map, [key, item]) => {
      const list = map.get(item.section) ?? [];
      list.push({ key, label: item.label, rows: item.rows });
      map.set(item.section, list);
      return map;
    }, new Map());

  const interactiveHref = `/compare?${compared.map((machine, index) => `m${index + 1}=${encodeURIComponent(machine.id)}`).join('&')}`;

  return (
    <main className="section">
      <div className="container">
        <div className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/compare">Compare</Link> / {preset.title}</div>
        <span className="eyebrow">Source-backed tractor comparison</span>
        <h1>{preset.title}</h1>
        <p className="section-lead">{preset.description} Values below come from the current published records in Farm Machine Specs; missing cells stay unpublished rather than being estimated.</p>

        <div className="compare-summary">
          {compared.map((machine) => (
            <div className="card" key={machine.id}>
              <span className="eyebrow">{machine.versionLabel}</span>
              <h3>{machine.title}</h3>
              <p>{machine.specs.length} source-backed specification rows available.</p>
              <Link className="tool-link" href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>View full model</Link>
            </div>
          ))}
        </div>

        <div className="parts-tool-callout">
          <div>
            <strong>Want to change one of these tractors?</strong>
            <span>Open the interactive Compare tool with these models preselected.</span>
          </div>
          <Link className="tool-link" href={interactiveHref}>Customize comparison</Link>
        </div>

        {sections.size === 0 ? (
          <div className="notice">These records do not yet share enough normalized specification fields for a useful table.</div>
        ) : (
          <div className="compare-sections">
            {Array.from(sections.entries()).map(([section, rows]) => (
              <section className="data-section compare-section" key={section}>
                <h2>{section}</h2>
                <div className="compare-table-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Specification</th>
                        {compared.map((machine) => <th key={machine.id}>{machine.title}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <th scope="row">{row.label}</th>
                          {row.rows.map((spec, index) => (
                            <td key={`${row.key}-${compared[index].id}`}>
                              <strong>{formatSpec(spec)}</strong>
                              {spec?.sourceUrl ? (
                                <small>
                                  <a href={spec.sourceUrl} target="_blank" rel="noreferrer" title={spec.sourceTitle || undefined} style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>
                                    {spec.confidence === 'official' ? 'Official source' : 'Source'}
                                  </a>
                                </small>
                              ) : spec ? (
                                <small>{spec.confidence === 'official' ? 'Official source recorded' : 'High confidence'}</small>
                              ) : null}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
