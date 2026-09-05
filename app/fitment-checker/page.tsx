import type { Metadata } from 'next';
import Link from 'next/link';
import { checkPartFitment } from '@/lib/fitment-checker-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ part?: string; model?: string; serial?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasQueryState = Boolean(params.part || params.model || params.serial);

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
  return 'Unable to verify';
}

function resultGuidance(status: string) {
  if (status === 'fits') return 'The stored source-backed rule covers this model and the serial number entered.';
  if (status === 'outside-range') return 'The entered serial number falls outside the documented range stored for this part/model relationship. Check for a replacement part, another machine generation or a configuration-specific rule before ordering.';
  if (status === 'serial-unverified') return 'The model relationship is documented, but the stored source does not provide a structured serial-number rule that can be tested automatically.';
  if (status === 'fitment-known') return 'The model relationship is documented. Add a serial number when available; some applications depend on serial break, market or configuration.';
  if (status === 'no-fitment') return 'No direct source-backed relationship is stored for this exact part/model query. That is not proof of incompatibility.';
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

export default async function FitmentCheckerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const part = (params.part || '').trim();
  const model = (params.model || '').trim();
  const serial = (params.serial || '').trim();
  const submitted = Boolean(part || model || serial);
  const result = part && model ? await checkPartFitment(part, model, serial) : null;
  const resultMachineHref = result ? machineHref(result) : null;
  const resultConfidence = result ? confidenceLabel(result.fitmentConfidence) : null;

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Compatibility tool</span>
        <h1>Part fitment and serial number checker</h1>
        <p className="section-lead">Check a part number against a published farm machine model and, when the cited manufacturer or technical source publishes a structured serial range, test the entered serial number against that documented rule.</p>

        <form className="checker-form" action="/fitment-checker">
          <label>
            <span>Part number</span>
            <input name="part" defaultValue={part} placeholder="e.g. RE519626" required />
          </label>
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
          <div><strong>Serial</strong><span>optional unless the application has a documented serial break</span></div>
          <div><strong>Source-backed</strong><span>confidence is shown explicitly; missing data is never converted into a fitment claim</span></div>
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
            {result.partNumber && <div className="placeholder-row"><span>Part</span><span><Link href={`/parts/${result.partNumber.toLowerCase()}`}>{result.partNumber}{result.partName ? ` · ${result.partName}` : ''}</Link></span></div>}
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
              {result.partNumber && <>{' '}<Link className="tool-link" href={`/parts/${result.partNumber.toLowerCase()}`}>Open full part reference →</Link></>}
            </p>
          </section>
        )}

        <section className="catalog-group">
          <h2>How to interpret a fitment result</h2>
          <div className="grid">
            <div className="card">
              <span className="eyebrow">Documented range</span>
              <h3>Fits documented serial range</h3>
              <p>The stored cited rule supports the model and the entered serial falls inside its documented range. The fitment confidence shown in the result explains the evidence level.</p>
            </div>
            <div className="card">
              <span className="eyebrow">Model-level evidence</span>
              <h3>Serial unverified</h3>
              <p>The model fitment is documented, but a machine-specific serial rule is unavailable or cannot be tested from the current source.</p>
            </div>
            <div className="card">
              <span className="eyebrow">No assertion</span>
              <h3>No documented direct fitment</h3>
              <p>This means the published catalog lacks a direct cited relationship for the query. It does not mean the part is definitely incompatible.</p>
            </div>
          </div>
        </section>

        <div className="notice">
          This tool only evaluates rules already stored from cited sources for published parts and machines. A missing fitment or missing serial rule is not proof that a part is incompatible. Always verify the complete machine PIN, model year, market and configuration before ordering. See <Link href="/methodology">Data Sources &amp; Methodology</Link> for the publication rules used by this site.
        </div>
      </div>
    </main>
  );
}
