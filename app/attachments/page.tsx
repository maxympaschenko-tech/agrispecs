import type { Metadata } from 'next';
import Link from 'next/link';
import { getAttachmentCatalog, type AttachmentCatalogItem } from '@/lib/attachments-service';

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
  const groups = attachments.reduce<Map<string, AttachmentCatalogItem[]>>((map, attachment) => {
    const list = map.get(attachment.manufacturerName) ?? [];
    list.push(attachment);
    map.set(attachment.manufacturerName, list);
    return map;
  }, new Map());

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
              <span>Verified machine fitment records</span>
            </div>
            <div>
              <strong>{manufacturerCount.toLocaleString('en-US')}</strong>
              <span>Attachment manufacturers</span>
            </div>
          </div>
        )}

        {Array.from(groups.entries()).map(([manufacturer, items]) => (
          <section className="catalog-group" key={manufacturer}>
            <h2>{manufacturer} attachments</h2>
            <p className="section-note">{items.length} published attachment{items.length === 1 ? '' : 's'} with source-backed machine compatibility.</p>
            <div className="grid">
              {items.map((attachment) => (
                <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                  <span className="eyebrow">{attachmentTypeLabel(attachment.attachmentType)}</span>
                  <h3>{attachment.modelName}</h3>
                  <p>{attachment.compatibleMachineCount} verified machine fitment record{attachment.compatibleMachineCount === 1 ? '' : 's'}</p>
                  <span className="tool-link">View fitment</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {attachments.length === 0 && <div className="notice">Verified attachment fitment records are being added.</div>}
      </div>
    </main>
  );
}
