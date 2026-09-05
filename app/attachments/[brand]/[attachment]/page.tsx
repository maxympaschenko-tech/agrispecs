import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAttachment, type AttachmentCompatibleMachine } from '@/lib/attachments-service';
import { groupMachineEvidence, uniqueEvidenceValues } from '@/lib/attachment-evidence';

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

function machineHref(machine: AttachmentCompatibleMachine) {
  return machine.equipmentTypeSlug === 'tractor'
    ? `/tractors/${machine.brandSlug}/${machine.modelSlug}`
    : `/equipment/${machine.equipmentTypeSlug}/${machine.brandSlug}/${machine.modelSlug}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand, attachment: slug } = await params;
  const item = await getAttachment(brand, slug);
  if (!item) return {};

  const typeLabel = attachmentTypeLabel(item.attachmentType);
  const title = `${item.manufacturerName} ${item.modelName} ${typeLabel} Compatibility`;
  const description = `${item.manufacturerName} ${item.modelName} ${typeLabel.toLowerCase()} machine fitment, published specifications and source-backed configuration requirements.`;
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
  if (brand !== item.manufacturerSlug) redirect(`/attachments/${item.manufacturerSlug}/${item.slug}`);

  const typeLabel = attachmentTypeLabel(item.attachmentType);
  const isLoader = item.attachmentType === 'front-loader';
  const isBackhoe = item.attachmentType === 'backhoe';
  const machineEvidenceGroups = groupMachineEvidence(item.compatibleMachines);
  const documentedFitmentCount = item.compatibleMachineCount;
  const documentedFitmentRecordCount = item.compatibleMachines.length;
  const conditionalFitmentRecordCount = item.compatibleMachines.filter((machine) => hasConfigurationCondition(machine.compatibilityNote)).length;
  const performanceFitmentRecordCount = item.compatibleMachines.filter(
    (machine) => machine.performanceCapacityText || machine.performanceHeightText || machine.performanceConfigurationText,
  ).length;
  const firstCompatibleMachine = machineEvidenceGroups[0]?.records[0] || item.compatibleMachines[0];
  const tractorFitmentCount = new Set(
    item.compatibleMachines
      .filter((machine) => machine.equipmentTypeSlug === 'tractor')
      .map((machine) => machine.machineId),
  ).size;
  const equipmentTypes = Array.from(new Set(item.compatibleMachines.map((machine) => machine.equipmentType)));

  return (
    <main>
      <div className="container breadcrumbs">
        <Link href="/">Home</Link> / <Link href="/attachments">Attachments</Link> / {item.manufacturerName} {item.modelName}
      </div>

      <section className="section" style={{ paddingTop: 18 }}>
        <div className="container">
          <span className="eyebrow">{typeLabel} compatibility</span>
          <h1>{item.manufacturerName} {item.modelName} {typeLabel}</h1>
          <p className="section-lead">Source-backed machine fitment and published {typeLabel.toLowerCase()} information from cited manufacturer records. Some fitments apply only to specific machine, hydraulic, hitch or mounting configurations.</p>

          <div className="parts-stats">
            <div><strong>{documentedFitmentCount}</strong><span>documented compatible machine{documentedFitmentCount === 1 ? '' : 's'}</span></div>
            <div><strong>{conditionalFitmentRecordCount}</strong><span>fitment record{conditionalFitmentRecordCount === 1 ? '' : 's'} with configuration requirements</span></div>
            <div><strong>{performanceFitmentRecordCount}</strong><span>machine-specific performance record{performanceFitmentRecordCount === 1 ? '' : 's'}</span></div>
          </div>

          {documentedFitmentRecordCount > documentedFitmentCount && (
            <p className="section-note">Some compatible machines have multiple cited fitment records. Those records are grouped into one machine card below while retaining each distinct note, performance value and source.</p>
          )}

          {equipmentTypes.length > 0 && (
            <p className="section-note">Published fitment currently covers: {equipmentTypes.join(', ')}.</p>
          )}

          <div className="parts-tool-callout">
            <div>
              <strong>Planning this attachment for a machine?</strong>
              <span>Open the compatible machine record and the cited fitment source before relying on compatibility for ordering or installation.</span>
            </div>
            <div>
              <Link className="tool-link" href="/attachments">Browse attachments →</Link>
              {firstCompatibleMachine && firstCompatibleMachine.equipmentTypeSlug === 'tractor' && (
                <>
                  {' '}
                  <Link className="tool-link" href={`/compare?m1=${firstCompatibleMachine.machineId}`}>Compare compatible tractors →</Link>
                </>
              )}
            </div>
          </div>

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
            {performanceFitmentRecordCount > 0 && (
              <p className="section-note">Published performance can vary by machine, tire, hydraulic or mounting configuration. Machine-specific values are shown below when the cited source provides them.</p>
            )}
            {!item.liftCapacityText && !item.liftHeightText && !item.configurationText && (
              <p className="section-note">No attachment-level performance specification is published yet. Machine-specific fitment and performance values are shown below when supported by a source.</p>
            )}
          </section>

          <section className="data-section">
            <h2>Documented machine fitment</h2>
            <p className="section-note">A listed machine is not automatically compatible in every configuration. Multiple cited records for the same machine are grouped together; check every fitment note and source for hydraulic flow, hitch, carrier, axle, driveline, transmission or equipment requirements before ordering or installing the attachment.</p>
            {machineEvidenceGroups.map(({ machineId, records }) => {
              const machine = records[0];
              if (!machine) return null;
              const notes = uniqueEvidenceValues(records.map((record) => record.compatibilityNote));
              const capacities = uniqueEvidenceValues(records.map((record) => record.performanceCapacityText));
              const heights = uniqueEvidenceValues(records.map((record) => record.performanceHeightText));
              const configurations = uniqueEvidenceValues(records.map((record) => record.performanceConfigurationText));
              const conditional = notes.some((note) => hasConfigurationCondition(note));
              const evidenceSources = Array.from(
                new Map(
                  records
                    .filter((record) => record.sourceUrl)
                    .map((record) => [record.sourceUrl as string, {
                      url: record.sourceUrl as string,
                      title: record.sourceTitle || 'Manufacturer source',
                    }]),
                ).values(),
              );
              const href = machineHref(machine);
              return (
                <div className="part-fitment" key={machineId}>
                  <div>
                    <Link className="part-fitment-machine" href={href}>
                      {machine.brand} {machine.model}
                    </Link>
                    <p><strong>Equipment type:</strong> {machine.equipmentType}</p>
                    {records.length > 1 && <p><strong>Evidence records:</strong> {records.length} cited fitment records grouped for this machine.</p>}
                    {conditional && <p><strong>Conditional fitment:</strong> configuration requirements apply.</p>}
                    {capacities.map((value) => <p key={`capacity-${value}`}><strong>Performance:</strong> {value}</p>)}
                    {heights.map((value) => <p key={`height-${value}`}><strong>Working height:</strong> {value}</p>)}
                    {configurations.map((value) => <p key={`configuration-${value}`}><strong>Configuration:</strong> {value}</p>)}
                    {notes.map((note) => (
                      <p key={`note-${note}`}><strong>{hasConfigurationCondition(note) ? 'Requirement' : 'Fitment note'}:</strong> {note}</p>
                    ))}
                    {evidenceSources.map((source, index) => (
                      <p key={source.url}>
                        <strong>Fitment source{evidenceSources.length > 1 ? ` ${index + 1}` : ''}:</strong>{' '}
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.title}
                        </a>
                      </p>
                    ))}
                    <p>
                      <Link href={href}>View machine specs →</Link>{' '}
                      {machine.equipmentTypeSlug === 'tractor' && <Link href={`/compare?m1=${machine.machineId}`}>Compare this tractor →</Link>}
                    </p>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="notice">
            Attachment fitment is published only when a cited source supports the relationship. Missing machines are not automatically incompatible, and listed machines may still require a specific hydraulic, hitch, axle, transmission or mounting configuration. See our <Link href="/methodology">data methodology</Link> for publication rules.
          </div>

          {tractorFitmentCount > 0 && tractorFitmentCount < documentedFitmentCount && (
            <p className="section-note">This attachment has both tractor and non-tractor equipment fitment records; links above route each machine to the correct catalog section.</p>
          )}
        </div>
      </section>
    </main>
  );
}
