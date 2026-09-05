import type { Metadata } from 'next';
import Link from 'next/link';
import { getMachines } from '@/lib/catalog-service';
import { getMachineDisplayModel, getMachineGenerationLabel } from '@/lib/machine-display';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Tractor Specs by Brand, Parts and Comparisons',
  description: 'Browse source-backed tractor specifications by manufacturer, including maintenance, OEM parts, attachment fitment and side-by-side tractor comparisons.',
  alternates: { canonical: '/tractors' },
};

function tractorThumbnail(brandSlug: string, modelSlug: string, title: string) {
  const image = getManifestMachinePrimaryImage(brandSlug, modelSlug);
  if (!image) return null;
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

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default async function TractorsPage() {
  const machines = await getMachines();
  const publishedMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const researchMachines = machines.filter((machine) => machine.dataStatus === 'review');
  const brandGroups = Array.from(
    publishedMachines.reduce<Map<string, typeof publishedMachines>>((groups, machine) => {
      const existing = groups.get(machine.brand) ?? [];
      existing.push(machine);
      groups.set(machine.brand, existing);
      return groups;
    }, new Map()),
  );

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/tractors`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: 'Tractor Specs by Brand and Model',
        description: 'Browse source-backed tractor specifications by manufacturer, including maintenance, OEM parts, attachment fitment and comparisons.',
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#manufacturers` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Tractors', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#manufacturers`,
        name: 'Tractor manufacturers',
        numberOfItems: brandGroups.length,
        itemListElement: brandGroups.map(([brand, brandMachines], index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: brand,
          url: `${baseUrl}/brands/${brandMachines[0]?.brandSlug}`,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Tractor specs by brand and model</h1>
        <p className="section-lead">Browse source-backed tractor specifications, maintenance, OEM parts, attachment fitment and comparison tools. Start with a manufacturer here, then use its brand hub for the complete published model list.</p>

        <div className="parts-stats">
          <div>
            <strong>{publishedMachines.length.toLocaleString('en-US')}</strong>
            <span>Published tractor models</span>
          </div>
          <div>
            <strong>{brandGroups.length.toLocaleString('en-US')}</strong>
            <span>Manufacturers represented</span>
          </div>
          <div>
            <strong>Official</strong>
            <span>Manufacturer-first source policy</span>
          </div>
        </div>

        <div className="parts-tool-callout">
          <div>
            <strong>Need to compare models?</strong>
            <span>Open the side-by-side tractor comparison tool, or choose a manufacturer below to browse its full tractor catalog.</span>
          </div>
          <Link className="tool-link" href="/compare">Compare tractors</Link>
        </div>

        {brandGroups.length > 0 && (
          <section className="catalog-group">
            <span className="eyebrow">Browse catalog</span>
            <h2>Tractor manufacturers</h2>
            <p className="section-note">Each manufacturer card shows a small sample only. The brand hub contains every published tractor model, while all model URLs remain included in the sitemap.</p>
            <div className="grid">
              {brandGroups.map(([brand, brandMachines]) => {
                const brandSlug = brandMachines[0]?.brandSlug;
                const representative = brandMachines.find((machine) => !getMachineGenerationLabel(machine.modelSlug)) ?? brandMachines[0];
                const sample = brandMachines.filter((machine) => !getMachineGenerationLabel(machine.modelSlug)).slice(0, 4);
                if (!brandSlug || !representative) return null;

                return (
                  <div className="card" key={brand}>
                    <Link href={`/brands/${brandSlug}`} aria-label={`Browse ${brand} tractors`}>
                      {tractorThumbnail(
                        representative.brandSlug,
                        representative.modelSlug,
                        `${brand} tractor catalog`,
                      )}
                    </Link>
                    <span className="eyebrow">Manufacturer</span>
                    <h3>{brand}</h3>
                    <p>{brandMachines.length.toLocaleString('en-US')} published tractor model{brandMachines.length === 1 ? '' : 's'}.</p>
                    {sample.length > 0 && (
                      <p>
                        <strong>Example models:</strong>{' '}
                        {sample.map((machine, index) => (
                          <span key={machine.id}>
                            {index > 0 ? ' · ' : ''}
                            <Link href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>{getMachineDisplayModel(machine)}</Link>
                          </span>
                        ))}
                      </p>
                    )}
                    <Link className="tool-link" href={`/brands/${brandSlug}`}>Browse all {brand} models →</Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="catalog-group">
          <h2>How to use the tractor catalog</h2>
          <div className="grid">
            <Link className="card" href="/brands">
              <span className="eyebrow">Manufacturers</span>
              <h3>Browse all farm equipment brands</h3>
              <p>Open brand hubs that combine tractors with other agricultural equipment from the same manufacturer.</p>
              <span className="tool-link">View brands →</span>
            </Link>
            <Link className="card" href="/parts">
              <span className="eyebrow">Parts reference</span>
              <h3>Search OEM parts</h3>
              <p>Find part numbers, replacement references and source-backed machine fitment.</p>
              <span className="tool-link">Browse parts →</span>
            </Link>
            <Link className="card" href="/fitment-checker">
              <span className="eyebrow">Compatibility</span>
              <h3>Check part fitment</h3>
              <p>Match an OEM part number to a machine and available serial or configuration context.</p>
              <span className="tool-link">Open fitment checker →</span>
            </Link>
          </div>
        </section>

        {researchMachines.length > 0 && (
          <section className="catalog-group">
            <h2>Models being researched</h2>
            <p className="section-note">Only models placed in editorial review are exposed here. Internal seed placeholders stay out of public navigation until source verification begins.</p>
            <div className="grid">
              {researchMachines.map((machine) => (
                <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                  {tractorThumbnail(machine.brandSlug, machine.modelSlug, machine.title)}
                  <span className="eyebrow">Research queue</span>
                  <h3>{getMachineDisplayModel(machine)}</h3>
                  <p>Source verification in progress.</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
