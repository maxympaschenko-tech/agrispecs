import type { Metadata } from 'next';
import Link from 'next/link';
import { getMachines } from '@/lib/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Tractor Specifications and Parts Reference',
  description: 'Browse source-backed tractor specifications, maintenance schedules, OEM parts, replacement numbers and compatibility references.',
  alternates: { canonical: '/tractors' },
};

export default async function TractorsPage() {
  const machines = await getMachines();
  const publishedMachines = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const researchMachines = machines.filter(
    (machine) => machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified',
  );

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Tractors</h1>
        <p className="section-lead">Browse tractor models with source-backed specifications, maintenance, parts and compatibility data.</p>

        {publishedMachines.length > 0 && (
          <section className="catalog-group">
            <h2>Models with published data</h2>
            <p className="section-note">These pages contain verified or partially verified technical data with attached sources.</p>
            <div className="grid">
              {publishedMachines.map((machine) => (
                <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                  <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                  <h3>{machine.title}</h3>
                  <p>Specs, maintenance, parts, fitment and related equipment.</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {researchMachines.length > 0 && (
          <section className="catalog-group">
            <h2>Models being researched</h2>
            <p className="section-note">Model records are available for navigation, but numerical specifications stay unpublished until sources are verified.</p>
            <div className="grid">
              {researchMachines.map((machine) => (
                <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                  <span className="eyebrow">Research queue</span>
                  <h3>{machine.title}</h3>
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
