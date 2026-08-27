import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPart } from '@/lib/parts-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ part: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) return {};

  const publishable = part.dataStatus === 'verified' || part.dataStatus === 'partial';
  const title = `${part.manufacturerName || 'OEM'} ${part.partNumber} ${part.name || 'Part'} Fitment`;
  const description = `${part.partNumber} ${part.name || 'OEM part'} reference with verified compatible farm equipment, fitment notes and technical sources.`;

  return {
    title,
    description,
    alternates: { canonical: `/parts/${part.normalizedPartNumber.toLowerCase()}` },
    robots: publishable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PartPage({ params }: PageProps) {
  const { part: slug } = await params;
  const part = await getPart(slug);
  if (!part) notFound();

  const sources = Array.from(
    new Map(
      part.fitments
        .filter((fitment) => fitment.sourceUrl)
        .map((fitment) => [fitment.sourceUrl, {
          url: fitment.sourceUrl as string,
          title: fitment.sourceTitle || 'Technical source',
          publishedDate: fitment.sourcePublishedDate,
        }]),
    ).values(),
  );

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/parts">Parts</Link> / {part.partNumber}
      </div>

      <div className="container">
        <section className="machine-header">
          <span className="eyebrow">{part.categoryName || 'OEM part'}</span>
          <h1>{part.partNumber}</h1>
          <p>{part.manufacturerName ? `${part.manufacturerName} ` : ''}{part.name || 'Farm equipment part'}</p>
          <div className="notice">
            Fitment below is shown only where a source record is attached. Always confirm serial number and machine configuration before ordering.
          </div>
        </section>

        <div className="spec-layout">
          <aside className="toc">
            <strong>On this page</strong>
            <a href="#part-details">Part details</a>
            <a href="#fitment">Compatible equipment</a>
            {sources.length > 0 && <a href="#sources">Sources</a>}
          </aside>

          <div>
            <section className="data-section" id="part-details">
              <h2>Part details</h2>
              <div className="placeholder-row"><span>Part number</span><span>{part.partNumber}</span></div>
              {part.manufacturerName && <div className="placeholder-row"><span>Manufacturer</span><span>{part.manufacturerName}</span></div>}
              {part.name && <div className="placeholder-row"><span>Description</span><span>{part.name}</span></div>}
              {part.categoryName && <div className="placeholder-row"><span>Category</span><span>{part.categoryName}</span></div>}
              <div className="placeholder-row"><span>Verified fitments</span><span>{part.fitmentCount}</span></div>
            </section>

            <section className="data-section" id="fitment">
              <h2>Compatible equipment</h2>
              {part.fitments.length > 0 ? part.fitments.map((fitment, index) => (
                <div className="part-fitment" key={`${fitment.machineId}-${index}`}>
                  <div>
                    <Link className="part-fitment-machine" href={`/tractors/${fitment.brandSlug}/${fitment.modelSlug}`}>
                      {fitment.brand} {fitment.model}
                    </Link>
                    {fitment.fitmentNote && <p>{fitment.fitmentNote}</p>}
                  </div>
                  {fitment.quantity !== null && <span>Qty: {fitment.quantity}</span>}
                </div>
              )) : (
                <p>No verified equipment fitment has been published yet.</p>
              )}
            </section>

            {sources.length > 0 && (
              <section className="data-section" id="sources">
                <h2>Sources</h2>
                {sources.map((source) => (
                  <div className="placeholder-row" key={source.url}>
                    <span>{source.publishedDate || 'Official source'}</span>
                    <span><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
