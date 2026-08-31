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

const TYPE_GROUPS = [
  {
    name: 'Harvesting',
    description: 'Combines, forage harvesters and crop-specific harvesting machines.',
    slugs: ['combine', 'self-propelled-forage-harvester', 'cotton-harvester'],
  },
  {
    name: 'Hay & Forage',
    description: 'Mowing, conditioning, raking, tedding, windrowing and baling equipment.',
    slugs: ['windrower', 'disc-mower-conditioner', 'disc-mower', 'wheel-rake', 'rotary-rake', 'rotary-tedder', 'round-baler', 'small-square-baler', 'large-square-baler'],
  },
  {
    name: 'Planting & Seeding',
    description: 'Planters, air drills and commodity carts used to establish crops.',
    slugs: ['planter', 'air-drill', 'air-cart'],
  },
  {
    name: 'Tillage',
    description: 'Primary and secondary tillage tools organized by manufacturer-defined machine type.',
    slugs: ['field-cultivator', 'vertical-tillage', 'high-speed-disk', 'tandem-disk', 'disk-ripper', 'combination-ripper', 'in-line-ripper', 'strip-till', 'chisel-plow', 'coulter-chisel', 'mulch-finisher'],
  },
  {
    name: 'Application',
    description: 'Spraying, fertilizer placement, floaters and liquid or dry application systems.',
    slugs: ['sprayer', 'fertilizer-applicator', 'floater', 'combination-applicator', 'application-system'],
  },
  {
    name: 'Loaders & Material Handling',
    description: 'Skid steers, mini and compact track loaders, articulated and wheel loaders, plus rough-terrain forklifts.',
    slugs: ['skid-steer-loader', 'mini-track-loader', 'compact-track-loader', 'compact-wheel-loader', 'small-articulated-loader', 'large-wheel-loader', 'rough-terrain-forklift'],
  },
  {
    name: 'Farm & Utility Equipment',
    description: 'Additional farm-relevant machines that do not belong in the tractor catalog.',
    slugs: ['mini-excavator', 'compact-dozer-loader', 'transporter'],
  },
] as const;

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
  const groupedTypes = TYPE_GROUPS.map((group) => ({
    ...group,
    types: group.slugs.map((slug) => types.find((type) => type.slug === slug)).filter((type): type is (typeof types)[number] => Boolean(type)),
  })).filter((group) => group.types.length > 0);
  const groupedSlugs = new Set(TYPE_GROUPS.flatMap((group) => [...group.slugs]));
  const uncategorizedTypes = types.filter((type) => !groupedSlugs.has(type.slug as never));

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
        <p className="section-lead">Source-backed model pages for harvesting, hay and forage, planting, tillage, application, material-handling and utility equipment. Each machine stays in its manufacturer-defined equipment category instead of being forced into the tractor catalog.</p>

        <div className="parts-stats">
          <div><strong>{published.length.toLocaleString('en-US')}</strong><span>Published equipment models</span></div>
          <div><strong>{types.length.toLocaleString('en-US')}</strong><span>Equipment types</span></div>
          <div><strong>{new Set(published.map((machine) => machine.brandSlug)).size.toLocaleString('en-US')}</strong><span>Manufacturers represented</span></div>
        </div>

        {types.length > 0 && (
          <section className="catalog-group">
            <span className="eyebrow">Browse catalog</span>
            <h2>Equipment types by farm workflow</h2>
            <p className="section-note">Start with the job the machine performs, then open its dedicated catalog to browse published manufacturers and models.</p>

            {groupedTypes.map((group) => (
              <div className="data-section" key={group.name}>
                <h3>{group.name}</h3>
                <p className="section-note">{group.description}</p>
                <div className="grid">
                  {group.types.map((type) => (
                    <Link className="card" href={`/equipment/${type.slug}`} key={type.slug}>
                      <span className="eyebrow">Equipment type</span>
                      <h3>{type.name}</h3>
                      <p>{type.machineCount.toLocaleString('en-US')} published {type.machineCount === 1 ? 'model' : 'models'}</p>
                      <span className="tool-link">Browse {type.name.toLowerCase()} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {uncategorizedTypes.length > 0 && (
              <div className="data-section">
                <h3>Other equipment</h3>
                <p className="section-note">Additional manufacturer-defined machine types with published source-backed records.</p>
                <div className="grid">
                  {uncategorizedTypes.map((type) => (
                    <Link className="card" href={`/equipment/${type.slug}`} key={type.slug}>
                      <span className="eyebrow">Equipment type</span>
                      <h3>{type.name}</h3>
                      <p>{type.machineCount.toLocaleString('en-US')} published {type.machineCount === 1 ? 'model' : 'models'}</p>
                      <span className="tool-link">Browse {type.name.toLowerCase()} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
