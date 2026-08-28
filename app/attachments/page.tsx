import type { Metadata } from 'next';
import Link from 'next/link';
import { getAttachmentCatalog } from '@/lib/attachments-service';

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

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Attachment compatibility</span>
        <h1>Farm equipment attachments</h1>
        <p className="section-lead">Browse source-backed loader, backhoe and other attachment fitment by tractor model, including configuration requirements when the manufacturer publishes them.</p>
        <div className="grid">
          {attachments.map((attachment) => (
            <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
              <span className="eyebrow">{attachmentTypeLabel(attachment.attachmentType)}</span>
              <h3>{attachment.manufacturerName} {attachment.modelName}</h3>
              <p>{attachment.compatibleMachineCount} verified tractor fitment record{attachment.compatibleMachineCount === 1 ? '' : 's'}</p>
            </Link>
          ))}
        </div>
        {attachments.length === 0 && <div className="notice">Verified attachment fitment records are being added.</div>}
      </div>
    </main>
  );
}
