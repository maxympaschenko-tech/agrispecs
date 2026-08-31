import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrands, getMachines } from '@/lib/catalog-service';
import { getNonTractorEquipment } from '@/lib/equipment-service';
import { comparisonPresets } from '@/lib/comparison-presets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Machine Specs - Equipment Specs, Parts and Fitment Reference',
  description:
    'Source-backed farm machine specifications, OEM parts, attachment fitment, maintenance references and model comparisons for tractors and agricultural equipment used in the United States.',
  alternates: { canonical: '/' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function HomePage() {
  const [brands, machines, otherEquipment] = await Promise.all([
    getBrands(),
    getMachines(),
    getNonTractorEquipment(),
  ]);
  const publishableMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishableEquipment = otherEquipment.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishableBrandSlugs = new Set(publishableMachines.map((machine) => machine.brandSlug));
  const publishableBrands = brands.filter((brand) => publishableBrandSlugs.has(brand.slug));

  const featuredMachines = Array.from(
    publishableMachines.reduce<Map<string, typeof publishableMachines>>((map, machine) => {
      const current = map.get(machine.brand) ?? [];
      if (current.length < 2) current.push(machine);
      map.set(machine.brand, current);
      return map;
    }, new Map()),
  )
    .flatMap(([, brandMachines]) => brandMachines)
    .slice(0, 12);

  const featuredComparisons = comparisonPresets.slice(0, 6);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${baseUrl}/#homepage`,
    url: baseUrl,
    name: 'Farm Machine Specs - Equipment Specs, Parts and Fitment Reference',
    description:
      'Source-backed farm machine specifications, OEM parts, attachment fitment, maintenance references and model comparisons for tractors and agricultural equipment used in the United States.',
    isPartOf: {
      '@id': `${baseUrl}/#website`,
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Farm equipment reference sections',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tractors', url: `${baseUrl}/tractors` },
        { '@type': 'ListItem', position: 2, name: 'Farm Equipment', url: `${baseUrl}/equipment` },
        { '@type': 'ListItem', position: 3, name: 'Parts', url: `${baseUrl}/parts` },
        { '@type': 'ListItem', position: 4, name: 'Attachments', url: `${baseUrl}/attachments` },
        { '@type': 'ListItem', position: 5, name: 'Fitment Checker', url: `${baseUrl}/fitment-checker` },
        { '@type': 'ListItem', position: 6, name: 'Brands', url: `${baseUrl}/brands` },
        { '@type': 'ListItem', position: 7, name: 'Compare Tractors', url: `${baseUrl}/compare` },
      ],
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Farm equipment reference</span>
          <h1>Find farm machine specs, parts and fitment data in one place.</h1>
          <p>
            Source-backed specifications, maintenance references, OEM parts, attachment fitment and comparisons for tractors and agricultural equipment used across the United States.
          </p>
          <form className="search-shell" action="/search">
            <input name="q" aria-label="Search equipment or part number" placeholder="Try: John Deere 5075E or an OEM part number" />
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="parts-stats">
            <div>
              <strong>{(publishableMachines.length + publishableEquipment.length).toLocaleString('en-US')}</strong>
              <span>Published machine models</span>
            </div>
            <div>
              <strong>{publishableMachines.length.toLocaleString('en-US')}</strong>
              <span>Published tractor models</span>
            </div>
            <div>
              <strong>Official</strong>
              <span>Manufacturer-first source policy</span>
            </div>
          </div>

          <div className="grid">
            <Link className="card" href="/tractors">
              <span className="eyebrow">Tractor catalog</span>
              <h3>Browse tractors</h3>
              <p>Open the tractor catalog by manufacturer and model.</p>
              <span className="tool-link">Explore tractors</span>
            </Link>
            <Link className="card" href="/equipment">
              <span className="eyebrow">Equipment catalog</span>
              <h3>Browse farm equipment</h3>
              <p>Explore transporters and additional agricultural machine categories without forcing them into the tractor catalog.</p>
              <span className="tool-link">Explore equipment</span>
            </Link>
            <Link className="card" href="/parts">
              <span className="eyebrow">Parts reference</span>
              <h3>Search parts</h3>
              <p>Find OEM part numbers, replacements and machine fitment records.</p>
              <span className="tool-link">Browse parts</span>
            </Link>
            <Link className="card" href="/fitment-checker">
              <span className="eyebrow">Compatibility</span>
              <h3>Check fitment</h3>
              <p>Match a part number to a machine model and serial-number context.</p>
              <span className="tool-link">Open fitment checker</span>
            </Link>
            <Link className="card" href="/compare">
              <span className="eyebrow">Comparison</span>
              <h3>Compare tractors</h3>
              <p>Compare normalized source-backed specifications across brands.</p>
              <span className="tool-link">Compare models</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Popular tractor comparisons</h2>
          <p className="section-lead">Permanent comparison pages built from the same normalized source-backed records as the interactive comparison tool.</p>
          <div className="grid">
            {featuredComparisons.map((preset) => (
              <Link className="card" key={preset.slug} href={`/compare/${preset.slug}`}>
                <span className="eyebrow">Source-backed comparison</span>
                <h3>{preset.title}</h3>
                <p>{preset.description}</p>
              </Link>
            ))}
          </div>
          <Link className="tool-link" href="/compare">See all comparisons</Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Featured tractors across brands</h2>
          <p className="section-lead">A cross-brand sample from the published tractor catalog, with current specifications and supporting reference data where available.</p>
          <div className="grid">
            {featuredMachines.map((machine) => (
              <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                <span className="eyebrow">{machine.brand}</span>
                <h3>{machine.model}</h3>
                <p>Specifications, maintenance, parts and compatibility reference.</p>
              </Link>
            ))}
          </div>
          <Link className="tool-link" href="/tractors">View all tractors</Link>
        </div>
      </section>

      {publishableEquipment.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>More farm equipment</h2>
            <p className="section-lead">Non-tractor agricultural machines keep their manufacturer-defined equipment type and dedicated URLs.</p>
            <div className="grid">
              {publishableEquipment.slice(0, 8).map((machine) => (
                <Link className="card" key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                  <span className="eyebrow">{machine.equipmentType}</span>
                  <h3>{machine.title}</h3>
                  <p>Source-backed {machine.equipmentType.toLowerCase()} specifications and market reference.</p>
                </Link>
              ))}
            </div>
            <Link className="tool-link" href="/equipment">View all equipment</Link>
          </div>
        </section>
      )}

      {publishableBrands.length > 0 && (
        <section className="section">
          <div className="container">
            <h2>Manufacturers</h2>
            <p className="section-lead">Browse manufacturers with source-backed tractor data already published.</p>
            <div className="grid">
              {publishableBrands.map((brand) => (
                <Link className="card" key={brand.slug} href={`/brands/${brand.slug}`}>
                  <h3>{brand.name}</h3>
                  <p>Models and equipment reference</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
