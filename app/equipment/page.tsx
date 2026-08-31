import type { Metadata } from 'next';
import Link from 'next/link';
import { getNonTractorEquipment, getNonTractorEquipmentTypes, type EquipmentMachine } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Specs by Type and Brand',
  description: 'Browse source-backed specifications for agricultural equipment beyond tractors, organized by equipment type, manufacturer and model.',
  alternates: { canonical: '/equipment' },
};

function featuredByBrand(machines: EquipmentMachine[], limit = 8) {
  const groups = Array.from(
    machines.reduce<Map<string, EquipmentMachine[]>>((map, machine) => {
      const list = map.get(machine.brandSlug) || [];
      list.push(machine);
      map.set(machine.brandSlug, list);
      return map;
    }, new Map()),
  ).map(([, brandMachines]) => brandMachines);

  const featured: EquipmentMachine[] = [];
  let row = 0;
  while (featured.length < limit) {
    let added = false;
    for (const brandMachines of groups) {
      const machine = brandMachines[row];
      if (!machine) continue;
      featured.push(machine);
      added = true;
      if (featured.length >= limit) break;
    }
    if (!added) break;
    row += 1;
  }
  return featured;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function EquipmentPage() {
  const [equipment, types] = await Promise.all([
    getNonTractorEquipment(),
    getNonTractorEquipmentTypes(),
  ]);
  const published = equipment.filter((machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified');
  const groups = Array.from(
    published.reduce<Map<string, typeof published>>((map, machine) => {
      const list = map.get(machine.equipmentTypeSlug) || [];
      list.push(machine);
      map.set(machine.equipmentTypeSlug, list);
      return map;
    }, new Map()),
  );
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/equipment`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: 'Farm Equipment Specs by Type and Brand',
        description: 'Browse source-backed specifications for agricultural equipment beyond tractors, organized by equipment type, manufacturer and model.',
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#types` },
        isPartOf: { '@id': `${baseUrl}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Equipment', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#types`,
        name: 'Farm equipment types',
        numberOfItems: types.length,
        itemListElement: types.map((type, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: type.name,
          url: `${baseUrl}/equipment/${type.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Farm equipment beyond tractors</h1>
        <p className="section-lead">Source-backed model pages for combine harvesters, transporters and additional agricultural machine types. Each machine stays in its manufacturer-defined equipment category instead of being forced into the tractor catalog.</p>

        <div className="parts-stats">
          <div><strong>{published.length.toLocaleString('en-US')}</strong><span>Published equipment models</span></div>
          <div><strong>{types.length.toLocaleString('en-US')}</strong><span>Equipment types</span></div>
          <div><strong>{new Set(published.map((machine) => machine.brandSlug)).size.toLocaleString('en-US')}</strong><span>Manufacturers represented</span></div>
        </div>

        {types.length > 0 && (
          <section className="catalog-group">
            <span className="eyebrow">Browse catalog</span>
            <h2>Equipment types</h2>
            <p className="section-note">Open a dedicated equipment-type catalog to browse its published manufacturers and models.</p>
            <div className="grid">
              {types.map((type) => (
                <Link className="card" href={`/equipment/${type.slug}`} key={type.slug}>
                  <span className="eyebrow">Equipment type</span>
                  <h3>{type.name}</h3>
                  <p>{type.machineCount.toLocaleString('en-US')} published {type.machineCount === 1 ? 'model' : 'models'}</p>
                  <span className="tool-link">Browse {type.name.toLowerCase()} →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {groups.map(([typeSlug, machines]) => {
          const typeName = machines[0]?.equipmentType || typeSlug;
          const featured = featuredByBrand(machines);
          const manufacturerCount = new Set(machines.map((machine) => machine.brandSlug)).size;
          return (
            <section className="catalog-group" id={`type-${typeSlug}`} key={typeSlug}>
              <span className="eyebrow">Equipment type</span>
              <h2><Link href={`/equipment/${typeSlug}`}>{typeName}</Link></h2>
              <p className="section-note">
                {machines.length.toLocaleString('en-US')} published {typeName.toLowerCase()} models across {manufacturerCount.toLocaleString('en-US')} manufacturer{manufacturerCount === 1 ? '' : 's'}. A cross-brand sample is shown here; the dedicated type page contains the full catalog.
              </p>
              <div className="grid">
                {featured.map((machine) => (
                  <div className="card" key={machine.id}>
                    <span className="eyebrow">{machine.brand} · {machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>{machine.equipmentType} specifications and current market reference data.</p>
                    <Link className="tool-link" href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>View model</Link>
                  </div>
                ))}
              </div>
              <p><Link className="tool-link" href={`/equipment/${typeSlug}`}>Browse all {machines.length.toLocaleString('en-US')} {typeName.toLowerCase()} models →</Link></p>
            </section>
          );
        })}

        {published.length === 0 && (
          <div className="notice">Additional agricultural equipment categories are being prepared from manufacturer sources.</div>
        )}
      </div>
    </main>
  );
}
