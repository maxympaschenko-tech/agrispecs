import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using the Farm Machine Specs independent farm equipment reference.',
  alternates: { canonical: '/terms' },
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Site information</span>
        <h1>Terms of use</h1>
        <p className="section-lead">
          Farm Machine Specs is an independent informational reference. By using the site, you agree to use the published information as reference material and to verify critical technical details for the exact equipment involved.
        </p>

        <section className="data-section">
          <h2>Informational reference</h2>
          <p>
            Specifications, part numbers, fitment relationships, maintenance references and comparisons are provided for general informational purposes. Equipment can vary by model year, configuration, market and serial-number range.
          </p>
        </section>

        <section className="data-section">
          <h2>Verify critical information</h2>
          <p>
            Before performing service, repair, installation, towing, loading, purchasing or other safety-sensitive work, verify the relevant information with the manufacturer documentation, dealer or qualified service professional for the exact machine or component.
          </p>
        </section>

        <section className="data-section">
          <h2>Trademarks and manufacturer names</h2>
          <p>
            Product names, model names, logos and trademarks belong to their respective owners. Their appearance on Farm Machine Specs is for identification and reference and does not imply affiliation, sponsorship or endorsement.
          </p>
        </section>

        <section className="data-section">
          <h2>External sources</h2>
          <p>
            Links to manufacturer pages, manuals or other third-party websites are provided for reference. External content can change, move or become unavailable, and Farm Machine Specs does not control those sites.
          </p>
        </section>

        <section className="data-section">
          <h2>Changes to the site</h2>
          <p>
            Data, features and these terms may be updated as the reference expands. The current version published on this page applies to use of the site.
          </p>
        </section>
      </div>
    </main>
  );
}