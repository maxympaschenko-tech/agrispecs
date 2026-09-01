import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Data Sources and Methodology',
  description:
    'How Farm Machine Specs collects, normalizes and publishes manufacturer-backed farm equipment, parts and attachment data.',
  alternates: { canonical: '/methodology' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default function MethodologyPage() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/methodology`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: 'Data Sources and Methodology',
        description:
          'How Farm Machine Specs collects, normalizes and publishes manufacturer-backed farm equipment, parts and attachment data.',
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        about: {
          '@type': 'Thing',
          name: 'Farm equipment data sourcing and normalization methodology',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Data Sources & Methodology', item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Editorial standards</span>
        <h1>Data sources and methodology</h1>
        <p className="section-lead">
          Farm Machine Specs is built as a structured equipment reference. We prioritize official manufacturer records, preserve source provenance and avoid filling gaps with guessed specifications.
        </p>

        <section className="data-section">
          <h2>Manufacturer-first sourcing</h2>
          <p>
            Current machine specifications are collected from official manufacturer product pages, specification sheets, price books, parts catalogs and other first-party technical material whenever available. Each stored specification can be linked back to the source record used to support it.
          </p>
        </section>

        <section className="data-section">
          <h2>Current and historical versions</h2>
          <p>
            A model name can exist across multiple years or configurations. We keep version records separate and mark the current market version when the manufacturer provides enough evidence to do so. Older records are not silently merged into a current model.
          </p>
        </section>

        <section className="data-section">
          <h2>Normalized specifications</h2>
          <p>
            Published values are mapped to normalized specification keys so comparable machines from different brands can be evaluated consistently. Units are normalized only when a reliable conversion is possible. Text values remain text when converting them would change their meaning or erase a configuration distinction.
          </p>
        </section>

        <section className="data-section">
          <h2>Missing values stay missing</h2>
          <p>
            If a current official source does not publish a value, we prefer to leave that specification blank rather than infer it from a related model, family page or older generation. A missing value is not treated as zero and is not treated as a difference in comparisons unless at least two published values are available.
          </p>
        </section>

        <section className="data-section">
          <h2>Confidence and publication status</h2>
          <p>
            Source-backed values can carry an official or otherwise explicit confidence level. Models may be published as partial when useful verified data exists but the record is not yet complete. This lets the site expand without presenting incomplete records as exhaustive specifications.
          </p>
        </section>

        <section className="data-section">
          <h2>Parts and fitment</h2>
          <p>
            Parts, replacements and attachment compatibility are published only when a source record supports the relationship. A fitment published for one tractor, loader, excavator, utility vehicle or other machine is not automatically copied to a neighboring model or series. Hydraulic-flow ranges, hitch or coupler type, carrier or mount, axle or transmission requirements, serial-number context and other configuration limits are retained when the manufacturer provides them.
          </p>
          <p>
            A compatible-attachment record means the cited source supports that relationship; it does not mean the attachment is standard equipment or that every configuration of the machine can use it. Missing fitment is also not interpreted as proof of incompatibility.
          </p>
        </section>

        <section className="data-section">
          <h2>Independent reference</h2>
          <p>
            Farm Machine Specs is an independent reference and is not affiliated with John Deere, Case IH, New Holland, Kubota or other equipment manufacturers. Product names and trademarks belong to their respective owners.
          </p>
          <p>
            <Link className="tool-link" href="/equipment">Browse farm equipment</Link>{' · '}
            <Link className="tool-link" href="/tractors">Browse tractor specifications</Link>{' · '}
            <Link className="tool-link" href="/attachments">Browse attachments</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
