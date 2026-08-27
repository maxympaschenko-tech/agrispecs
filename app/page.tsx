import Link from 'next/link';
import { getBrands, machines } from '@/lib/catalog';

export default function HomePage() {
  const brands = getBrands();

  return (
    <main>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Farm equipment reference</span>
          <h1>Find specs, parts and compatibility for farm equipment.</h1>
          <p>
            A structured reference for tractors, combines, implements and parts. Search by machine model, OEM part number or manufacturer.
          </p>
          <form className="search-shell" action="/search">
            <input name="q" aria-label="Search equipment or part number" placeholder="Try: John Deere 5075E or an OEM part number" />
            <button type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Browse tractors</h2>
          <p className="section-lead">The first catalog section is being built around major brands used in the United States.</p>
          <div className="grid">
            {machines.map((machine) => (
              <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                <span className="eyebrow">Tractor</span>
                <h3>{machine.title}</h3>
                <p>Specifications, maintenance, parts and compatibility reference.</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Manufacturers</h2>
          <p className="section-lead">Browse equipment by manufacturer.</p>
          <div className="grid">
            {brands.map((brand) => (
              <Link className="card" key={brand.slug} href={`/brands/${brand.slug}`}>
                <h3>{brand.name}</h3>
                <p>Models and equipment reference</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
