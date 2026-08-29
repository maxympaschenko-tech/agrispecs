import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy information for visitors to Farm Machine Specs.',
  alternates: { canonical: '/privacy' },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Site information</span>
        <h1>Privacy policy</h1>
        <p className="section-lead">This policy explains the basic information that may be processed when you use Farm Machine Specs.</p>

        <section className="data-section">
          <h2>Technical data</h2>
          <p>
            Like most websites, our hosting infrastructure may process standard technical information such as IP address, browser type, requested pages, timestamps, referring pages and diagnostic logs. This information is used for security, reliability and performance monitoring.
          </p>
        </section>

        <section className="data-section">
          <h2>Contact messages</h2>
          <p>
            If you contact us, the information you choose to provide may be used to respond to your message, investigate a correction or improve the equipment reference. Please do not send sensitive personal information that is not necessary for your request.
          </p>
        </section>

        <section className="data-section">
          <h2>Cookies, analytics and advertising</h2>
          <p>
            Farm Machine Specs may use cookies or similar technologies for essential site functions, audience measurement or advertising. If third-party analytics or advertising services are enabled, those providers may process data according to their own privacy policies and consent requirements.
          </p>
          <p>
            Third-party advertising vendors, including Google, may use cookies to serve or measure ads when advertising is enabled. Where required, visitors will be given the applicable consent or privacy controls.
          </p>
        </section>

        <section className="data-section">
          <h2>External links</h2>
          <p>
            Equipment pages may link to manufacturer websites or other external sources. Farm Machine Specs does not control the privacy practices of those third-party websites.
          </p>
        </section>

        <section className="data-section">
          <h2>Policy updates</h2>
          <p>
            This policy may be updated as site features, analytics, advertising or legal requirements change. The current version published on this page applies to use of the site.
          </p>
        </section>
      </div>
    </main>
  );
}