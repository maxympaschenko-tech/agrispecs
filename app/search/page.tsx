import type { Metadata } from 'next';
import Link from 'next/link';
import { searchMachines } from '@/lib/catalog-service';
import { searchNonTractorEquipment } from '@/lib/equipment-service';
import { searchParts } from '@/lib/parts-service';
import { searchAttachments } from '@/lib/attachments-service';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';
import { getPartImages } from '@/lib/part-images-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
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

function cardImage(imageUrl: string, alt: string) {
  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      style={{
        display: 'block',
        width: '100%',
        aspectRatio: '4 / 3',
        objectFit: 'contain',
        borderRadius: 12,
        marginBottom: 14,
      }}
    />
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const term = q.trim();
  const [machines, equipment, parts, attachments] = term
    ? await Promise.all([
        searchMachines(term),
        searchNonTractorEquipment(term),
        searchParts(term),
        searchAttachments(term),
      ])
    : [[], [], [], []];
  const publishableMachines = machines.filter((machine) => machine.dataStatus === 'verified' || machine.dataStatus === 'partial');
  const publishableEquipment = equipment.filter((machine) => machine.dataStatus === 'verified' || machine.dataStatus === 'partial');
  const verifiedParts = parts.filter((part) => part.dataStatus === 'verified' || part.dataStatus === 'partial');
  const totalResults = publishableMachines.length + publishableEquipment.length + verifiedParts.length + attachments.length;
  const resultGroupCount = [
    publishableMachines.length,
    publishableEquipment.length,
    attachments.length,
    verifiedParts.length,
  ].filter((count) => count > 0).length;

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Catalog search</span>
        <h1>{term ? `Search results for “${term}”` : 'Search the farm equipment catalog'}</h1>
        <p className="section-lead">
          Search tractors, farm equipment, attachments and OEM part numbers. Model and part codes can be entered with or without spaces, hyphens, slashes or dots.
        </p>
        <form className="search-shell" action="/search">
          <input name="q" defaultValue={q} aria-label="Search equipment, attachment or part number" placeholder="Try: S7 600, Kubota SCL1000, 120R or RE-519626" />
          <button type="submit">Search</button>
        </form>

        <div style={{ marginTop: 28 }}>
          {!term && (
            <div className="notice">
              <strong>Search examples:</strong> manufacturer + model, model number only, equipment type, attachment model or OEM part number. Exact model and part-number matches are ranked first.
            </div>
          )}

          {term && totalResults > 0 && (
            <div className="notice">
              <strong>{totalResults.toLocaleString('en-US')} source-backed result{totalResults === 1 ? '' : 's'}</strong>
              {' '}across {resultGroupCount} catalog section{resultGroupCount === 1 ? '' : 's'}.
            </div>
          )}

          {term && totalResults === 0 && (
            <div className="notice">
              <strong>No matching source-backed records yet.</strong>{' '}
              Try a shorter model number, the manufacturer name, an equipment type or the OEM part number without extra words.
            </div>
          )}

          {publishableMachines.length > 0 && (
            <section className="search-group">
              <h2>Tractors <small>({publishableMachines.length})</small></h2>
              <div className="grid">
                {publishableMachines.map((machine) => {
                  const image = getManifestMachinePrimaryImage(machine.brandSlug, machine.modelSlug);
                  return (
                    <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                      {cardImage(image.imageUrl, image.altText || machine.title)}
                      <span className="eyebrow">Tractor{image.imageKind === 'fallback' ? ' · Photo pending' : ''}</span>
                      <h3>{machine.title}</h3>
                      <p>Specifications, maintenance and compatible parts</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {publishableEquipment.length > 0 && (
            <section className="search-group">
              <h2>Farm equipment <small>({publishableEquipment.length})</small></h2>
              <div className="grid">
                {publishableEquipment.map((machine) => {
                  const image = getManifestMachinePrimaryImage(machine.brandSlug, machine.modelSlug, machine.equipmentTypeSlug);
                  return (
                    <Link className="card" key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                      {cardImage(image.imageUrl, image.altText || machine.title)}
                      <span className="eyebrow">{machine.equipmentType}{image.imageKind === 'fallback' ? ' · Photo pending' : ''}</span>
                      <h3>{machine.title}</h3>
                      <p>Source-backed specifications and current market configuration</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {attachments.length > 0 && (
            <section className="search-group">
              <h2>Attachments <small>({attachments.length})</small></h2>
              <div className="grid">
                {attachments.map((attachment) => (
                  <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                    <img src="/media/fallbacks/attachment.svg" alt={`${attachment.manufacturerName} ${attachment.modelName} attachment image pending`} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', borderRadius: 12, marginBottom: 14 }} />
                    <span className="eyebrow">{attachmentTypeLabel(attachment.attachmentType)} · Photo pending</span>
                    <h3>{attachment.manufacturerName} {attachment.modelName}</h3>
                    <p>{attachment.compatibleMachineCount} verified machine fitment record{attachment.compatibleMachineCount === 1 ? '' : 's'}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {verifiedParts.length > 0 && (
            <section className="search-group">
              <h2>Parts <small>({verifiedParts.length})</small></h2>
              <div className="grid">
                {verifiedParts.map((part) => {
                  const image = getPartImages(part.normalizedPartNumber, part.manufacturerSlug, part.categorySlug)[0];
                  return (
                    <Link className="card" key={part.id} href={`/parts/${part.normalizedPartNumber.toLowerCase()}`}>
                      {cardImage(image.imageUrl, image.altText || `${part.partNumber} ${part.name || 'part'}`)}
                      <span className="eyebrow">
                        {part.categoryName || 'Part'}
                        {image.imageKind === 'representative' ? ' · Representative image' : ''}
                        {image.imageKind === 'fallback' ? ' · Photo pending' : ''}
                      </span>
                      <h3>{part.partNumber}</h3>
                      <p>{part.name || 'OEM part'}{part.manufacturerName ? ` · ${part.manufacturerName}` : ''}{part.fitmentCount > 0 ? ` · ${part.fitmentCount} verified fitment${part.fitmentCount === 1 ? '' : 's'}` : ''}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
