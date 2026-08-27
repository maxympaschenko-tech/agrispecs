import type { Metadata } from 'next';
import Link from 'next/link';
import { getAttachmentCatalog } from '@/lib/attachments-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Attachments and Compatibility',
  description: 'Source-backed farm equipment attachment compatibility, including front loaders and compatible tractor models.',
  alternates: { canonical: '/attachments' },
};

export default async function AttachmentsPage() {
  const attachments = await getAttachmentCatalog();

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Attachment compatibility</span>
        <h1>Farm equipment attachments</h1>
        <p className="section-lead">Browse source-backed loader and attachment compatibility by model.</p>
        <div className="grid">
          {attachments.map((attachment) => (
            <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
              <span className="eyebrow">{attachment.attachmentType === 'front-loader' ? 'Front loader' : 'Attachment'}</span>
              <h3>{attachment.manufacturerName} {attachment.modelName}</h3>
              <p>{attachment.compatibleMachineCount} verified compatible tractor{attachment.compatibleMachineCount === 1 ? '' : 's'}</p>
            </Link>
          ))}
        </div>
        {attachments.length === 0 && <div className="notice">Verified attachment compatibility records are being added.</div>}
      </div>
    </main>
  );
}
