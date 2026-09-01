import type { Metadata } from 'next';
import Link from 'next/link';
import { getMachineSpecs, getMachineVersions, type MachineSpec } from '@/lib/catalog-service';
import { getNonTractorEquipmentByType, getNonTractorEquipmentTypes, type EquipmentMachine } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Compare Farm Equipment Specifications',
  description: 'Compare source-backed farm equipment specifications side by side within the same equipment type, using manufacturer-defined metrics and current database records.',
  alternates: { canonical: '/equipment/compare' },
};

type ComparePageProps = {
  searchParams: Promise<{ type?: string; m1?: string; m2?: string; m3?: string; m4?: string; rows?: string }>;
};

type ComparedMachine = EquipmentMachine & {
  versionLabel: string;
  specs: MachineSpec[];
};

type CompareRow = {
  key: string;
  label: string;
  specs: Array<MachineSpec | undefined>;
  different: boolean;
};

type KeyDifference = {
  key: string;
  label: string;
  unit: string | null;
  minValue: number;
  maxValue: number;
  minTitles: string[];
  maxTitles: string[];
  spread: number;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

function comparisonKey(spec: MachineSpec) {
  return `${spec.section.toLowerCase()}::${normalizeLabel(spec.label)}`;
}

function formatSpec(spec: MachineSpec | undefined) {
  if (!spec) return '—';
  if (spec.valueText) return spec.valueText;
  if (spec.valueNumber === null) return '—';
  return `${spec.valueNumber.toLocaleString('en-US')}${spec.unit ? ` ${spec.unit}` : ''}`;
}

function rowIsDifferent(specs: Array<MachineSpec | undefined>) {
  const values = specs.filter((spec): spec is MachineSpec => Boolean(spec)).map(formatSpec);
  return values.length >= 2 && new Set(values).size > 1;
}

function numericRange(specs: Array<MachineSpec | undefined>) {
  const numeric = specs.filter((spec): spec is MachineSpec => Boolean(spec && !spec.valueText && spec.valueNumber !== null));
  if (numeric.length < 2) return null;
  const units = new Set(numeric.map((spec) => spec.unit || ''));
  if (units.size !== 1) return null;
  const values = numeric.map((spec) => spec.valueNumber as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return null;
  return { min, max };
}

function getKeyDifferences(
  entries: Array<[string, { label: string; specs: Array<MachineSpec | undefined> }]>,
  compared: ComparedMachine[],
) {
  return entries
    .map(([key, item]): KeyDifference | null => {
      const numeric = item.specs
        .map((spec, index) => ({ spec, title: compared[index]?.title }))
        .filter((item): item is { spec: MachineSpec; title: string } => Boolean(item.spec && item.title && !item.spec.valueText && item.spec.valueNumber !== null));
      if (numeric.length < 2) return null;
      const units = new Set(numeric.map(({ spec }) => spec.unit || ''));
      if (units.size !== 1) return null;
      const values = numeric.map(({ spec }) => spec.valueNumber as number);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      if (minValue === maxValue) return null;
      return {
        key,
        label: item.label,
        unit: numeric[0].spec.unit,
        minValue,
        maxValue,
        minTitles: numeric.filter(({ spec }) => spec.valueNumber === minValue).map(({ title }) => title),
        maxTitles: numeric.filter(({ spec }) => spec.valueNumber === maxValue).map(({ title }) => title),
        spread: Math.abs(maxValue - minValue),
      };
    })
    .filter((item): item is KeyDifference => Boolean(item))
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 6);
}

export default async function EquipmentComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const types = (await getNonTractorEquipmentTypes()).filter((type) => type.machineCount >= 2);
  const activeType = types.find((type) => type.slug === params.type);
  const machines = activeType ? await getNonTractorEquipmentByType(activeType.slug) : [];
  const differencesOnly = params.rows === 'differences';

  const requestedIds = [params.m1, params.m2, params.m3, params.m4]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);
  const selectedMachines = machines.filter((machine) => requestedIds.includes(machine.id));
  selectedMachines.sort((a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id));

  const compared: ComparedMachine[] = await Promise.all(
    selectedMachines.map(async (machine) => {
      const versions = await getMachineVersions(machine.id);
      const version = versions.find((item) => item.isCurrent && item.specCount > 0) ?? versions.find((item) => item.specCount > 0) ?? versions[0];
      const specs = version ? await getMachineSpecs(machine.id, version.id) : [];
      return {
        ...machine,
        versionLabel: [version?.marketName, version?.configuration].filter(Boolean).join(' · ') || version?.slug || 'Current record',
        specs: specs.filter((spec) => spec.confidence === 'official' || spec.confidence === 'high'),
      };
    }),
  );

  const specMap = new Map<string, { section: string; label: string; specs: Array<MachineSpec | undefined> }>();
  compared.forEach((machine, machineIndex) => {
    machine.specs.forEach((spec) => {
      const key = comparisonKey(spec);
      const existing = specMap.get(key) ?? {
        section: spec.section,
        label: spec.label,
        specs: Array.from({ length: compared.length }, () => undefined),
      };
      existing.specs[machineIndex] = spec;
      specMap.set(key, existing);
    });
  });

  const sharedEntries = Array.from(specMap.entries()).filter(([, item]) => item.specs.filter(Boolean).length >= 2);
  const keyDifferences = getKeyDifferences(sharedEntries, compared);
  const sections = sharedEntries
    .map(([key, item]) => ({ key, ...item, different: rowIsDifferent(item.specs) }))
    .filter((item) => !differencesOnly || item.different)
    .reduce<Map<string, CompareRow[]>>((map, item) => {
      const list = map.get(item.section) ?? [];
      list.push({ key: item.key, label: item.label, specs: item.specs, different: item.different });
      map.set(item.section, list);
      return map;
    }, new Map());

  const machinesByBrand = Array.from(
    machines.reduce<Map<string, EquipmentMachine[]>>((map, machine) => {
      const list = map.get(machine.brand) ?? [];
      list.push(machine);
      map.set(machine.brand, list);
      return map;
    }, new Map()),
  );

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment/compare`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: 'Compare Farm Equipment Specifications',
        description: 'Compare source-backed farm equipment specifications within the same manufacturer-defined equipment type.',
        isPartOf: { '@type': 'WebSite', '@id': `${baseUrl}/#website`, url: baseUrl, name: 'Farm Machine Specs' },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Equipment', item: `${baseUrl}/equipment` },
          { '@type': 'ListItem', position: 3, name: 'Compare equipment', item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> / Compare
      </div>
      <div className="container">
        <span className="eyebrow">Equipment comparison tool</span>
        <h1>Compare farm equipment side by side</h1>
        <p className="section-lead">Choose one equipment type, then compare two to four published machines. Rows line up only when the manufacturer-backed section and specification label match, so gross power, net power and other differently defined metrics are not silently treated as equivalent.</p>

        <form className="compare-form" action="/equipment/compare" method="get">
          <label>
            <span>Equipment type</span>
            <select name="type" defaultValue={activeType?.slug || ''}>
              <option value="">Choose equipment type</option>
              {types.map((type) => <option value={type.slug} key={type.slug}>{type.name} ({type.machineCount})</option>)}
            </select>
          </label>
          <button type="submit">Load models</button>
        </form>

        {!activeType && (
          <section className="catalog-group">
            <h2>Choose a category to compare</h2>
            <p className="section-note">Only categories with at least two published models are listed.</p>
            <div className="grid">
              {types.slice(0, 12).map((type) => (
                <Link className="card" href={`/equipment/compare?type=${type.slug}`} key={type.slug}>
                  <span className="eyebrow">{type.machineCount} published models</span>
                  <h3>{type.name}</h3>
                  <p>Open a same-type source-backed comparison.</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {activeType && (
          <>
            <section className="catalog-group">
              <span className="eyebrow">Selected category</span>
              <h2>{activeType.name}</h2>
              <p className="section-note">{machines.length.toLocaleString('en-US')} published models are available. Cross-type selections are intentionally blocked.</p>
            </section>

            <form className="compare-form" action="/equipment/compare" method="get">
              <input type="hidden" name="type" value={activeType.slug} />
              {[1, 2, 3, 4].map((slot) => {
                const name = `m${slot}` as 'm1' | 'm2' | 'm3' | 'm4';
                return (
                  <label key={name}>
                    <span>{slot > 2 ? `Optional machine ${slot}` : `Machine ${slot}`}</span>
                    <select name={name} defaultValue={params[name] || ''}>
                      <option value="">Choose a model</option>
                      {machinesByBrand.map(([brand, brandMachines]) => (
                        <optgroup key={brand} label={brand}>
                          {brandMachines.map((machine) => <option value={machine.id} key={machine.id}>{machine.model}</option>)}
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
              <button type="submit">Compare {activeType.name.toLowerCase()}</button>
            </form>

            {compared.length < 2 ? (
              <div className="card compare-empty">
                <h3>Select at least two models</h3>
                <p>Choose two to four {activeType.name.toLowerCase()} records above. Only source-backed rows shared by at least two selected machines will be compared.</p>
              </div>
            ) : (
              <>
                <div className="compare-summary">
                  {compared.map((machine) => (
                    <div className="card" key={machine.id}>
                      <span className="eyebrow">{machine.versionLabel}</span>
                      <h3>{machine.title}</h3>
                      <p>{machine.specs.length} source-backed specification rows loaded.</p>
                      <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View full model</Link>
                    </div>
                  ))}
                </div>

                {keyDifferences.length > 0 && (
                  <section className="data-section compare-key-differences">
                    <h2>Key numeric differences</h2>
                    <p className="section-note">Largest numeric spreads among genuinely shared labels and units. Higher or lower does not imply better.</p>
                    <ul>
                      {keyDifferences.map((difference) => (
                        <li key={difference.key}>
                          <strong>{difference.label}:</strong>{' '}
                          {difference.minTitles.join(' / ')} {difference.minValue.toLocaleString('en-US')}{difference.unit ? ` ${difference.unit}` : ''} vs{' '}
                          {difference.maxTitles.join(' / ')} {difference.maxValue.toLocaleString('en-US')}{difference.unit ? ` ${difference.unit}` : ''}.
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {sections.size === 0 ? (
                  <div className="notice">
                    {differencesOnly
                      ? 'No differing shared specification labels were found. Switch Rows to All shared specs to see matching values.'
                      : 'These records do not yet share enough identically defined specification labels for a trustworthy cross-model table. Differently named manufacturer metrics are intentionally not forced together.'}
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
                                const range = numericRange(row.specs);
                                return (
                                  <tr key={row.key}>
                                    <th scope="row">{row.label}{row.different ? ' *' : ''}</th>
                                    {row.specs.map((spec, index) => {
                                      const isHigh = Boolean(range && spec?.valueNumber === range.max);
                                      const isLow = Boolean(range && spec?.valueNumber === range.min);
                                      return (
                                        <td key={`${row.key}-${compared[index].id}`} style={isHigh ? { background: '#edf6ee' } : isLow ? { background: '#fff8df' } : undefined}>
                                          <strong>{formatSpec(spec)}</strong>
                                          {range && spec?.valueNumber !== null && spec?.valueNumber !== undefined && <small>{isHigh ? 'Highest numeric value' : isLow ? 'Lowest numeric value' : 'Between selected values'}</small>}
                                          {spec?.sourceUrl ? <small><a href={spec.sourceUrl} target="_blank" rel="noreferrer" title={spec.sourceTitle || undefined} style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>Official source</a></small> : null}
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
          </>
        )}
      </div>
    </main>
  );
}
