import type { Metadata } from 'next';
import Link from 'next/link';
import { machines } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Tractor Specifications and Parts Reference',
  description: 'Browse tractor models by manufacturer and open specifications, maintenance, parts and compatibility reference pages.',
};

export default function TractorsPage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Equipment catalog</span>
        <h1>Tractors</h1>
        <p className="section-lead">Browse tractor models from major agricultural equipment manufacturers.</p>
        <div className="grid">
          {machines.map((machine) => (
            <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
              <h3>{machine.title}</h3>
              <p>Specs, maintenance, parts, fitment and related equipment.</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
