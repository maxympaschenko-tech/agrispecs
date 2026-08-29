import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact and Corrections',
  description: 'Contact Farm Machine Specs about equipment data, source documents, corrections or site questions.',
  alternates: { canonical: '/contact' },
  robots: { index: false, follow: true },
};

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@farmmachinespecs.com';
  const correctionSubject = encodeURIComponent('Farm Machine Specs correction');

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Contact</span>
        <h1>Contact and corrections</h1>
        <p className="section-lead">
          Found a specification that needs review, a missing manufacturer document or a fitment record that needs more context? Source-backed corrections are welcome.
        </p>

        <section className="data-section">
          <h2>Submit a correction</h2>
          <p>Please include as much of the following as possible:</p>
          <ul>
            <li>manufacturer and exact model name, or the OEM part number;</li>
            <li>the value or fitment relationship that appears incorrect;</li>
            <li>model year, configuration or serial-number range when relevant;</li>
            <li>a manufacturer URL, manual page, catalog reference or other supporting source.</li>
          </ul>
          <p>
            Email: <a className="tool-link" href={`mailto:${contactEmail}?subject=${correctionSubject}`}>{contactEmail}</a>
          </p>
        </section>

        <section className="data-section">
          <h2>General questions</h2>
          <p>
            The same address can be used for source submissions, copyright or trademark questions, technical issues with the site and other project-related inquiries.
          </p>
        </section>

        <section className="data-section">
          <h2>Before relying on a specification</h2>
          <p>
            Farm equipment can differ by year, configuration and market. For service, repair, safety or purchasing decisions, verify critical values against the manufacturer documentation for the exact machine involved.
          </p>
        </section>
      </div>
    </main>
  );
}