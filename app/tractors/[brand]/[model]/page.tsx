import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMachine, machines } from '@/lib/catalog';

type PageProps = {
  params: Promise<{ brand: string; model: string }>;
};

const sections = [
  ['overview', 'Overview'],
  ['engine', 'Engine'],
  ['transmission', 'Transmission'],
  ['pto', 'PTO'],
  ['hydraulics', 'Hydraulics'],
  ['dimensions', 'Dimensions & Weight'],
  ['tires', 'Tires'],
  ['capacities', 'Capacities & Fluids'],
  ['maintenance', 'Maintenance'],
  ['parts', 'Parts'],
  ['attachments', 'Attachments'],
  ['serial-numbers', 'Serial Numbers'],
] as const;

export function generateStaticParams() {
  return machines.map((machine) => ({
    brand: machine.brandSlug,
    model: machine.modelSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, model } = await params;
  const machine = getMachine(brand, model);
  if (!machine) return {};

  return {
    title: `${machine.title} Specs, Parts and Maintenance`,
    description: `${machine.title} specifications, maintenance information, compatible parts, fluids, filters, attachments and reference data.`,
    alternates: { canonical: `/tractors/${machine.brandSlug}/${machine.modelSlug}` },
  };
}

export default async function TractorModelPage({ params }: PageProps) {
  const { brand, model } = await params;
  const machine = getMachine(brand, model);
  if (!machine) notFound();

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/tractors">Tractors</Link> / {machine.brand} / {machine.model}
      </div>
      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">Tractor reference</span>
          <h1>{machine.title}</h1>
          <p>Specifications, maintenance, parts and compatibility reference.</p>
          <div className="notice">
            This model page is part of the initial catalog build. Numerical specifications will be published only after source verification.
          </div>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </aside>

          <div>
            {sections.map(([id, label]) => (
              <section className="data-section" id={id} key={id}>
                <h2>{label}</h2>
                <div className="placeholder-row"><span>Data status</span><span>Verification queued</span></div>
                <div className="placeholder-row"><span>Sources</span><span>Official and technical references planned</span></div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
