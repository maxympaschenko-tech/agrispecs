import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
  title: {
    default: 'AgriSpecs - Farm Equipment Specifications and Parts Reference',
    template: '%s | AgriSpecs',
  },
  description:
    'Farm equipment specifications, parts references, compatibility data, maintenance information, and model guides.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="logo" href="/">Agri<span>Specs</span></Link>
            <nav className="nav" aria-label="Main navigation">
              <Link href="/tractors">Tractors</Link>
              <Link href="/parts">Parts</Link>
              <Link href="/brands">Brands</Link>
              <Link href="/compare">Compare</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container">
            AgriSpecs is an independent farm equipment reference. Product names and trademarks belong to their respective owners.
          </div>
        </footer>
      </body>
    </html>
  );
}
