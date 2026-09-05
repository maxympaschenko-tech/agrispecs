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

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Tractor specs by brand and model</h1>
        <p className="section-lead">Browse source-backed tractor specifications, maintenance, OEM parts, attachment fitment and comparison tools for models published in the catalog.</p>

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
            <span>Open the side-by-side tractor comparison tool or browse a manufacturer hub.</span>
          </div>
          <Link className="tool-link" href="/compare">Compare tractors</Link>
        </div>

        {brandGroups.length > 0 && (
          <section className="catalog-group">
            <h2>Browse by manufacturer</h2>
            <p className="section-note">Jump directly to a manufacturer section or open its dedicated brand hub.</p>
            <div className="grid">
              {brandGroups.map(([brand, brandMachines]) => {
                const brandSlug = brandMachines[0]?.brandSlug;
                return (
                  <div className="card" key={brand}>
                    <span className="eyebrow">Manufacturer</span>
                    <h3>{brand}</h3>
                    <p>{brandMachines.length} published model{brandMachines.length === 1 ? '' : 's'} in the catalog.</p>
                    <a className="tool-link" href={`#brand-${brandSlug}`}>View models</a>{' '}
                    <Link className="tool-link" href={`/brands/${brandSlug}`}>Brand hub</Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {brandGroups.map(([brand, brandMachines]) => {
          const brandSlug = brandMachines[0]?.brandSlug;
          return (
            <section className="catalog-group" id={`brand-${brandSlug}`} key={brand}>
              <h2>{brand} tractor models</h2>
              <p className="section-note">Published {brand} model pages with source-backed specifications and related reference data.</p>
              <div className="grid">
                {brandMachines.map((machine) => {
                  const generationLabel = getMachineGenerationLabel(machine.modelSlug);
                  const displayModel = getMachineDisplayModel(machine);
                  return (
                    <div className="card" key={machine.id}>
                      <Link href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`} aria-label={`View ${machine.brand} ${displayModel}`}>
                        {tractorThumbnail(machine.brandSlug, machine.modelSlug, `${machine.brand} ${displayModel}`)}
                      </Link>
                      <span className="eyebrow">
                        {generationLabel || (machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data')}
                      </span>
                      <h3>{displayModel}</h3>
                      <p>{generationLabel ? 'Archived generation with its own source-backed specifications, parts and fitment context.' : 'Specs, maintenance, parts, fitment and related equipment.'}</p>
                      <Link className="tool-link" href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>View model</Link>{' '}
                      <Link className="tool-link" href={`/compare?m1=${machine.id}`}>Compare</Link>
                    </div>
                  );
                })}
              </div>
              <Link className="tool-link" href={`/brands/${brandSlug}`}>View all {brand} references</Link>
            </section>
          );
        })}

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
