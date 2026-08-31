import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
const siteName = 'Farm Machine Specs';

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  title: {
    default: 'Farm Machine Specs - Farm Equipment Specifications and Parts Reference',
    template: `%s | ${siteName}`,
  },
  description:
    'Farm equipment specifications, parts references, compatibility data, maintenance information, and model guides for tractors and agricultural machinery.',
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName,
    title: 'Farm Machine Specs - Farm Equipment Specifications and Parts Reference',
    description:
      'Farm equipment specifications, parts references, compatibility data, maintenance information, and model guides for tractors and agricultural machinery.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Farm Machine Specs',
    description: 'Farm equipment specifications, parts, compatibility and maintenance reference.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: siteName,
    description: 'Independent source-backed farm equipment specifications, parts, compatibility and maintenance reference.',
    inLanguage: 'en-US',
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
        <header className="site-header">
          <div className="container header-inner">
            <Link className="logo" href="/" aria-label="Farm Machine Specs home">
              <img
                src="/farm-machine-specs-logo.svg"
                alt="Farm Machine Specs"
                width="336"
                height="48"
                style={{ display: 'block', width: 'auto', height: 42, maxWidth: '100%' }}
              />
            </Link>
            <nav className="nav" aria-label="Main navigation">
              <Link href="/tractors">Tractors</Link>
              <Link href="/equipment">Equipment</Link>
              <Link href="/parts">Parts</Link>
              <Link href="/attachments">Attachments</Link>
              <Link href="/fitment-checker">Fitment Checker</Link>
              <Link href="/brands">Brands</Link>
              <Link href="/compare">Compare</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            <p style={{ margin: 0 }}>
              Farm Machine Specs is an independent farm equipment reference. Product names and trademarks belong to their respective owners.
            </p>
            <nav aria-label="Footer navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 12 }}>
              <Link href="/about" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>About</Link>
              <Link href="/methodology" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Data Sources &amp; Methodology</Link>
              <Link href="/editorial-policy" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Editorial &amp; Corrections Policy</Link>
              <Link href="/contact" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Contact &amp; Corrections</Link>
              <Link href="/privacy" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Privacy</Link>
              <Link href="/terms" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Terms</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
