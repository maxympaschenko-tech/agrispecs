import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNonTractorEquipmentByType } from '@/lib/equipment-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string }>;
};

type TypeContent = {
  title: string;
  description: string;
  lead: string;
};

const typeContent: Record<string, TypeContent> = {
  combine: {
    title: 'Combine Harvester Specs by Brand and Model',
    description: 'Browse source-backed combine harvester specifications including engine power, grain tank capacity, unloading rate, feeder, threshing, separating and cleaning data.',
    lead: 'Compare published combine harvester specifications from major manufacturers. Model pages keep engine power, grain handling, feeder, threshing, separating, cleaning and market-specific configuration data tied to the original source record.',
  },
  sprayer: {
    title: 'Self-Propelled Sprayer Specs by Brand and Model',
    description: 'Browse source-backed self-propelled sprayer specifications including engine power, solution tank capacity, rinse tank, boom width, crop clearance and application-system data.',
    lead: 'Compare published self-propelled sprayer specifications from major manufacturers. Model pages keep engine power, solution and rinse tank capacity, boom configuration, crop clearance, travel and application-system data tied to the original market-specific source record.',
  },
  planter: {
    title: 'Planter Specs, Row Spacing and Capacity by Brand',
    description: 'Browse source-backed planter specifications including row count, row spacing, frame type, working width, seed capacity, fertilizer capacity and transport dimensions by model and configuration.',
    lead: 'Compare current planter configurations by manufacturer, row count and row spacing. Model pages keep frame type, working width, seed and fertilizer capacity, transport dimensions, row-unit details and tractor-power requirements tied to the exact published configuration instead of collapsing unlike planters into one record.',
  },
  'round-baler': {
    title: 'Round Baler Specs, Bale Size and PTO Requirements',
    description: 'Browse source-backed round baler specifications including bale width, bale diameter, bale size, feeding and wrapping systems, configuration options and PTO power requirements.',
    lead: 'Compare current round balers by bale size, bale width and diameter, feeding system, wrapping system and tractor PTO requirement. Configuration-dependent power requirements stay attached to the exact manufacturer model instead of being reduced to one misleading number.',
  },
  'small-square-baler': {
    title: 'Small Square Baler Specs, Bale Size and PTO Power',
    description: 'Browse source-backed small square baler specifications including bale cross section, bale length, pickup width, feeding system, tying system, plunger speed and PTO power requirements.',
    lead: 'Compare current small square balers from major hay-equipment manufacturers. Model pages keep bale dimensions, pickup and feeding details, tying system, plunger data and tractor PTO requirements tied to the current manufacturer source and market configuration.',
  },
  'large-square-baler': {
    title: 'Large Square Baler Specs, Bale Size and PTO Power',
    description: 'Browse source-backed large square baler specifications including bale width, bale height, maximum bale length, plunger speed, feeding configuration, tying system and PTO power requirements.',
    lead: 'Compare current conventional and high-density large square balers by bale dimensions, crop-processing configuration, plunger data, tying system and tractor PTO requirements. CropCutter and high-density variants remain separate records when the manufacturer publishes them as distinct configurations.',
  },
  'self-propelled-forage-harvester': {
    title: 'Self-Propelled Forage Harvester Specs by Model',
    description: 'Browse source-backed self-propelled forage harvester specifications including engine power, fuel capacity, header compatibility, kernel processor options, harvest automation and current US configuration data.',
    lead: 'Compare current self-propelled forage harvesters using manufacturer-backed engine, capacity, header, kernel-processing and automation data. Where a manufacturer publishes different power metrics on a family table and an individual product page, those metrics remain separately labeled instead of being silently merged.',
  },
  'cotton-harvester': {
    title: 'Cotton Harvester Specs: Pickers and Strippers',
    description: 'Browse source-backed cotton harvester specifications including picker or stripper configuration, engine power, row spacing, header options, accumulator capacity, round module size and fuel capacity.',
    lead: 'Compare cotton pickers and cotton strippers using exact US model-year data. Picker row units and stripper heads remain separately described, while engine power, fuel and DEF capacity, cotton accumulator, round module builder and wrap capacity stay tied to the manufacturer specification set for that machine.',
  },
  windrower: {
    title: 'Self-Propelled Windrower Specs and Engine Power',
    description: 'Browse source-backed self-propelled windrower specifications including engine horsepower, cylinders, fuel and DEF capacity, header drive, field and transport speed, precision technology and windrow-management features.',
    lead: 'Compare current self-propelled windrowers using manufacturer-backed engine, drive, capacity, travel-speed and header-system data. Series-wide features are published only when the manufacturer explicitly applies them to the lineup, while model-specific horsepower and engine configuration stay attached to the individual machine.',
  },
  'disc-mower-conditioner': {
    title: 'Disc Mower-Conditioner Specs, Cutting Width and PTO',
    description: 'Browse source-backed disc mower-conditioner specifications including cutting width, transport width, number of discs, cutterbar type, conditioning systems and minimum PTO power by model.',
    lead: 'Compare current side-pull and center-pivot disc mower-conditioners by cutting width, disc count, cutterbar design, conditioning options, transport width and tractor PTO requirement. Model-specific values remain separate from series-wide features, and unpublished technical-table cells are left blank instead of being inferred.',
  },
  'disc-mower': {
    title: 'Disc Mower Specs, Cutting Width and Disc Count',
    description: 'Browse source-backed disc mower specifications including cutting width, number of discs, mounted or pull-type configuration, cutterbar design, knife system and protection features by model.',
    lead: 'Compare current heavy-duty and economy disc mowers by cutting width, disc count, mounting configuration and cutterbar design. Family-level PTO ranges are not presented as individual model requirements unless the manufacturer publishes a model-specific value.',
  },
  'wheel-rake': {
    title: 'Wheel Rake Specs, Working Width and Wheel Count',
    description: 'Browse source-backed wheel rake specifications including rake wheel count, maximum working width, machine weight, flotation, single-side operation and transport configuration by model.',
    lead: 'Compare current carted wheel rakes by rake wheel count, maximum working width, machine weight, flotation and operating configuration. Standard and heavy-duty PLUS variants remain separate records when the manufacturer publishes them as distinct machines.',
  },
  'rotary-rake': {
    title: 'Rotary Rake Specs, Working Width and Rotor Size',
    description: 'Browse source-backed rotary rake specifications including working width, rotor count, rotor diameter, side or center delivery, tine system and tractor PTO requirements by model.',
    lead: 'Compare current single-, dual- and four-rotor rakes by working width, rotor diameter, crop delivery and tine configuration. Business, Trend, TWIN and North American variants stay separate whenever the manufacturer publishes them as distinct configurations.',
  },
  'rotary-tedder': {
    title: 'Rotary Tedder Specs, Working Width, Weight and Power',
    description: 'Browse source-backed rotary tedder specifications including tedding width, rotor count, rotor diameter, machine weight, transport width, drive system and minimum tractor power.',
    lead: 'Compare current rotary tedders by tedding width, rotor configuration, machine weight, transport setup and tractor-power requirement. Product-page values stay tied to the exact model, while blank manufacturer table cells remain unpublished instead of being filled from another market.',
  },
  'air-drill': {
    title: 'Air Drill Specs, Working Width and Row Spacing',
    description: 'Browse source-backed air drill specifications including toolbar or working width, row and shank spacing, opener system, transport dimensions, empty weight, operating speed and seed tank configuration.',
    lead: 'Compare current disk and hoe air drills by working width, row spacing, opener design, transport dimensions and seed-delivery configuration. Multi-width and multi-spacing machines retain the manufacturer-published configuration range instead of being collapsed into one artificial specification.',
  },
  'air-cart': {
    title: 'Air Cart Specs, Capacity, Tanks and Metering Systems',
    description: 'Browse source-backed air cart specifications including total capacity, tank configuration, metering and section control, blower and fill systems, transport dimensions, machine weight and towing configuration.',
    lead: 'Compare current commodity and air-seeding carts by capacity, tank layout, metering, section control, filling and transport configuration. New models can be listed as current when the manufacturer names them, but numerical capacities and dimensions remain unpublished until the current market source explicitly exposes those values.',
  },
  transporter: {
    title: 'Farm Transporter Specs by Brand and Model',
    description: 'Browse source-backed agricultural transporter specifications by manufacturer and model, including engine, drivetrain, payload and loading-bed configuration.',
    lead: 'Browse agricultural transporter models with source-backed engine, drivetrain, loading-bed, capacity and current market configuration data.',
  },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function getContent(type: string, typeName: string): TypeContent {
  return typeContent[type] || {
    title: `${typeName} Specs by Brand and Model`,
    description: `Browse source-backed ${typeName.toLowerCase()} specifications by manufacturer and model, including current market configuration and technical reference data.`,
    lead: `Browse published ${typeName.toLowerCase()} records organized by manufacturer. Model pages use source-backed specifications and keep market or configuration differences attached to the underlying version record.`,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const equipment = await getNonTractorEquipmentByType(type);
  const typeName = equipment[0]?.equipmentType;
  if (!typeName) return {};
  const content = getContent(type, typeName);

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
  const content = getContent(type, typeName);
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
