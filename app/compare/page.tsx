import type { Metadata } from 'next';
import Link from 'next/link';
import { getMachines, getMachineVersions, getMachineSpecs, type MachineSpec } from '@/lib/catalog-service';
import { comparisonPresets } from '@/lib/comparison-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Compare Tractor Specifications',
  description: 'Compare source-backed tractor specifications side by side across manufacturers.',
  alternates: { canonical: '/compare' },
};

type ComparePageProps = {
  searchParams: Promise<{ m1?: string; m2?: string; m3?: string; rows?: string }>;
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
  different: boolean;
};

function formatSpec(spec: MachineSpec | undefined) {
  if (!spec) return '—';
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return '—';
  return `${spec.valueNumber.toLocaleString('en-US')}${spec.unit ? ` ${spec.unit}` : ''}`;
}

function rowIsDifferent(rows: Array<MachineSpec | undefined>) {
  const values = rows
    .filter((spec): spec is MachineSpec => Boolean(spec))
    .map((spec) => formatSpec(spec));
  return values.length >= 2 && new Set(values).size > 1;
}

function numericRange(rows: Array<MachineSpec | undefined>) {
  const numeric = rows.filter(
    (spec): spec is MachineSpec => Boolean(spec && !spec.valueText && spec.valueNumber !== null),
  );
  if (numeric.length < 2) return null;

  const units = new Set(numeric.map((spec) => spec.unit || ''));
  if (units.size !== 1) return null;

  const values = numeric.map((spec) => spec.valueNumber as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return null;
  return { min, max };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const differencesOnly = params.rows === 'differences';
  const machines = (await getMachines()).filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const machinesByBrand = Array.from(
    machines.reduce<Map<string, typeof machines>>((map, machine) => {
      const list = map.get(machine.brand) ?? [];
      list.push(machine);
      map.set(machine.brand, list);
      return map;
    }, new Map()),
  );

  const requestedIds = [params.m1, params.m2, params.m3]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);

  const selectedMachines = machines.filter((machine) => requestedIds.includes(machine.id));
  selectedMachines.sort((a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id));

  const compared: ComparedMachine[] = await Promise.all(
    selectedMachines.map(async (machine) => {
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
    .map(([key, item]) => ({ key, ...item, different: rowIsDifferent(item.rows) }))
    .filter((item) => !differencesOnly || item.different)
    .reduce<Map<string, CompareRow[]>>((map, item) => {
      const list = map.get(item.section) ?? [];
      list.push({ key: item.key, label: item.label, rows: item.rows, different: item.different });
      map.set(item.section, list);
      return map;
    }, new Map());

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Comparison tool</span>
        <h1>Compare tractors side by side</h1>
        <p className="section-lead">Select up to three tractors. The table uses current source-backed records and normalized specification keys so equivalent fields line up across brands.</p>

        <section className="catalog-group">
          <h2>Popular source-backed comparisons</h2>
          <p className="section-note">Permanent comparison pages use the same current database records as the interactive tool.</p>
          <div className="grid">
            {comparisonPresets.map((preset) => (
              <Link className="card" key={preset.slug} href={`/compare/${preset.slug}`}>
                <span className="eyebrow">Source-backed comparison</span>
                <h3>{preset.title}</h3>
                <p>{preset.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <form className="compare-form" action="/compare" method="get">
          {[1, 2, 3].map((slot) => {
            const name = `m${slot}` as 'm1' | 'm2' | 'm3';
            return (
              <label key={name}>
                <span>{slot === 3 ? 'Optional third tractor' : `Tractor ${slot}`}</span>
                <select name={name} defaultValue={params[name] || ''}>
                  <option value="">Choose a tractor</option>
                  {machinesByBrand.map(([brand, brandMachines]) => (
                    <optgroup key={brand} label={brand}>
                      {brandMachines.map((machine) => (
                        <option key={machine.id} value={machine.id}>{machine.model}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            );
          })}
          <label>
            <span>Rows</span>
            <select name="rows" defaultValue={differencesOnly ? 'differences' : 'all'}>
              <option value="all">All shared specs</option>
              <option value="differences">Differences only</option>
            </select>
          </label>
          <button type="submit">Compare</button>
        </form>

        {compared.length < 2 ? (
          <div className="card compare-empty">
            <h3>Select at least two tractors</h3>
            <p>Choose two or three published models above to compare their verified specifications.</p>
          </div>
        ) : (
          <>
            <div className="compare-summary">
              {compared.map((machine) => (
                <div className="card" key={machine.id}>
                  <span className="eyebrow">{machine.versionLabel}</span>
                  <h3>{machine.title}</h3>
                  <p>{machine.specs.length} source-backed specification rows loaded for this comparison.</p>
                  <Link className="tool-link" href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>View full model</Link>
                </div>
              ))}
            </div>

            {sections.size === 0 ? (
              <div className="notice">
                {differencesOnly
                  ? 'No differing shared specification rows were found for these selected records. Switch Rows to All shared specs to see their common values.'
                  : 'These selected records do not yet share enough normalized specification fields for a useful comparison.'}
              </div>
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
                          {rows.map((row) => {
                            const range = numericRange(row.rows);
                            return (
                              <tr key={row.key}>
                                <th scope="row">{row.label}{row.different ? ' *' : ''}</th>
                                {row.rows.map((spec, index) => {
                                  const isHigh = Boolean(range && spec?.valueNumber === range.max);
                                  const isLow = Boolean(range && spec?.valueNumber === range.min);
                                  return (
                                    <td
                                      key={`${row.key}-${compared[index].id}`}
                                      style={isHigh ? { background: '#edf6ee' } : isLow ? { background: '#fff8df' } : undefined}
                                    >
                                      <strong>{formatSpec(spec)}</strong>
                                      {range && spec?.valueNumber !== null && spec?.valueNumber !== undefined && (
                                        <small>{isHigh ? 'Highest numeric value' : isLow ? 'Lowest numeric value' : 'Between selected values'}</small>
                                      )}
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
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
