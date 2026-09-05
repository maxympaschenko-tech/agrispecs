'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Temporary problem</span>
        <h1>This catalog page could not be loaded</h1>
        <p className="section-lead">
          A temporary data or application error interrupted this request. You can retry the page immediately or continue from the main catalog.
        </p>

        <div className="data-section">
          <h2>Try the request again</h2>
          <p>Retry first. If the problem continues, return to the catalog and search the machine, attachment or part number again.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="tool-link" type="button" onClick={() => reset()} style={{ border: 0, cursor: 'pointer' }}>
              Retry this page
            </button>
            <Link className="tool-link" href="/">Return home</Link>
            <Link className="tool-link" href="/search">Open catalog search</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
