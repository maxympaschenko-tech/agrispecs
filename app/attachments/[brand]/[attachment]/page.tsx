import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttachment } from '@/lib/attachments-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ brand: string; attachment: string }>;
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

function specificationHeading(type: string) {
  if (type === 'front-loader') return 'Loader specifications';
  if (type === 'backhoe') return 'Backhoe specifications';
  return 'Attachment specifications';
}

function hasConfigurationCondition(note: string | null) {
  if (!note) return false;
  return /\b(requires?|required|restricted|only|depending|must|except|2wd|mfwd|specific (?:axle|configuration|transmission))\b/i.test(note);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, attachment: slug } = await params;
  const item = await getAttachment(brand, slug);
  if (!item) return {};

  const typeLabel = attachmentTypeLabel(item.attachmentType);
  const title = `${item.manufacturerName} ${item.modelName} ${typeLabel} Compatibility`;
  const description = `${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} tractor fitment, published specifications and source-backed configuration requirements.`;
  return {
    title,
    description,
    alternates: { canonical: `/attachments/${item.manufacturerSlug}/${item.slug}` },
    robots: item.compatibleMachineCount > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function AttachmentPage({ params }: PageProps) {
  const { brand, attachment: slug } = await params;
  const item = await getAttachment(brand, slug);
  if (!item) notFound();

  const typeLabel = attachmentTypeLabel(item.attachmentType);
  const isLoader = item.attachmentType === 'front-loader';
  const isBackhoe = item.attachmentType === 'backhoe';

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/attachments">Attachments</Link> / {item.manufacturerName} {item.modelName}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">{typeLabel} compatibility</span>
          <h1>{item.manufacturerName} {item.modelName}</h1>
          <p className="section-lead">Verified tractor fitment and published {typeLabel.toLowerCase()} information from the cited source. Some fitments apply only to specific tractor configurations.</p>

          <section className="data-section">
            <h2>{specificationHeading(item.attachmentType)}</h2>
            {item.liftCapacityText && <div className="placeholder-row"><span>{isLoader ? 'Lift capacity' : 'Capacity'}</span><span>{item.liftCapacityText}</span></div>}
            {item.liftHeightText && <div className="placeholder-row"><span>{isLoader ? 'Lift height' : 'Working height'}</span><span>{item.liftHeightText}</span></div>}
            {item.configurationText && (
              <div className="placeholder-row">
                <span>{isLoader ? 'Loader configuration' : isBackhoe ? 'Backhoe dimensions & configuration' : 'Configuration'}</span>
                <span>{item.configurationText}</span>
              </div>
            )}
            {item.compatibleMachines.some((machine) => machine.performanceCapacityText || machine.performanceHeightText || machine.performanceConfigurationText) && (
              <p className="section-note">Published performance can vary by tractor, tire, hydraulic or mounting configuration. Tractor-specific values are shown below when the cited source provides them.</p>
            )}
          </section>

          <section className="data-section">
            <h2>Verified tractor fitment</h2>
            <p className="section-note">A listed tractor is not automatically compatible in every configuration. Check each fitment note for axle, driveline, transmission or equipment requirements before ordering or installing the attachment.</p>
            {item.compatibleMachines.map((machine) => {
              const conditional = hasConfigurationCondition(machine.compatibilityNote);
              return (
                <div className="part-fitment" key={machine.machineId}>
                  <div>
                    <Link className="part-fitment-machine" href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                      {machine.brand} {machine.model}
                    </Link>
                    {conditional && <p><strong>Conditional fitment:</strong> configuration requirements apply.</p>}
                    {machine.performanceCapacityText && <p><strong>Performance:</strong> {machine.performanceCapacityText}</p>}
                    {machine.performanceHeightText && <p><strong>Working height:</strong> {machine.performanceHeightText}</p>}
                    {machine.performanceConfigurationText && <p><strong>Configuration:</strong> {machine.performanceConfigurationText}</p>}
                    {machine.compatibilityNote && <p><strong>{conditional ? 'Requirement' : 'Fitment note'}:</strong> {machine.compatibilityNote}</p>}
                  </div>
                </div>
              );
            })}
          </section>

          {item.sourceUrl && (
            <section className="data-section">
              <h2>Source</h2>
              <div className="placeholder-row">
                <span>Compatibility source</span>
                <span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceTitle || `${item.manufacturerName} ${typeLabel.toLowerCase()} compatibility source`}</a></span>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
