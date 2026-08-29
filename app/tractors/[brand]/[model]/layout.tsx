import type { ReactNode } from 'react';
import Link from 'next/link';
import { getMachine } from '@/lib/catalog-service';
import { comparisonPresets } from '@/lib/comparison-presets';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string; model: string }>;
};

export default async function TractorModelLayout({ children, params }: LayoutProps) {
  const { brand, model } = await params;
  const machine = await getMachine(brand, model);
  const isPublished = machine && (machine.dataStatus === 'partial' || machine.dataStatus === 'verified');
  const relatedComparisons = isPublished
    ? comparisonPresets.filter((preset) =>
        preset.machines.some((target) => target.brand === machine.brand && target.model === machine.model),
      )
    : [];

  return (
    <>
      {children}
      {isPublished && relatedComparisons.length > 0 && (
        <section className="section">
          <div className="container">
            <span className="eyebrow">Related comparisons</span>
            <h2>Compare {machine.model} with similar tractors</h2>
            <p className="section-lead">Open source-backed side-by-side comparisons that include this tractor.</p>
            <div className="grid">
              {relatedComparisons.slice(0, 4).map((preset) => (
                <Link className="card" key={preset.slug} href={`/compare/${preset.slug}`}>
                  <span className="eyebrow">Tractor comparison</span>
                  <h3>{preset.title}</h3>
                  <p>{preset.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      {isPublished && (
        <Link
          href={`/compare?m1=${encodeURIComponent(machine.id)}`}
          aria-label={`Compare ${machine.title} with another tractor`}
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--brand)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(16,39,25,.22)',
          }}
        >
          Compare this tractor
        </Link>
      )}
    </>
  );
}
