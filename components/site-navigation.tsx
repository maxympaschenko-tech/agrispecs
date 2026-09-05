import Link from 'next/link';
import styles from './site-navigation.module.css';

const navigationLinks = [
  { href: '/tractors', label: 'Tractors' },
  { href: '/equipment', label: 'Equipment' },
  { href: '/parts', label: 'Parts' },
  { href: '/attachments', label: 'Attachments' },
  { href: '/fitment-checker', label: 'Fitment Checker' },
  { href: '/brands', label: 'Brands' },
  { href: '/compare', label: 'Compare' },
] as const;

export function SiteNavigation() {
  return (
    <>
      <nav className={styles.desktopNav} aria-label="Main navigation">
        {navigationLinks.map((item) => (
          <Link key={item.href} href={item.href}>{item.label}</Link>
        ))}
      </nav>

      <details className={styles.mobileMenu}>
        <summary>Browse site</summary>
        <nav className={styles.mobileLinks} aria-label="Mobile navigation">
          {navigationLinks.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
      </details>
    </>
  );
}
