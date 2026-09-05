import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';
import { getNonTractorEquipmentByBrand } from '@/lib/equipment-service';
import { getAttachmentCatalog } from '@/lib/attachments-service';
import { getMachineDisplayModel, getMachineDisplayTitle, getMachineGenerationLabel } from '@/lib/machine-display';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';
import styles from './brand-page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TRACTOR_CARD_LIMIT = 12;
const EQUIPMENT_CARD_LIMIT = 6;
const ATTACHMENT_CARD_LIMIT = 6;

type PageProps = { params: Promise<{ brand: string }> };

function machineThumbnail(
  brandSlug: string,
  modelSlug: string,
  title: string,
  equipmentTypeSlug = 'tractor',
) {
  const image = getManifestMachinePrimaryImage(brandSlug, modelSlug, equipmentTypeSlug);
  return (
    <img
      src={image.imageUrl}
      alt={image.altText || title}
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

function attachmentTypeLabel(type: string) {
  if (type === 'front-loader') return 'Front loader';
  if (type === 'backhoe') return 'Backhoe';
  return type
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Attachment';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand } = await params;
  const [brands, tractors, equipment] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
    getNonTractorEquipmentByBrand(brand),
  ]);
  const tractorBrand = brands.find((item) => item.slug === brand);
  const equipmentBrand = equipment[0] ? { slug: equipment[0].brandSlug, name: equipment[0].brand } : undefined;
  const info = tractorBrand || equipmentBrand;
  if (!info) return {};

  const publishableCount = [...tractors, ...equipment].filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  ).length;

  return {
    title: `${info.name} Farm Equipment Specs and Models`,
    description: `Browse ${info.name} tractor and farm equipment specifications, model references, maintenance, OEM parts, attachments and compatibility data where available.`,
    alternates: { canonical: `/brands/${info.slug}` },
    robots: publishableCount > 0 ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { brand } = await params;
  const [brands, brandTractors, brandEquipment, attachmentCatalog] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
    getNonTractorEquipmentByBrand(brand),
    getAttachmentCatalog(),
  ]);
  const tractorBrand = brands.find((item) => item.slug === brand);
  const equipmentBrand = brandEquipment[0] ? { slug: brandEquipment[0].brandSlug, name: brandEquipment[0].brand } : undefined;
  const info = tractorBrand || equipmentBrand;
  if (!info) notFound();

  const publishedTractors = brandTractors.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishedEquipment = brandEquipment.filter(
    (machine) => machine.dataStatus === 'partial' || machine.dataStatus === 'verified',
  );
  const publishedMachines = [...publishedTractors, ...publishedEquipment];
  const researchTractors = brandTractors.filter((machine) => machine.dataStatus === 'review');
  const researchEquipment = brandEquipment.filter((machine) => machine.dataStatus === 'review');
  const equipmentTypeCount = new Set(publishedEquipment.map((machine) => machine.equipmentTypeSlug)).size;
  const brandAttachments = attachmentCatalog.filter(
    (attachment) => attachment.manufacturerSlug === info.slug,
  );

  const displayTractors = [...publishedTractors].sort((a, b) => {
    const aArchive = getMachineGenerationLabel(a.modelSlug) ? 1 : 0;
    const bArchive = getMachineGenerationLabel(b.modelSlug) ? 1 : 0;
    return aArchive - bArchive || a.model.localeCompare(b.model);
  });
  const featuredTractors = displayTractors.slice(0, TRACTOR_CARD_LIMIT);
  const compactTractors = displayTractors.slice(TRACTOR_CARD_LIMIT);

  const equipmentGroups = Array.from(
    publishedEquipment.reduce<Map<string, typeof publishedEquipment>>((groups, machine) => {
      const existing = groups.get(machine.equipmentTypeSlug) ?? [];
      existing.push(machine);
      groups.set(machine.equipmentTypeSlug, existing);
      return groups;
    }, new Map()),
  );
  const attachmentGroups = Array.from(
    brandAttachments.reduce<Map<string, typeof brandAttachments>>((groups, attachment) => {
      const existing = groups.get(attachment.attachmentType) ?? [];
      existing.push(attachment);
      groups.set(attachment.attachmentType, existing);
      return groups;
    }, new Map()),
  ).sort(([a], [b]) => attachmentTypeLabel(a).localeCompare(attachmentTypeLabel(b)));

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/brands">Brands</Link> / {info.name}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">Manufacturer</span>
          <h1>{info.name} farm equipment specs and model reference</h1>
          <p className="section-lead">
            Source-backed tractor and agricultural equipment specifications, maintenance references, OEM parts, attachments and compatibility data for {info.name} machines where available.
          </p>

          <div className="parts-stats">
            <div>
              <strong>{publishedMachines.length.toLocaleString('en-US')}</strong>
              <span>Models with published data</span>
            </div>
            <div>
              <strong>{publishedTractors.length.toLocaleString('en-US')}</strong>
              <span>Published tractor models</span>
            </div>
            <div>
              <strong>{(publishedTractors.length > 0 ? 1 : 0) + equipmentTypeCount}</strong>
              <span>Equipment types represented</span>
            </div>
          </div>

          <div className="grid">
            {publishedTractors.length > 0 ? (
              <Link className="card" href="/compare">
                <span className="eyebrow">Comparison</span>
                <h3>Compare {info.name} tractors</h3>
                <p>Put published normalized tractor specifications side by side with models from other brands.</p>
                <span className="tool-link">Open Compare</span>
              </Link>
            ) : (
              <Link className="card" href="/equipment">
                <span className="eyebrow">Equipment catalog</span>
                <h3>Browse farm equipment</h3>
                <p>Explore source-backed agricultural equipment by machine type, manufacturer and model.</p>
                <span className="tool-link">Open equipment catalog</span>
              </Link>
            )}
            <Link className="card" href="/parts">
              <span className="eyebrow">Parts reference</span>
              <h3>Search OEM parts</h3>
              <p>Search part numbers, replacement references and documented machine fitment records.</p>
              <span className="tool-link">Browse parts</span>
            </Link>
            <Link className="card" href={brandAttachments.length > 0 ? '#brand-attachments' : '/attachments'}>
              <span className="eyebrow">Attachments</span>
              <h3>{brandAttachments.length > 0 ? `${info.name} attachments` : 'Browse compatible attachments'}</h3>
              <p>{brandAttachments.length > 0
                ? `${brandAttachments.length.toLocaleString('en-US')} published attachment model${brandAttachments.length === 1 ? '' : 's'} with documented machine fitment.`
                : 'Find source-backed loader, backhoe and attachment fitment where available.'}</p>
              <span className="tool-link">{brandAttachments.length > 0 ? 'View brand attachments' : 'View attachments'}</span>
            </Link>
          </div>

          {publishedTractors.length > 0 && (
            <section className="catalog-group">
              <h2>{info.name} tractors with published data</h2>
              <p className="section-note">
                Featured models use image cards below. Every additional published tractor remains directly linked in the compact model directory, with archived generations labeled separately when a model name was reused.
              </p>
              <div className="grid">
                {featuredTractors.map((machine) => {
                  const generationLabel = getMachineGenerationLabel(machine.modelSlug);
                  const displayTitle = getMachineDisplayTitle(machine);
                  return (
                    <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                      {machineThumbnail(machine.brandSlug, machine.modelSlug, displayTitle)}
                      <span className="eyebrow">{generationLabel || (machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data')}</span>
                      <h3>{displayTitle}</h3>
                      <p>{generationLabel ? 'Archived tractor generation with its own source-backed specifications and fitment context.' : 'Tractor specifications, maintenance, parts and compatibility reference.'}</p>
                    </Link>
                  );
                })}
              </div>

              {compactTractors.length > 0 && (
                <>
                  <h3 className={styles.directoryTitle}>More {info.name} tractor models</h3>
                  <div className={styles.modelDirectory}>
                    {compactTractors.map((machine) => {
                      const generationLabel = getMachineGenerationLabel(machine.modelSlug);
                      return (
                        <Link className={styles.modelLink} key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                          <span>{getMachineDisplayModel(machine)}</span>
                          <small>{generationLabel || (machine.dataStatus === 'verified' ? 'Verified' : 'Specs')}</small>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {equipmentGroups.length > 0 && (
            <section className="catalog-group">
              <h2>{info.name} farm equipment with published data</h2>
              <p className="section-note">
                Non-tractor machines stay in the manufacturer equipment category. Large categories use a small set of image cards followed by a complete compact model directory.
              </p>

              {equipmentGroups.map(([equipmentTypeSlug, machines]) => {
                const equipmentType = machines[0]?.equipmentType || 'Farm equipment';
                const featured = machines.slice(0, EQUIPMENT_CARD_LIMIT);
                const compact = machines.slice(EQUIPMENT_CARD_LIMIT);
                return (
                  <div className={styles.equipmentGroup} key={equipmentTypeSlug}>
                    <div className={styles.equipmentGroupHeader}>
                      <h3>{equipmentType}</h3>
                      <span>{machines.length.toLocaleString('en-US')} published model{machines.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="grid">
                      {featured.map((machine) => (
                        <Link className="card" key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                          {machineThumbnail(machine.brandSlug, machine.modelSlug, machine.title, machine.equipmentTypeSlug)}
                          <span className="eyebrow">{machine.equipmentType}</span>
                          <h3>{machine.title}</h3>
                          <p>{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed'} {machine.equipmentType.toLowerCase()} specifications and published market reference.</p>
                        </Link>
                      ))}
                    </div>

                    {compact.length > 0 && (
                      <div className={styles.modelDirectory} style={{ marginTop: 10 }}>
                        {compact.map((machine) => (
                          <Link className={styles.modelLink} key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                            <span>{machine.model}</span>
                            <small>{machine.dataStatus === 'verified' ? 'Verified' : 'Specs'}</small>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {attachmentGroups.length > 0 && (
            <section className="catalog-group" id="brand-attachments">
              <h2>{info.name} attachments with documented fitment</h2>
              <p className="section-note">
                Published attachment models below have at least one cited compatible-machine relationship. Open an attachment type hub to browse across brands, or open a model for its full source-backed fitment list.
              </p>

              {attachmentGroups.map(([attachmentType, attachments]) => {
                const label = attachmentTypeLabel(attachmentType);
                const featured = attachments.slice(0, ATTACHMENT_CARD_LIMIT);
                const compact = attachments.slice(ATTACHMENT_CARD_LIMIT);
                const fitmentCount = attachments.reduce((total, attachment) => total + attachment.compatibleMachineCount, 0);
                return (
                  <div className={styles.equipmentGroup} key={attachmentType}>
                    <div className={styles.equipmentGroupHeader}>
                      <h3><Link href={`/attachments/type/${attachmentType}`}>{label}</Link></h3>
                      <span>{attachments.length.toLocaleString('en-US')} attachment{attachments.length === 1 ? '' : 's'} · {fitmentCount.toLocaleString('en-US')} fitment{fitmentCount === 1 ? '' : 's'}</span>
                    </div>
                    <div className="grid">
                      {featured.map((attachment) => (
                        <Link className="card" key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                          <span className="eyebrow">{label} · Source-backed fitment</span>
                          <h3>{attachment.manufacturerName} {attachment.modelName}</h3>
                          <p>{attachment.compatibleMachineCount.toLocaleString('en-US')} documented compatible machine{attachment.compatibleMachineCount === 1 ? '' : 's'}.</p>
                          <span className="tool-link">View attachment fitment →</span>
                        </Link>
                      ))}
                    </div>

                    {compact.length > 0 && (
                      <div className={styles.modelDirectory} style={{ marginTop: 10 }}>
                        {compact.map((attachment) => (
                          <Link className={styles.modelLink} key={attachment.id} href={`/attachments/${attachment.manufacturerSlug}/${attachment.slug}`}>
                            <span>{attachment.modelName}</span>
                            <small>{attachment.compatibleMachineCount} fitment{attachment.compatibleMachineCount === 1 ? '' : 's'}</small>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <p><Link className="tool-link" href="/attachments">Browse the complete attachment compatibility catalog →</Link></p>
            </section>
          )}

          {(researchTractors.length > 0 || researchEquipment.length > 0) && (
            <section className="catalog-group">
              <h2>Models being researched</h2>
              <p className="section-note">Only models placed in editorial review are exposed here. Internal seed placeholders stay out of public navigation until source verification begins.</p>
              <div className="grid">
                {researchTractors.map((machine) => (
                  <Link className="card" key={`tractor-${machine.id}`} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    {machineThumbnail(machine.brandSlug, machine.modelSlug, getMachineDisplayTitle(machine))}
                    <span className="eyebrow">Research queue · Tractor</span>
                    <h3>{getMachineDisplayTitle(machine)}</h3>
                    <p>Source verification in progress</p>
                  </Link>
                ))}
                {researchEquipment.map((machine) => (
                  <Link className="card" key={`equipment-${machine.id}`} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                    {machineThumbnail(machine.brandSlug, machine.modelSlug, machine.title, machine.equipmentTypeSlug)}
                    <span className="eyebrow">Research queue · {machine.equipmentType}</span>
                    <h3>{machine.title}</h3>
                    <p>Source verification in progress</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="catalog-group">
            <h2>How {info.name} data is verified</h2>
            <p className="section-note">
              Published values are tied to manufacturer-first source records whenever possible. Missing specifications remain unpublished rather than being inferred from neighboring models.
            </p>
            <Link className="tool-link" href="/methodology">Read our data methodology</Link>
          </section>

          {publishedMachines.length === 0 && researchTractors.length === 0 && researchEquipment.length === 0 && (
            <div className="notice">No published or editorial-review model records are available for this manufacturer yet.</div>
          )}
        </div>
      </section>
    </main>
  );
}
