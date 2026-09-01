import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrands, getMachinesByBrand } from '@/lib/catalog-service';
import { getNonTractorEquipmentByBrand } from '@/lib/equipment-service';
import { getManifestMachinePrimaryImage } from '@/lib/machine-images-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ brand: string }> };

function tractorThumbnail(brandSlug: string, modelSlug: string, title: string) {
  const image = getManifestMachinePrimaryImage(brandSlug, modelSlug);
  if (!image) return null;
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
  const [brands, brandTractors, brandEquipment] = await Promise.all([
    getBrands(),
    getMachinesByBrand(brand),
    getNonTractorEquipmentByBrand(brand),
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
  const verifiedCount = publishedMachines.filter((machine) => machine.dataStatus === 'verified').length;
  const researchTractors = brandTractors.filter(
    (machine) => machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified',
  );
  const researchEquipment = brandEquipment.filter(
    (machine) => machine.dataStatus !== 'partial' && machine.dataStatus !== 'verified',
  );
  const equipmentTypeCount = new Set(publishedEquipment.map((machine) => machine.equipmentTypeSlug)).size;

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
              <strong>{verifiedCount.toLocaleString('en-US')}</strong>
              <span>Verified model records</span>
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
              <p>Search part numbers, replacement references and verified machine fitment records.</p>
              <span className="tool-link">Browse parts</span>
            </Link>
            <Link className="card" href="/attachments">
              <span className="eyebrow">Attachments</span>
              <h3>Browse compatible attachments</h3>
              <p>Find source-backed loader, backhoe and attachment fitment where available.</p>
              <span className="tool-link">View attachments</span>
            </Link>
          </div>

          {publishedTractors.length > 0 && (
            <section className="catalog-group">
              <h2>{info.name} tractors with published data</h2>
              <p className="section-note">These tractor pages contain source-backed technical, maintenance, parts or compatibility data.</p>
              <div className="grid">
                {publishedTractors.map((machine) => (
                  <Link className="card" key={machine.id} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    {tractorThumbnail(machine.brandSlug, machine.modelSlug, machine.title)}
                    <span className="eyebrow">{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed data'}</span>
                    <h3>{machine.title}</h3>
                    <p>Tractor specifications, maintenance, parts and compatibility reference.</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {publishedEquipment.length > 0 && (
            <section className="catalog-group">
              <h2>{info.name} farm equipment with published data</h2>
              <p className="section-note">Non-tractor machines stay in the equipment category used by the manufacturer and link to their dedicated catalog hierarchy.</p>
              <div className="grid">
                {publishedEquipment.map((machine) => (
                  <Link className="card" key={machine.id} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
                    <span className="eyebrow">{machine.equipmentType}</span>
                    <h3>{machine.title}</h3>
                    <p>{machine.dataStatus === 'verified' ? 'Verified' : 'Source-backed'} {machine.equipmentType.toLowerCase()} specifications and current market reference.</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(researchTractors.length > 0 || researchEquipment.length > 0) && (
            <section className="catalog-group">
              <h2>Models being researched</h2>
              <p className="section-note">These records are present in the catalog, but specifications are not treated as published until source verification reaches the publication threshold.</p>
              <div className="grid">
                {researchTractors.map((machine) => (
                  <Link className="card" key={`tractor-${machine.id}`} href={`/tractors/${machine.brandSlug}/${machine.modelSlug}`}>
                    {tractorThumbnail(machine.brandSlug, machine.modelSlug, machine.title)}
                    <span className="eyebrow">Research queue · Tractor</span>
                    <h3>{machine.title}</h3>
                    <p>Source verification in progress</p>
                  </Link>
                ))}
                {researchEquipment.map((machine) => (
                  <Link className="card" key={`equipment-${machine.id}`} href={`/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`}>
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

          {brandTractors.length === 0 && brandEquipment.length === 0 && <div className="notice">No model records are available for this manufacturer yet.</div>}
        </div>
      </section>
    </main>
  );
}
