import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIndexableEquipmentCategoricalFacet } from '@/lib/equipment-facet-service';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';
import styles from '../../equipment-type.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FEATURED_MODEL_LIMIT = 8;

type PageProps = {
  params: Promise<{ type: string; value: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function machineThumbnail(brandSlug: string, modelSlug: string, equipmentTypeSlug: string, title: string) {
  const image = getManifestMachinePrimaryImage(brandSlug, modelSlug, equipmentTypeSlug);
  return (
    <img
      src={image.imageUrl}
      alt={image.altText || title}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        aspectRatio: '4 / 3',
        objectFit: 'contain',
        borderRadius: 12,
        marginBottom: 14,
      }}
    />
  );
}

function comparisonPair<T extends { brandSlug: string }>(machines: T[]) {
  if (machines.length < 2) return [];
  const first = machines[0];
  const crossBrand = machines.find((machine) => machine.brandSlug !== first.brandSlug);
  return crossBrand ? [first, crossBrand] : machines.slice(0, 2);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, value } = await params;
  const entry = await getIndexableEquipmentCategoricalFacet(type, 'powertrain', value);
  if (!entry) return { robots: { index: false, follow: true } };

  const firstMachine = entry.machines[0];
  const typeName = firstMachine?.equipmentType;
  const typeSlug = firstMachine?.equipmentTypeSlug;
  if (!typeName || !typeSlug) return { robots: { index: false, follow: true } };
  const title = `${entry.value} ${typeName} Models & Specifications`;
  const description = `Browse ${entry.machines.length.toLocaleString('en-US')} published ${entry.value.toLowerCase()} ${typeName.toLowerCase()} models whose current source-backed records explicitly identify the powertrain as ${entry.value}.`;

  return {
    title,
    description,
    alternates: { canonical: `/equipment/${typeSlug}/powertrain/${entry.valueSlug}` },
    robots: { index: true, follow: true },
  };
}

export default async function EquipmentPowertrainFacetPage({ params }: PageProps) {
  const { type, value } = await params;
  const entry = await getIndexableEquipmentCategoricalFacet(type, 'powertrain', value);
  if (!entry || entry.machines.length === 0) notFound();

  const machines = entry.machines;
  const typeName = machines[0].equipmentType;
  const typeSlug = machines[0].equipmentTypeSlug;
  const brandGroups = Array.from(
    machines.reduce<Map<string, typeof machines>>((groups, machine) => {
      const existing = groups.get(machine.brandSlug) || [];
      existing.push(machine);
      groups.set(machine.brandSlug, existing);
      return groups;
    }, new Map()),
  ).sort(([, a], [, b]) => b.length - a.length || (a[0]?.brand || '').localeCompare(b[0]?.brand || ''));
  const brandCount = brandGroups.length;
  const featured = machines.slice(0, FEATURED_MODEL_LIMIT);
  const compact = machines.slice(FEATURED_MODEL_LIMIT);
  const comparePair = comparisonPair(machines);
  const compareHref = comparePair.length >= 2
    ? `/equipment/compare?type=${typeSlug}&m1=${comparePair[0].id}&m2=${comparePair[1].id}`
    : `/equipment/compare?type=${typeSlug}`;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment/${typeSlug}/powertrain/${entry.valueSlug}`;
  const description = `Published ${entry.value.toLowerCase()} ${typeName.toLowerCase()} models whose current source-backed records explicitly identify the powertrain as ${entry.value}.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: `${entry.value} ${typeName} Models & Specifications`,
        description,
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#items` },
        isPartOf: { '@id': `${baseUrl}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Equipment', item: `${baseUrl}/equipment` },
          { '@type': 'ListItem', position: 3, name: typeName, item: `${baseUrl}/equipment/${typeSlug}` },
          { '@type': 'ListItem', position: 4, name: entry.value, item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        name: `${entry.value} ${typeName.toLowerCase()} models`,
        numberOfItems: machines.length,
        itemListElement: machines.map((machine, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: machine.title,
          url: `${baseUrl}/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> /{' '}
        <Link href={`/equipment/${typeSlug}`}>{typeName}</Link> / {entry.value}
      </div>
      <div className="container">
        <span className="eyebrow">Source-backed powertrain catalog</span>
        <h1>{entry.value} {typeName} Models &amp; Specifications</h1>
        <p className="section-lead">
          Browse machines whose current official or high-confidence source record explicitly identifies the powertrain as {entry.value}. No model is placed here from its name, appearance or a related machine.
        </p>

        <div className="parts-stats">
          <div><strong>{machines.length.toLocaleString('en-US')}</strong><span>Published matching models</span></div>
          <div><strong>{brandCount.toLocaleString('en-US')}</strong><span>Manufacturers represented</span></div>
          <div><strong>{entry.value}</strong><span>Explicit published powertrain</span></div>
        </div>

        <div className="notice">
          <strong>Compare across manufacturers:</strong>{' '}
          start with two matching models from different brands when available, then adjust the selection.{' '}
          <Link className="tool-link" href={compareHref}>Compare {entry.value.toLowerCase()} {typeName.toLowerCase()} →</Link>
        </div>

        {brandGroups.length > 0 && (
          <section className="data-section">
            <span className="eyebrow">Manufacturer catalogs</span>
            <h2>{entry.value} {typeName.toLowerCase()} by manufacturer</h2>
            <p className="section-note">
              Open the broader manufacturer catalog for each brand represented here to compare its full published {typeName.toLowerCase()} lineup, including other powertrain configurations.
            </p>
            <div className={styles.modelDirectory}>
              {brandGroups.map(([brandSlug, brandMachines]) => {
                const brandName = brandMachines[0]?.brand || brandSlug;
                return (
                  <Link className={styles.modelLink} key={brandSlug} href={`/equipment/${typeSlug}/${brandSlug}`}>
                    <span>{brandName} {typeName}</span>
                    <small>{brandMachines.length.toLocaleString('en-US')} {entry.value.toLowerCase()} model{brandMachines.length === 1 ? '' : 's'}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="catalog-group">
          <span className="eyebrow">Models</span>
          <h2>Published {entry.value.toLowerCase()} {typeName.toLowerCase()}</h2>
          <p className="section-note">
            Inclusion requires an explicit current powertrain value in the source-backed specification record. The catalog remains intentionally incomplete where a manufacturer source does not publish an equivalent field.
          </p>
          <div className="grid">
            {featured.map((machine) => (
              <div className="card" key={machine.id}>
                {machineThumbnail(machine.brandSlug, machine.modelSlug, machine.equipmentTypeSlug, machine.title)}
                <span className="eyebrow">{machine.brand} · {entry.value} powertrain</span>
                <h3>{machine.title}</h3>
                <p>{machine.equipmentType} specifications, configuration and source-backed technical reference.</p>
                <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View model →</Link>
              </div>
            ))}
          </div>

          {compact.length > 0 && (
            <div className={styles.modelDirectory}>
              {compact.map((machine) => (
                <Link className={styles.modelLink} key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                  <span>{machine.title}</span>
                  <small>{entry.value}</small>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="data-section">
          <h2>Browse the complete {typeName.toLowerCase()} catalog</h2>
          <p className="section-note">
            Return to the full equipment-type directory for diesel, electric and records whose published source uses a different or less directly comparable powertrain description.
          </p>
          <p>
            <Link className="tool-link" href={`/equipment/${typeSlug}`}>All {typeName.toLowerCase()} →</Link>{' · '}
            <Link className="tool-link" href="/methodology">Data methodology →</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
