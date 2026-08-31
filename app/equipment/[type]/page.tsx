import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByType } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const equipment = await getNonTractorEquipmentByType(type);
  const typeName = equipment[0]?.equipmentType;
  if (!typeName) return {};

  return {
    title: `${typeName} Specs by Brand and Model`,
    description: `Browse source-backed ${typeName.toLowerCase()} specifications by manufacturer and model, including current market configuration and technical reference data.`,
    alternates: { canonical: `/equipment/${type}` },
  };
}

export default async function EquipmentTypePage({ params }: PageProps) {
  const { type } = await params;
  const equipment = await getNonTractorEquipmentByType(type);
  if (equipment.length === 0) notFound();

  const typeName = equipment[0].equipmentType;
  const brandGroups = Array.from(
    equipment.reduce<Map<string, typeof equipment>>((map, machine) => {
      const list = map.get(machine.brandSlug) || [];
      list.push(machine);
      map.set(machine.brandSlug, list);
      return map;
    }, new Map()),
  );

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${typeName} specifications by brand and model`,
    numberOfItems: equipment.length,
    itemListElement: equipment.map((machine, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: machine.title,
      url: `${baseUrl}/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`,
    })),
  };

  return (
    <main className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/equipment">Equipment</Link> / {typeName}
      </div>
      <div className="container">
        <span className="eyebrow">Equipment type</span>
        <h1>{typeName} specifications by brand and model</h1>
        <p className="section-lead">
          Browse published {typeName.toLowerCase()} records organized by manufacturer. Model pages use source-backed specifications and keep market or configuration differences attached to the underlying version record.
        </p>

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
              <h2>{brandName}</h2>
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
