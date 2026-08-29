import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Farm Machine Specs',
  description:
    'Learn what Farm Machine Specs publishes, how the independent reference is built, and who the site is designed to help.',
  alternates: { canonical: '/about' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalUrl = `${baseUrl}/about`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: 'About Farm Machine Specs',
        description:
          'About the independent Farm Machine Specs equipment specifications, parts and fitment reference.',
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'About', item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">About the project</span>
        <h1>About Farm Machine Specs</h1>
        <p className="section-lead">
          Farm Machine Specs is an independent reference for tractor specifications, OEM parts, attachment compatibility, maintenance information and model comparisons used by equipment owners, buyers and service professionals in the United States.
        </p>

        <section className="data-section">
          <h2>What we are building</h2>
          <p>
            The goal is to make farm equipment research easier by organizing technical information around real machines, parts and fitment relationships instead of scattering it across unrelated pages. A model page can connect specifications, maintenance references, compatible parts, attachments and comparisons in one place.
          </p>
        </section>

        <section className="data-section">
          <h2>Source-backed, not guessed</h2>
          <p>
            We prioritize manufacturer product pages, manuals, specification sheets, parts catalogs and other first-party technical records. When a value cannot be verified reliably, we prefer to leave it unpublished rather than fill the gap with an estimate copied from a related model.
          </p>
          <p>
            <Link className="tool-link" href="/methodology">Read our data sources and methodology</Link>
          </p>
        </section>

        <section className="data-section">
          <h2>Independent reference</h2>
          <p>
            Farm Machine Specs is not affiliated with, endorsed by or operated by the equipment manufacturers listed on the site. Product names, model names and trademarks belong to their respective owners and are used for identification and reference purposes.
          </p>
        </section>

        <section className="data-section">
          <h2>Corrections matter</h2>
          <p>
            Farm equipment specifications can vary by model year, market, configuration and serial-number range. If you find a source-backed error or a missing manufacturer document, please send it through our contact and corrections page so the underlying record can be reviewed.
          </p>
          <p>
            <Link className="tool-link" href="/contact">Contact us or submit a correction</Link>
          </p>
        </section>
      </div>
    </main>
  );
}