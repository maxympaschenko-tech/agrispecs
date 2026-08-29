import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ brand: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const [brands, machines] = await Promise.all([getBrands(), getMachinesByBrand(brand)]);
  const info = brands.find((item) => item.slug === brand);
  if (!info) return {};

  const publishableCount = machines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  ).length;

  return {
    title: `${info.name} Tractor Specs and Farm Equipment Models`,
    description: `Browse ${info.name} tractor specifications, model references, maintenance, OEM parts, attachments and compatibility data.`,
    alternates: { canonical: `/brands/${info.slug}` },
    robots: publishableCount > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { brand } = await params;
  const [brands, brandMachines] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
  ]);
  const info = brands.find((item) => item.slug === brand);
  if (!info) notFound();

  const publishedMachines = brandMachines.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const verifiedCount = publishedMachines.filter((machine) => machine.dataStatus === 'verified').length;
  const partialCount = publishedMachines.length - verifiedCount;
  const researchMachines = brandMachines.filter(
    (machine) => machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified',
  );

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/brands">Brands</Link> / {info.name}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Manufacturer</span>
          <h1>{info.name} tractor specs and model reference</h1>
          <p className="section-lead">
            Source-backed tractor specifications, maintenance schedules, OEM parts, replacement numbers, attachments and compatibility references for {info.name} equipment.
          </p>

          <div className="parts-stats">
            <div>
              <strong>{publishedMachines.length.toLocaleString('en-US')}</strong>
              <span>Models with published data</span>
            </div>
            <div>
              <strong>{verifiedCount.toLocaleString('en-US')}</strong>
              <span>Verified model records</span>
            </div>
            <div>
              <strong>{partialCount.toLocaleString('en-US')}</strong>
              <span>Source-backed partial records</span>
            </div>
          </div>

          <div className="grid">
            <Link className="card" href="/compare">
              <span className="eyebrow">Comparison</span>
              <h3>Compare {info.name} tractors</h3>
              <p>Put published normalized specifications side by side with models from other brands.</p>
              <span className="tool-link">Open Compare</span>
            </Link>
            <Link className="card" href="/parts">
              <span className="eyebrow">Parts reference</span>
              <h3>Search OEM parts</h3>
              <p>Search part numbers, replacement references and verified machine fitment records.</p>
              <span className="tool-link">Browse parts</span>
            </Link>
            <Link className="card" href="/attachments">
              <span className="eyebrow">Attachments</span>
              <h3>Browse compatible attachments</h3>
              <p>Find source-backed loader, backhoe and attachment fitment where available.</p>
              <span className="tool-link">View attachments</span>
            </Link>
          </div>

          {publishedMachines.length > 0 && (
            <section className="catalog-group">
              <h2>{info.name} models with published data</h2>
              <p className="section-note">These pages contain source-backed technical, maintenance, parts or compatibility data.</p>
              <div className="grid">
                {publishedMachines.map((machine) => (
                  <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>Specifications, maintenance, parts and compatibility reference.</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {researchMachines.length > 0 && (
            <section className="catalog-group">
              <h2>Models being researched</h2>
              <p className="section-note">These model records are present in the catalog, but numerical specifications are not published until the source data is verified.</p>
              <div className="grid">
                {researchMachines.map((machine) => (
                  <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    <span className="eyebrow">Research queue</span>
                    <h3>{machine.title}</h3>
                    <p>Source verification in progress</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="catalog-group">
            <h2>How {info.name} data is verified</h2>
            <p className="section-note">
              Published values are tied to manufacturer-first source records whenever possible. Missing specifications remain unpublished rather than being inferred from neighboring models.
            </p>
            <Link className="tool-link" href="/methodology">Read our data methodology</Link>
          </section>

          {brandMachines.length === 0 && <div className="notice">No model records are available for this manufacturer yet.</div>}
        </div>
      </section>
    </main>
  );
}
