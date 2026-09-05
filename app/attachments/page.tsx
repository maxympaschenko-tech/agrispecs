import type { Metadata } from 'next';
import Link from 'next/link';
import { getAttachmentCatalog, type AttachmentCatalogItem } from '@/lib/attachments-service';
import styles from './attachments-page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Attachments and Compatibility',
  description: 'Source-backed farm equipment attachment fitment, including loaders, backhoes, buckets, grapples, forks, cutters and machine-specific configuration requirements.',
  alternates: { canonical: '/attachments' },
};

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function attachmentTypeLabel(type: string) {
  if (type === 'front-loader') return 'Front loader';
  if (type === 'backhoe') return 'Backhoe';
  return type
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Attachment';
}

export default async function AttachmentsPage() {
  const attachments = await getAttachmentCatalog();
  const fitmentCount = attachments.reduce((total, attachment) => total + attachment.compatibleMachineCount, 0);
  const manufacturerCount = new Set(attachments.map((attachment) => attachment.manufacturerSlug)).size;
  const typeGroups = Array.from(
    attachments.reduce<Map<string, AttachmentCatalogItem[]>>((groups, attachment) => {
      const current = groups.get(attachment.attachmentType) ?? [];
      current.push(attachment);
      groups.set(attachment.attachmentType, current);
      return groups;
    }, new Map()),
  ).sort(([a], [b]) => attachmentTypeLabel(a).localeCompare(attachmentTypeLabel(b)));

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/attachments`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: 'Farm Equipment Attachments and Compatibility',
        description: 'Source-backed farm equipment attachment fitment, including loaders, backhoes, material-handling tools and machine-specific configuration requirements.',
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#items` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Attachments', item: canonicalUrl },
        ],
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#items`,
        numberOfItems: attachments.length,
        itemListElement: attachments.map((attachment, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${baseUrl}/attachments/${attachment.manufacturerSlug}/${attachment.slug}`,
          name: `${attachment.manufacturerName} ${attachment.modelName} ${attachmentTypeLabel(attachment.attachmentType)}`,
        })),
      },
    ],
  };

  return (
    <main className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container">
        <span className="eyebrow">Attachment compatibility</span>
        <h1>Farm equipment attachments</h1>
        <p className="section-lead">Browse source-backed loaders, backhoes, buckets, grapples, pallet forks, cutters and other attachment fitment by machine model, including hydraulic, hitch and configuration requirements when the manufacturer publishes them.</p>

        {attachments.length > 0 && (
          <div className="parts-stats">
            <div>
              <strong>{attachments.length.toLocaleString('en-US')}</strong>
              <span>Published attachments</span>
            </div>
            <div>
              <strong>{fitmentCount.toLocaleString('en-US')}</strong>
              <span>Documented attachment-machine fitments</span>
            </div>
            <div>
              <strong>{manufacturerCount.toLocaleString('en-US')}</strong>
              <span>Attachment manufacturers</span>
            </div>
          </div>
        )}

        <form className="search-shell" action="/search" style={{ marginBottom: 28 }}>
          <input name="q" aria-label="Search attachment model or type" placeholder="Try: 120R, front loader, backhoe or pallet fork" />
          <button type="submit">Search attachments</button>
        </form>

        {typeGroups.length > 0 && (
          <section className="catalog-group">
            <span className="eyebrow">Browse catalog</span>
            <h2>Browse attachments by type</h2>
            <p className="section-note">Choose the attachment job first, then open its dedicated type catalog for manufacturer and model fitment references.</p>
            <div className={styles.typeDirectory}>
              {typeGroups.map(([type, items]) => {
                const manufacturers = new Set(items.map((item) => item.manufacturerSlug)).size;
                return (
                  <Link className={styles.typeCard} href={`/attachments/type/${type}`} key={type}>
                    <strong>{attachmentTypeLabel(type)}</strong>
                    <span>{items.length.toLocaleString('en-US')} attachment{items.length === 1 ? '' : 's'} · {manufacturers} manufacturer{manufacturers === 1 ? '' : 's'}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {typeGroups.map(([type, items]) => {
          const manufacturerGroups = Array.from(
            items.reduce<Map<string, AttachmentCatalogItem[]>>((groups, attachment) => {
              const current = groups.get(attachment.manufacturerSlug) ?? [];
              current.push(attachment);
              groups.set(attachment.manufacturerSlug, current);
              return groups;
            }, new Map()),
          );
          const typeFitmentCount = items.reduce((total, item) => total + item.compatibleMachineCount, 0);

          return (
            <section className="catalog-group" id={`type-${type}`} key={type}>
              <span className="eyebrow">Attachment type</span>
              <h2><Link href={`/attachments/type/${type}`}>{attachmentTypeLabel(type)}</Link></h2>
              <p className="section-note">
                {items.length.toLocaleString('en-US')} published attachment{items.length === 1 ? '' : 's'} with {typeFitmentCount.toLocaleString('en-US')} documented compatible-machine fitment{typeFitmentCount === 1 ? '' : 's'}. Open a model to see compatible machines and source context.
              </p>

              {manufacturerGroups.map(([manufacturerSlug, manufacturerItems]) => {
                const manufacturerName = manufacturerItems[0]?.manufacturerName || manufacturerSlug;
                return (
                  <div className={styles.manufacturerBlock} key={manufacturerSlug}>
                    <div className={styles.manufacturerHeader}>
                      <h3>{manufacturerName}</h3>
                      <span>{manufacturerItems.length} attachment{manufacturerItems.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className={styles.attachmentDirectory}>
                      {manufacturerItems.map((attachment) => (
                        <Link className={styles.attachmentLink} key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                          <strong>{attachment.modelName}</strong>
                          <span>{attachment.compatibleMachineCount} fitment{attachment.compatibleMachineCount === 1 ? '' : 's'}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}

              <p><Link className="tool-link" href={`/attachments/type/${type}`}>Open the {attachmentTypeLabel(type).toLowerCase()} compatibility hub →</Link></p>
            </section>
          );
        })}

        {attachments.length === 0 && <div className="notice">Source-backed attachment fitment records are being added.</div>}
      </div>
    </main>
  );
}
