import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrands } from '@/lib/catalog-service';

export const metadata: Metadata = {
  title: 'Farm Equipment Brands',
  description: 'Browse agricultural equipment manufacturers and model references.',
};

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Manufacturers</span>
        <h1>Farm equipment brands</h1>
        <p className="section-lead">Browse manufacturers currently included in the catalog.</p>
        <div className="grid">
          {brands.map((brand) => (
            <Link className="card" href={`/brands/${brand.slug}`} key={brand.slug}>
              <h3>{brand.name}</h3>
              <p>View models</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
