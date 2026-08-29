import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Editorial and Corrections Policy',
  description:
    'How Farm Machine Specs reviews sources, handles corrections, separates model versions and updates technical equipment records.',
  alternates: { canonical: '/editorial-policy' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default function EditorialPolicyPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalUrl = `${baseUrl}/editorial-policy`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: 'Editorial and Corrections Policy',
    description:
      'Editorial review, sourcing and correction standards for Farm Machine Specs.',
    isPartOf: { '@id': `${baseUrl}/#website` },
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Editorial standards</span>
        <h1>Editorial and corrections policy</h1>
        <p className="section-lead">
          Technical equipment data is useful only when readers can understand where it came from and when it may differ by configuration. Our editorial process is designed around traceable sources, explicit uncertainty and correctable records.
        </p>

        <section className="data-section">
          <h2>Source hierarchy</h2>
          <p>
            Official manufacturer pages, manuals, specification sheets, parts catalogs and other first-party technical records are preferred. Secondary references can help locate a source, but they are not used to overwrite a conflicting first-party value without review.
          </p>
        </section>

        <section className="data-section">
          <h2>Model-year and configuration differences</h2>
          <p>
            The same model name can cover different production years, engines, transmissions, tire packages or regional configurations. We avoid silently combining those versions. When a source identifies a specific configuration or serial-number context, that context should remain attached to the published value.
          </p>
        </section>

        <section className="data-section">
          <h2>No invented specifications</h2>
          <p>
            Missing data stays missing when a reliable source cannot be found. We do not calculate or infer a manufacturer specification merely because a neighboring model or an older generation publishes a similar value.
          </p>
        </section>

        <section className="data-section">
          <h2>Corrections</h2>
          <p>
            A correction should identify the affected brand and model or part number, the value that appears to be wrong, and preferably a manufacturer URL, manual page or catalog reference supporting the change. Corrections are reviewed against the source before the underlying record is changed.
          </p>
          <p>
            <Link className="tool-link" href="/contact">Submit a correction</Link>
          </p>
        </section>

        <section className="data-section">
          <h2>Commercial independence</h2>
          <p>
            Advertising, affiliate relationships or other commercial arrangements do not determine which technical value is published. If monetization is introduced, editorial and source-quality rules remain separate from advertising decisions.
          </p>
        </section>
      </div>
    </main>
  );
}