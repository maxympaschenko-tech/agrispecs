import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByType } from '@/lib/equipment-service';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';
import styles from '../equipment-type.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MIN_INDEXABLE_MODELS = 2;
const FEATURED_MODEL_LIMIT = 8;

type PageProps = {
  params: Promise<{ type: string; brand: string }>;
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

async function getCatalog(type: string, brand: string) {
  const equipment = await getNonTractorEquipmentByType(type);
  return equipment.filter((machine) => machine.brandSlug === brand.toLowerCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, brand } = await params;
  const machines = await getCatalog(type, brand);
  if (machines.length < MIN_INDEXABLE_MODELS) {
    return { robots: { index: false, follow: true } };
  }

  const brandName = machines[0].brand;
  const typeName = machines[0].equipmentType;
  const title = `${brandName} ${typeName} Models & Specifications`;
  const description = `Browse ${machines.length.toLocaleString('en-US')} published ${brandName} ${typeName.toLowerCase()} models with source-backed specifications and direct links to individual machine records.`;

  return {
    title,
    description,
    alternates: { canonical: `/equipment/${type}/${brand}` },
  };
}

export default async function EquipmentBrandTypePage({ params }: PageProps) {
  const { type, brand } = await params;
  const machines = await getCatalog(type, brand);
  if (machines.length < MIN_INDEXABLE_MODELS) notFound();

  const brandName = machines[0].brand;
  const typeName = machines[0].equipmentType;
  const featured = machines.slice(0, FEATURED_MODEL_LIMIT);
  const compact = machines.slice(FEATURED_MODEL_LIMIT);
  const compareHref = `/equipment/compare?type=${type}&m1=${machines[0].id}&m2=${machines[1].id}`;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment/${type}/${brand}`;
  const description = `Browse ${machines.length.toLocaleString('en-US')} published ${brandName} ${typeName.toLowerCase()} models with source-backed specifications and direct links to individual machine records.`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: `${brandName} ${typeName} Models & Specifications`,
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
          { '@type': 'ListItem', position: 3, name: typeName, item: `${baseUrl}/equipment/${type}` },
          { '@type': 'ListItem', position: 4, name: brandName, item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        name: `${brandName} ${typeName.toLowerCase()} specifications`,
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
        <Link href={`/equipment/${type}`}>{typeName}</Link> / {brandName}
      </div>
      <div className="container">
        <span className="eyebrow">Manufacturer catalog</span>
        <h1>{brandName} {typeName} Models &amp; Specifications</h1>
        <p className="section-lead">
          Compare the published {brandName} {typeName.toLowerCase()} catalog and open individual model records for source-backed technical specifications.
        </p>

        <div className="parts-stats">
          <div><strong>{machines.length.toLocaleString('en-US')}</strong><span>Published models</span></div>
          <div><strong>{brandName}</strong><span>Manufacturer</span></div>
          <div><strong>Source-backed</strong><span>Missing values stay unpublished</span></div>
        </div>

        <div className="notice">
          <strong>Need a side-by-side comparison?</strong>{' '}
          Start with the first two published {brandName} {typeName.toLowerCase()} models, then change the selection in the comparison tool.{' '}
          <Link className="tool-link" href={compareHref}>Compare {brandName} models →</Link>
        </div>

        <section className="catalog-group">
          <span className="eyebrow">Models</span>
          <h2>Published {brandName} {typeName.toLowerCase()}</h2>
          <p className="section-note">
            This page lists only publishable records already present in the Farm Machine Specs catalog. Specifications are not inferred from sibling models.
          </p>
          <div className="grid">
            {featured.map((machine) => (
              <div className="card" key={machine.id}>
                {machineThumbnail(machine.brandSlug, machine.modelSlug, machine.equipmentTypeSlug, machine.title)}
                <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                <h3>{machine.title}</h3>
                <p>{typeName} specifications, configuration and technical reference data.</p>
                <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View model →</Link>
              </div>
            ))}
          </div>

          {compact.length > 0 && (
            <div className={styles.modelDirectory}>
              {compact.map((machine) => (
                <Link className={styles.modelLink} key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                  <span>{machine.model}</span>
                  <small>{machine.dataStatus === 'verified' ? 'Verified' : 'Specs'}</small>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="data-section">
          <h2>More {brandName} and {typeName.toLowerCase()} references</h2>
          <p className="section-note">
            Browse the complete manufacturer catalog or return to the full {typeName.toLowerCase()} directory to compare models from other manufacturers.
          </p>
          <p>
            <Link className="tool-link" href={`/brands/${brand}`}>All {brandName} equipment →</Link>{' · '}
            <Link className="tool-link" href={`/equipment/${type}`}>All {typeName.toLowerCase()} →</Link>{' · '}
            <Link className="tool-link" href="/methodology">Data methodology →</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
