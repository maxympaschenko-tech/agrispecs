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

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://farmmachinespecs.com').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/attachments/${item.manufacturerSlug}/${item.slug}`;
  const typeLabel = attachmentTypeLabel(item.attachmentType);
  const equipmentTypes = Array.from(new Set(item.compatibleMachines.map((machine) => machine.equipmentType)));
  const localImageUrl = '/media/fallbacks/attachment.svg';
  const productId = `${canonicalUrl}#product`;
  const productProperties = [
    item.liftCapacityText ? { '@type': 'PropertyValue', name: 'Capacity', value: item.liftCapacityText } : null,
    item.liftHeightText ? { '@type': 'PropertyValue', name: 'Working height', value: item.liftHeightText } : null,
    item.configurationText ? { '@type': 'PropertyValue', name: 'Configuration', value: item.configurationText } : null,
    item.compatibleMachineCount > 0
      ? { '@type': 'PropertyValue', name: 'Documented compatible machines', value: String(item.compatibleMachineCount) }
      : null,
  ].filter(Boolean);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `${item.manufacturerName} ${item.modelName} ${typeLabel} compatibility`,
        description: `${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} compatibility, published specifications and source-backed machine fitment${equipmentTypes.length ? ` for ${equipmentTypes.join(', ')}` : ''}.`,
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${baseUrl}/#website`,
          url: baseUrl,
          name: 'Farm Machine Specs',
        },
        breadcrumb: {
          '@id': `${canonicalUrl}#breadcrumb`,
        },
        mainEntity: {
          '@id': productId,
        },
      },
      {
        '@type': 'Product',
        '@id': productId,
        url: canonicalUrl,
        name: `${item.manufacturerName} ${item.modelName}`,
        model: item.modelName,
        category: `${typeLabel} farm equipment attachment`,
        description: `${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} with source-backed compatibility and published configuration data.`,
        brand: {
          '@type': 'Brand',
          name: item.manufacturerName,
        },
        additionalProperty: productProperties,
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
      <section className="section" style={{ paddingTop: 18, paddingBottom: 0 }}>
        <div className="container">
          <figure className="machine-photo" style={{ maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            <img
              src={localImageUrl}
              alt={`${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} image pending`}
              loading="eager"
            />
            <figcaption>Exact attachment product photo is being sourced and will replace this local placeholder automatically.</figcaption>
          </figure>
        </div>
      </section>
      {children}
    </>
  );
}
