import type { ReactNode } from 'react';
import { getEquipmentMachine } from '@/lib/equipment-service';
import { getMachineImages } from '@/lib/machine-images-service';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ type: string; brand: string; model: string }>;
};

function needsVisibleAttribution(licenseName: string | null) {
  if (!licenseName) return false;
  return /\bCC\s+BY\b|\bCC\s+BY-SA\b|Creative Commons Attribution/i.test(licenseName);
}

export default async function EquipmentModelLayout({ children, params }: LayoutProps) {
  const { type, brand, model } = await params;
  const machine = await getEquipmentMachine(type, brand, model);
  if (!machine) return children;

  const images = await getMachineImages(machine.id);
  const primaryImage = images.find((image) => image.isPrimary) || images[0];
  if (!primaryImage) return children;

  const showAttribution = needsVisibleAttribution(primaryImage.licenseName);

  return (
    <>
      <section className="section" style={{ paddingTop: 18, paddingBottom: 0 }}>
        <div className="container">
          <figure className="machine-photo" style={{ maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
            <img
              src={primaryImage.imageUrl}
              alt={primaryImage.altText || machine.title}
              loading="eager"
            />
            {(primaryImage.imageKind !== 'exact' || primaryImage.caption || showAttribution) && (
              <figcaption>
                {primaryImage.imageKind === 'fallback' && <strong>Exact model photo pending. </strong>}
                {primaryImage.imageKind === 'family' && <strong>Family image. </strong>}
                {primaryImage.imageKind === 'representative' && <strong>Representative image. </strong>}
                {primaryImage.caption && <span>{primaryImage.caption} </span>}
                {showAttribution && primaryImage.sourcePageUrl && (
                  <>
                    Photo:{' '}
                    <a href={primaryImage.sourcePageUrl} target="_blank" rel="noopener noreferrer">
                      {primaryImage.author || 'source'}
                    </a>
                    {primaryImage.licenseName && (
                      <>
                        {' '}·{' '}
                        {primaryImage.licenseUrl ? (
                          <a href={primaryImage.licenseUrl} target="_blank" rel="noopener noreferrer">{primaryImage.licenseName}</a>
                        ) : primaryImage.licenseName}
                      </>
                    )}
                  </>
                )}
              </figcaption>
            )}
          </figure>
        </div>
      </section>
      {children}
    </>
  );
}
