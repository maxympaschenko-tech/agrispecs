import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';
import { getBrands as getSeedBrands } from '@/lib/catalog';

type PageProps = { params: Promise<{ brand: string }> };

export function generateStaticParams() {
  return getSeedBrands().map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const brands = await getBrands();
  const info = brands.find((item) => item.slug === brand);
  if (!info) return {};

  return {
    title: `${info.name} Farm Equipment Models`,
    description: `Browse ${info.name} farm equipment model references, specifications, maintenance and parts data.`,
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

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Manufacturer</span>
        <h1>{info.name}</h1>
        <p className="section-lead">Equipment models currently available in the catalog.</p>
        <div className="grid">
          {brandMachines.map((machine) => (
            <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
              <h3>{machine.title}</h3>
              <p>Specifications, maintenance and parts reference</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
