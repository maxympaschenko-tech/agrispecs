import type { Metadata } from 'next';
import Link from 'next/link';
import { getAttachmentCatalog, type AttachmentCatalogItem } from '@/lib/attachments-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Attachments and Compatibility',
  description: 'Source-backed farm equipment attachment fitment, including front loaders, backhoes and tractor-specific configuration requirements.',
  alternates: { canonical: '/attachments' },
};

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

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Attachment compatibility</span>
        <h1>Farm equipment attachments</h1>
        <p className="section-lead">Browse source-backed loader, backhoe and other attachment fitment by tractor model, including configuration requirements when the manufacturer publishes them.</p>

        {attachments.length > 0 && (
          <div className="parts-stats">
            <div>
              <strong>{attachments.length.toLocaleString('en-US')}</strong>
              <span>Published attachments</span>
            </div>
            <div>
              <strong>{fitmentCount.toLocaleString('en-US')}</strong>
              <span>Verified tractor fitment records</span>
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
            <p className="section-note">{items.length} published attachment{items.length === 1 ? '' : 's'} with source-backed tractor compatibility.</p>
            <div className="grid">
              {items.map((attachment) => (
                <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                  <span className="eyebrow">{attachmentTypeLabel(attachment.attachmentType)}</span>
                  <h3>{attachment.modelName}</h3>
                  <p>{attachment.compatibleMachineCount} verified tractor fitment record{attachment.compatibleMachineCount === 1 ? '' : 's'}</p>
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
