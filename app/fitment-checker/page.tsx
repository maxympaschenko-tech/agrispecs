import type { Metadata } from 'next';
import Link from 'next/link';
import { checkPartFitment } from '@/lib/fitment-checker-service';
import { getPublishedPartNumberMatches } from '@/lib/part-identity-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ part?: string; model?: string; serial?: string; manufacturer?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasQueryState = Boolean(params.part || params.model || params.serial || params.manufacturer);

  return {
    title: 'Farm Equipment Part Fitment and Serial Number Checker',
    description: 'Check source-backed farm equipment part fitment by part number, machine model and documented serial-number range.',
    alternates: { canonical: '/fitment-checker' },
    robots: hasQueryState ? { index: false, follow: true } : { index: true, follow: true },
  };
}

function resultHeading(status: string) {
  if (status === 'fits') return 'Fits documented serial range';
  if (status === 'outside-range') return 'Outside documented serial range';
  if (status === 'serial-unverified') return 'Model fitment found, serial unverified';
  if (status === 'fitment-known') return 'Documented model fitment found';
  if (status === 'no-fitment') return 'No documented direct fitment found';
  if (status === 'part-ambiguous') return 'Choose the part manufacturer';
  return 'Unable to verify';
}

function resultGuidance(status: string) {
  if (status === 'fits') return 'The stored source-backed rule covers this exact part record, model and serial number entered.';
  if (status === 'outside-range') return 'The entered serial number falls outside the documented range stored for this exact part/model relationship. Check for a replacement part, another machine generation or a configuration-specific rule before ordering.';
  if (status === 'serial-unverified') return 'The model relationship is documented, but the stored source does not provide a structured serial-number rule that can be tested automatically.';
  if (status === 'fitment-known') return 'The model relationship is documented. Add a serial number when available; some applications depend on serial break, market or configuration.';
  if (status === 'no-fitment') return 'No direct source-backed relationship is stored for this exact manufacturer-specific part/model query. That is not proof of incompatibility.';
  if (status === 'part-ambiguous') return 'Part numbers can be reused by different manufacturers. Select the OEM or supplier record so the checker never mixes fitment data from another manufacturer.';
  return 'The current catalog does not contain enough source-backed information to make a fitment assertion.';
}

function confidenceLabel(confidence?: 'official' | 'high' | 'medium' | 'low') {
  if (confidence === 'official') return 'Official direct fitment';
  if (confidence === 'high') return 'High-confidence reference';
  if (confidence === 'medium') return 'Medium-confidence reference';
  if (confidence === 'low') return 'Low-confidence reference';
  return null;
}

function machineHref(result: Awaited<ReturnType<typeof checkPartFitment>>) {
  if (!result.brandSlug || !result.modelSlug || !result.equipmentTypeSlug) return null;
  return result.equipmentTypeSlug === 'tractor'
    ? `/tractors/${result.brandSlug}/${result.modelSlug}`
    : `/equipment/${result.equipmentTypeSlug}/${result.brandSlug}/${result.modelSlug}`;
}

function normalizedPartPathSegment(partNumber: string) {
  return partNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function partReferenceHref(
  result: Awaited<ReturnType<typeof checkPartFitment>>,
  publishedMatchCount: number,
) {
  if (!result.partNumber) return null;
  const number = normalizedPartPathSegment(result.partNumber);
  if (publishedMatchCount > 1 && result.partManufacturerSlug) {
    return `/parts/${result.partManufacturerSlug}/${number}`;
  }
  return `/parts/${number}`;
}

function manufacturerCheckHref(
  part: string,
  model: string,
  serial: string,
  manufacturerSlug: string,
) {
  const query = new URLSearchParams({ part, model, manufacturer: manufacturerSlug });
  if (serial) query.set('serial', serial);
  return `/fitment-checker?${query.toString()}`;
}

export default async function FitmentCheckerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const part = (params.part || '').trim();
  const model = (params.model || '').trim();
  const serial = (params.serial || '').trim();
  const requestedManufacturer = (params.manufacturer || '').trim().toLowerCase();
  const partMatches = part ? await getPublishedPartNumberMatches(part) : [];
  const selectedManufacturer = partMatches.length > 1
    && partMatches.some((match) => match.manufacturerSlug === requestedManufacturer)
    ? requestedManufacturer
    : '';
  const submitted = Boolean(part || model || serial || requestedManufacturer);
  const result = part && model
    ? await checkPartFitment(part, model, serial, selectedManufacturer || undefined)
    : null;
  const resultMachineHref = result ? machineHref(result) : null;
  const resultConfidence = result ? confidenceLabel(result.fitmentConfidence) : null;
  const resultPartHref = result ? partReferenceHref(result, partMatches.length) : null;
  const checkerFormClass = partMatches.length > 1 ? 'checker-form checker-form--manufacturer' : 'checker-form';

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Compatibility tool</span>
        <h1>Part fitment and serial number checker</h1>
        <p className="section-lead">Check a part number against a published farm machine model and, when the cited manufacturer or technical source publishes a structured serial range, test the entered serial number against that documented rule.</p>

        <form className={checkerFormClass} action="/fitment-checker">
          <label>
            <span>Part number</span>
            <input name="part" defaultValue={part} placeholder="e.g. RE519626" required />
          </label>
          {partMatches.length > 1 && (
            <label>
              <span>Part manufacturer</span>
              <select name="manufacturer" defaultValue={selectedManufacturer} required>
                <option value="" disabled>Choose manufacturer</option>
                {partMatches.map((match) => (
                  match.manufacturerSlug ? (
                    <option value={match.manufacturerSlug} key={match.id}>
                      {match.manufacturerName || match.manufacturerSlug}
                    </option>
                  ) : null
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Machine model</span>
            <input name="model" defaultValue={model} placeholder="e.g. 5075M or S7 600" required />
          </label>
          <label>
            <span>Serial number</span>
            <input name="serial" defaultValue={serial} placeholder="e.g. 034280" />
          </label>
          <button type="submit">Check fitment</button>
        </form>

        <div className="parts-stats">
          <div><strong>Part + model</strong><span>required to test a stored fitment relationship</span></div>
          <div><strong>Manufacturer-safe</strong><span>shared part numbers are disambiguated before any fitment claim is made</span></div>
          <div><strong>Serial</strong><span>optional unless the application has a documented serial break</span></div>
        </div>

        {submitted && !result && (
          <section className="data-section checker-result">
            <h2>Enter both a part number and machine model</h2>
            <p>The serial number is optional. Start with the exact part number printed on the part, packaging or manufacturer documentation and the machine model designation.</p>
          </section>
        )}

        {result && (
          <section className="data-section checker-result">
            <h2>{resultHeading(result.status)}</h2>
            <p>{result.message}</p>
            <p className="section-note">{resultGuidance(result.status)}</p>

            {result.status === 'part-ambiguous' && partMatches.length > 1 && (
              <div className="grid" style={{ marginTop: 18 }}>
                {partMatches.map((match) => (
                  match.manufacturerSlug ? (
                    <Link
                      className="card"
                      key={match.id}
                      href={manufacturerCheckHref(part, model, serial, match.manufacturerSlug)}
                    >
                      <span className="eyebrow">Part manufacturer</span>
                      <h3>{match.manufacturerName || match.manufacturerSlug} {match.partNumber}</h3>
                      <p>Check this exact manufacturer record against {model}.</p>
                    </Link>
                  ) : null
                ))}
              </div>
            )}

            {result.partNumber && resultPartHref && (
              <div className="placeholder-row">
                <span>Part</span>
                <span>
                  <Link href={resultPartHref}>{result.partNumber}{result.partName ? ` · ${result.partName}` : ''}</Link>
                </span>
              </div>
            )}
            {result.partManufacturerName && <div className="placeholder-row"><span>Part manufacturer</span><span>{result.partManufacturerName}</span></div>}
            {result.model && resultMachineHref && <div className="placeholder-row"><span>Machine</span><span><Link href={resultMachineHref}>{result.brand} {result.model}</Link></span></div>}
            {result.equipmentType && <div className="placeholder-row"><span>Equipment type</span><span>{result.equipmentType}</span></div>}
            {resultConfidence && <div className="placeholder-row"><span>Fitment confidence</span><span>{resultConfidence}</span></div>}
            {result.serialPrefix && <div className="placeholder-row"><span>Serial prefix</span><span>{result.serialPrefix}</span></div>}
            {result.serialFrom && <div className="placeholder-row"><span>Serial from</span><span>{result.serialPrefix || ''}{result.serialFrom}</span></div>}
            {result.serialTo && <div className="placeholder-row"><span>Serial to</span><span>{result.serialPrefix || ''}{result.serialTo}</span></div>}
            {result.configurationNote && <div className="placeholder-row"><span>Configuration</span><span>{result.configurationNote}</span></div>}
            {result.fitmentNote && <div className="placeholder-row"><span>Fitment note</span><span>{result.fitmentNote}</span></div>}
            {result.sourceUrl && <div className="placeholder-row"><span>Source</span><span><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">{result.sourceTitle || 'Technical source'}</a></span></div>}
            <p>
              {resultMachineHref && <Link className="tool-link" href={resultMachineHref}>Open machine reference →</Link>}
              {resultPartHref && <>{' '}<Link className="tool-link" href={resultPartHref}>Open full part reference →</Link></>}
            </p>
          </section>
        )}

        <section className="catalog-group">
          <h2>How to interpret a fitment result</h2>
          <div className="grid">
            <div className="card">
              <span className="eyebrow">Documented range</span>
              <h3>Fits documented serial range</h3>
              <p>The stored cited rule supports the exact part record, model and entered serial. The fitment confidence shown in the result explains the evidence level.</p>
            </div>
            <div className="card">
              <span className="eyebrow">Model-level evidence</span>
              <h3>Serial unverified</h3>
              <p>The model fitment is documented, but a machine-specific serial rule is unavailable or cannot be tested from the current source.</p>
            </div>
            <div className="card">
              <span className="eyebrow">No assertion</span>
              <h3>No documented direct fitment</h3>
              <p>This means the published catalog lacks a direct cited relationship for the exact query. It does not mean the part is definitely incompatible.</p>
            </div>
          </div>
        </section>

        <div className="notice">
          This tool only evaluates rules already stored from cited sources for published parts and machines. Shared part numbers are separated by manufacturer before fitment is checked. A missing fitment or missing serial rule is not proof that a part is incompatible. Always verify the complete machine PIN, model year, market and configuration before ordering. See <Link href="/methodology">Data Sources &amp; Methodology</Link> for the publication rules used by this site.
        </div>
      </div>
    </main>
  );
}
