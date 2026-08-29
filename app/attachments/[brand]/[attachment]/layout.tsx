import type { ReactNode } from 'react';
import { getAttachment } from '@/lib/attachments-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ brand: string; attachment: string }>;
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

export default async function AttachmentLayout({ children, params }: LayoutProps) {
  const { brand, attachment: slug } = await params;
  const item = await getAttachment(brand, slug);

  if (!item) return children;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com';
  const canonicalUrl = `${baseUrl}/attachments/${item.manufacturerSlug}/${item.slug}`;
  const typeLabel = attachmentTypeLabel(item.attachmentType);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${item.manufacturerName} ${item.modelName} ${typeLabel} compatibility`,
        description: `${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} compatibility, published specifications and source-backed tractor fitment.`,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: {
          '@id': `${canonicalUrl}#breadcrumb`,
        },
        about: {
          '@type': 'Thing',
          name: `${item.manufacturerName} ${item.modelName}`,
          additionalType: typeLabel,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Attachments',
            item: `${baseUrl}/attachments`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: `${item.manufacturerName} ${item.modelName}`,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      {children}
    </>
  );
}
