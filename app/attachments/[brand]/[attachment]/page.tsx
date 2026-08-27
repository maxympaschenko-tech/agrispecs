import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttachment } from '@/lib/attachments-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ brand: string; attachment: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, attachment: slug } = await params;
  const item = await getAttachment(brand, slug);
  if (!item) return {};

  const title = `${item.manufacturerName} ${item.modelName} Loader Compatibility`;
  const description = `${item.manufacturerName} ${item.modelName} compatible tractors, lift capacity, lift height and source-backed configuration requirements.`;
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

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/attachments">Attachments</Link> / {item.manufacturerName} {item.modelName}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Front loader compatibility</span>
          <h1>{item.manufacturerName} {item.modelName}</h1>
          <p className="section-lead">Verified tractor compatibility and published loader specifications from the cited manufacturer source.</p>

          <section className="data-section">
            <h2>Loader specifications</h2>
            {item.liftCapacityText && <div className="placeholder-row"><span>Lift capacity</span><span>{item.liftCapacityText}</span></div>}
            {item.liftHeightText && <div className="placeholder-row"><span>Lift height</span><span>{item.liftHeightText}</span></div>}
            {item.configurationText && <div className="placeholder-row"><span>Leveling options</span><span>{item.configurationText}</span></div>}
          </section>

          <section className="data-section">
            <h2>Compatible tractors</h2>
            <p className="section-note">Configuration notes matter. A loader listed for one axle or leveling configuration should not be assumed compatible with every version of the same tractor model.</p>
            {item.compatibleMachines.map((machine) => (
              <div className="part-fitment" key={machine.machineId}>
                <div>
                  <Link className="part-fitment-machine" href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    {machine.brand} {machine.model}
                  </Link>
                  {machine.compatibilityNote && <p>{machine.compatibilityNote}</p>}
                </div>
              </div>
            ))}
          </section>

          {item.sourceUrl && (
            <section className="data-section">
              <h2>Source</h2>
              <div className="placeholder-row">
                <span>Official source</span>
                <span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceTitle || 'John Deere loader compatibility'}</a></span>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
