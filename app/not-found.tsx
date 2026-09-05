import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Page not found</span>
        <h1>We could not find that farm equipment page</h1>
        <p className="section-lead">
          The model, part number or attachment URL may have changed, or the record may not be published yet. Search the source-backed catalog or continue from one of the main directories below.
        </p>

        <form className="search-shell" action="/search" style={{ marginBottom: 28 }}>
          <input
            name="q"
            aria-label="Search farm equipment, attachment or part number"
            placeholder="Try a model or part number, for example 5075E or RE519626"
          />
          <button type="submit">Search catalog</button>
        </form>

        <div className="grid">
          <Link className="card" href="/tractors">
            <span className="eyebrow">Tractors</span>
            <h2>Browse tractor models</h2>
            <p>Find published tractor specifications, maintenance, parts and attachment references by manufacturer.</p>
          </Link>
          <Link className="card" href="/equipment">
            <span className="eyebrow">Farm equipment</span>
            <h2>Browse equipment types</h2>
            <p>Explore combines, loaders, planting, tillage, hay, application and utility equipment.</p>
          </Link>
          <Link className="card" href="/parts">
            <span className="eyebrow">Parts</span>
            <h2>Search OEM part numbers</h2>
            <p>Open source-backed fitment, replacement, cross-reference and maintenance-kit records.</p>
          </Link>
          <Link className="card" href="/attachments">
            <span className="eyebrow">Attachments</span>
            <h2>Browse attachment fitment</h2>
            <p>Find documented loaders, backhoes and other attachment compatibility references.</p>
          </Link>
        </div>

        <p style={{ marginTop: 28 }}>
          <Link className="tool-link" href="/">Return to Farm Machine Specs</Link>
        </p>
      </div>
    </main>
  );
}
