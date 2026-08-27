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
    title: `${info.name} Farm Equipment Models`,
    description: `Browse ${info.name} farm equipment model references, specifications, maintenance, parts and compatibility data.`,
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
          <h1>{info.name}</h1>
          <p className="section-lead">
            Farm equipment specifications, maintenance schedules, OEM parts, replacement numbers and compatibility references for {info.name} models.
          </p>

          {publishedMachines.length > 0 && (
            <section className="catalog-group">
              <h2>Models with published data</h2>
              <p className="section-note">These model pages contain source-backed technical, maintenance or parts data.</p>
              <div className="grid">
                {publishedMachines.map((machine) => (
                  <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>Specifications, maintenance and parts reference</p>
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

          {brandMachines.length === 0 && <div className="notice">No model records are available for this manufacturer yet.</div>}
        </div>
      </section>
    </main>
  );
}
