import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByType } from '@/lib/equipment-service';
import { getEquipmentTypePageContent } from '@/lib/equipment-type-content-overrides';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string }>;
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const equipment = await getNonTractorEquipmentByType(type);
  const typeName = equipment[0]?.equipmentType;
  if (!typeName) return {};
  const content = getEquipmentTypePageContent(type, typeName);

  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: `/equipment/${type}` },
  };
}

export default async function EquipmentTypePage({ params }: PageProps) {
  const { type } = await params;
  const equipment = await getNonTractorEquipmentByType(type);
  if (equipment.length === 0) notFound();

  const typeName = equipment[0].equipmentType;
  const content = getEquipmentTypePageContent(type, typeName);
  const brandGroups = Array.from(
    equipment.reduce<Map<string, typeof equipment>>((map, machine) => {
      const list = map.get(machine.brandSlug) || [];
      list.push(machine);
      map.set(machine.brandSlug, list);
      return map;
    }, new Map()),
  );

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment/${type}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: content.title,
        description: content.description,
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
          { '@type': 'ListItem', position: 3, name: typeName, item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        name: `${typeName} specifications by brand and model`,
        numberOfItems: equipment.length,
        itemListElement: equipment.map((machine, index) => ({
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
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> / {typeName}
      </div>
      <div className="container">
        <span className="eyebrow">Equipment type</span>
        <h1>{content.title}</h1>
        <p className="section-lead">{content.lead}</p>

        <div className="parts-stats">
          <div><strong>{equipment.length.toLocaleString('en-US')}</strong><span>Published models</span></div>
          <div><strong>{brandGroups.length.toLocaleString('en-US')}</strong><span>Manufacturers</span></div>
          <div><strong>{equipment.filter((machine) => machine.dataStatus === 'verified').length.toLocaleString('en-US')}</strong><span>Verified records</span></div>
        </div>

        {brandGroups.map(([brandSlug, machines]) => {
          const brandName = machines[0]?.brand || brandSlug;
          return (
            <section className="catalog-group" id={`brand-${brandSlug}`} key={brandSlug}>
              <span className="eyebrow">Manufacturer</span>
              <h2><Link href={`/brands/${brandSlug}`}>{brandName}</Link></h2>
              <p className="section-note">Published {brandName} {typeName.toLowerCase()} models with source-backed technical reference data.</p>
              <div className="grid">
                {machines.map((machine) => (
                  <div className="card" key={machine.id}>
                    <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>{typeName} specifications, configuration and current market reference.</p>
                    <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View model</Link>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="data-section">
          <h2>How these {typeName.toLowerCase()} records are published</h2>
          <p className="section-note">
            Farm Machine Specs prioritizes manufacturer product pages, specification sheets, manuals and other first-party technical sources. Missing values stay unpublished rather than being inferred from a related model.
          </p>
          <Link className="tool-link" href="/methodology">Read data sources and methodology →</Link>
        </section>
      </div>
    </main>
  );
}
