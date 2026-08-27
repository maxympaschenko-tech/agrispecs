import type { Metadata } from 'next';
import Link from 'next/link';
import { getBrands } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Farm Equipment Brands',
  description: 'Browse agricultural equipment manufacturers and model references.',
};

export default function BrandsPage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Manufacturers</span>
        <h1>Farm equipment brands</h1>
        <p className="section-lead">Browse manufacturers currently included in the seed catalog.</p>
        <div className="grid">
          {getBrands().map((brand) => (
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
