import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrands, getMachines } from '@/lib/catalog-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Brands',
  description: 'Browse agricultural equipment manufacturers with source-backed model specifications, maintenance, parts and compatibility references.',
  alternates: { canonical: '/brands' },
};

export default async function BrandsPage() {
  const [brands, machines] = await Promise.all([getBrands(), getMachines()]);
  const publishableCounts = new Map<string,number>();

  for (const machine of machines) {
    if (machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified') continue;
    publishableCounts.set(machine.brandSlug, (publishableCounts.get(machine.brandSlug) || 0) + 1);
  }

  const publishableBrands = brands.filter((brand) => (publishableCounts.get(brand.slug) || 0) > 0);

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Manufacturers</span>
        <h1>Farm equipment brands</h1>
        <p className="section-lead">Browse manufacturers with source-backed equipment data already published in the catalog.</p>
        <div className="grid">
          {publishableBrands.map((brand) => (
            <Link className="card" href={`/brands/${brand.slug}`} key={brand.slug}>
              <span className="eyebrow">Manufacturer</span>
              <h3>{brand.name}</h3>
              <p>{publishableCounts.get(brand.slug)} model{publishableCounts.get(brand.slug) === 1 ? '' : 's'} with published data</p>
            </Link>
          ))}
        </div>
        {publishableBrands.length === 0 && <div className="notice">Source-backed manufacturer pages are being prepared.</div>}
      </div>
    </main>
  );
}
