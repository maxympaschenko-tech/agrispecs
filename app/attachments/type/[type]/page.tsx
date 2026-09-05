import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttachmentCatalog, type AttachmentCatalogItem } from '@/lib/attachments-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ type: string }>;
};

const typeDescriptions: Record<string, string> = {
  'front-loader': 'Source-backed front loader compatibility by manufacturer and model, including documented tractor or machine fitment and configuration context.',
  backhoe: 'Source-backed backhoe attachment compatibility by manufacturer and model, including documented machine fitment and configuration requirements.',
  bucket: 'Source-backed bucket attachment compatibility by manufacturer and model with documented compatible machines.',
  grapple: 'Source-backed grapple attachment compatibility by manufacturer and model with documented compatible machines.',
  'pallet-fork': 'Source-backed pallet fork attachment compatibility by manufacturer and model with documented compatible machines.',
  cutter: 'Source-backed cutter attachment compatibility by manufacturer and model with documented compatible machines.',
};

function normalizeType(value: string) {
  try {
    const normalized = decodeURIComponent(value).trim().toLowerCase();
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : '';
  } catch {
    return '';
  }
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

function descriptionFor(type: string, label: string) {
  return typeDescriptions[type]
    || `Source-backed ${label.toLowerCase()} attachment compatibility by manufacturer and model, with documented machine fitment where published.`;
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type: rawType } = await params;
  const type = normalizeType(rawType);
  if (!type) return {};

  const attachments = (await getAttachmentCatalog()).filter((item) => item.attachmentType === type);
  if (attachments.length === 0) return {};

  const label = attachmentTypeLabel(type);
  return {
    title: `${label} Attachments - Farm Equipment Compatibility`,
    description: descriptionFor(type, label),
    alternates: { canonical: `/attachments/type/${type}` },
    robots: { index: true, follow: true },
  };
}

export default async function AttachmentTypePage({ params }: PageProps) {
  const { type: rawType } = await params;
  const type = normalizeType(rawType);
  if (!type) notFound();

  const catalog = await getAttachmentCatalog();
  const attachments = catalog.filter((item) => item.attachmentType === type);
  if (attachments.length === 0) notFound();

  const label = attachmentTypeLabel(type);
  const description = descriptionFor(type, label);
  const fitmentCount = attachments.reduce((total, item) => total + item.compatibleMachineCount, 0);
  const manufacturerCount = new Set(attachments.map((item) => item.manufacturerSlug)).size;
  const manufacturerGroups = Array.from(
    attachments.reduce<Map<string, AttachmentCatalogItem[]>>((groups, attachment) => {
      const current = groups.get(attachment.manufacturerSlug) ?? [];
      current.push(attachment);
      groups.set(attachment.manufacturerSlug, current);
      return groups;
    }, new Map()),
  );
  const relatedTypes = Array.from(new Set(catalog.map((item) => item.attachmentType)))
    .filter((itemType) => itemType !== type)
    .sort((a, b) => attachmentTypeLabel(a).localeCompare(attachmentTypeLabel(b)));

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/attachments/type/${type}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: `${label} Attachments - Farm Equipment Compatibility`,
        description,
        isPartOf: { '@id': `${baseUrl}/#website` },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: { '@id': `${canonicalUrl}#items` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
          { '@type': 'ListItem', position: 2, name: 'Attachments', item: `${baseUrl}/attachments` },
          { '@type': 'ListItem', position: 3, name: label, item: canonicalUrl },
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
          name: `${attachment.manufacturerName} ${attachment.modelName} ${label}`,
        })),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/attachments">Attachments</Link> / {label}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Attachment type</span>
          <h1>{label} attachments and compatibility</h1>
          <p className="section-lead">{description}</p>

          <div className="parts-stats">
            <div><strong>{attachments.length.toLocaleString('en-US')}</strong><span>Published {label.toLowerCase()} models</span></div>
            <div><strong>{fitmentCount.toLocaleString('en-US')}</strong><span>Documented machine fitments</span></div>
            <div><strong>{manufacturerCount.toLocaleString('en-US')}</strong><span>Manufacturers represented</span></div>
          </div>

          <div className="notice">
            Compatibility is published only when a cited source supports the attachment-machine relationship. A listed fitment can still depend on hydraulic, hitch, axle, carrier, model-year or mounting configuration.
          </div>

          {manufacturerGroups.map(([manufacturerSlug, items]) => {
            const manufacturerName = items[0]?.manufacturerName || manufacturerSlug;
            return (
              <section className="catalog-group" key={manufacturerSlug}>
                <span className="eyebrow">Manufacturer</span>
                <h2>{manufacturerName}</h2>
                <p className="section-note">{items.length.toLocaleString('en-US')} published {label.toLowerCase()} attachment{items.length === 1 ? '' : 's'} with source-backed compatible-machine records.</p>
                <div className="grid">
                  {items.map((attachment) => (
                    <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                      <span className="eyebrow">{manufacturerName} · {label}</span>
                      <h3>{attachment.modelName}</h3>
                      <p>{attachment.compatibleMachineCount.toLocaleString('en-US')} documented compatible machine{attachment.compatibleMachineCount === 1 ? '' : 's'}.</p>
                      <span className="tool-link">View fitment →</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {relatedTypes.length > 0 && (
            <section className="catalog-group">
              <h2>Other attachment types</h2>
              <p className="section-note">Continue through the published attachment catalog by job and attachment type.</p>
              <div className="grid">
                {relatedTypes.map((relatedType) => (
                  <Link className="card" key={relatedType} href={`/attachments/type/${relatedType}`}>
                    <span className="eyebrow">Attachment type</span>
                    <h3>{attachmentTypeLabel(relatedType)}</h3>
                    <p>Browse source-backed attachment models and compatible machines.</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
