import type { Metadata } from 'next';
import Link from 'next/link';
import { checkPartFitment } from '@/lib/fitment-checker-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Farm Equipment Part Serial Number Fitment Checker',
  description: 'Check verified farm equipment part fitment by model and serial number using source-backed compatibility data.',
  alternates: { canonical: '/fitment-checker' },
};

type PageProps = {
  searchParams: Promise<{ part?: string; model?: string; serial?: string }>;
};

function resultHeading(status: string) {
  if (status === 'fits') return 'Fits verified serial range';
  if (status === 'outside-range') return 'Outside verified serial range';
  if (status === 'serial-unverified') return 'Model fitment found, serial unverified';
  if (status === 'fitment-known') return 'Verified model fitment found';
  if (status === 'no-fitment') return 'No verified direct fitment found';
  return 'Unable to verify';
}

export default async function FitmentCheckerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const part = (params.part || '').trim();
  const model = (params.model || '').trim();
  const serial = (params.serial || '').trim();
  const submitted = Boolean(part || model || serial);
  const result = part && model ? await checkPartFitment(part, model, serial) : null;

  return (
    <main className="section">
      <div className="container">
        <span className="eyebrow">Compatibility tool</span>
        <h1>Part serial number fitment checker</h1>
        <p className="section-lead">Check a part number against a machine model and, when Deere publishes a structured serial range, test the serial number against that range.</p>

        <form className="checker-form" action="/fitment-checker">
          <label>
            <span>Part number</span>
            <input name="part" defaultValue={part} placeholder="e.g. RE519626" required />
          </label>
          <label>
            <span>Machine model</span>
            <input name="model" defaultValue={model} placeholder="e.g. 5075M" required />
          </label>
          <label>
            <span>Serial number</span>
            <input name="serial" defaultValue={serial} placeholder="e.g. 034280" />
          </label>
          <button type="submit">Check fitment</button>
        </form>

        {submitted && !result && (
          <section className="data-section checker-result">
            <h2>Enter both a part number and machine model</h2>
            <p>The serial number is optional.</p>
          </section>
        )}

        {result && (
          <section className="data-section checker-result">
            <h2>{resultHeading(result.status)}</h2>
            <p>{result.message}</p>
            {result.partNumber && <div className="placeholder-row"><span>Part</span><span><Link href={`/parts/${result.partNumber.toLowerCase()}`}>{result.partNumber}{result.partName ? ` · ${result.partName}` : ''}</Link></span></div>}
            {result.model && result.brandSlug && result.modelSlug && <div className="placeholder-row"><span>Machine</span><span><Link href={`/tractors/${result.brandSlug}/${result.modelSlug}`}>{result.brand} {result.model}</Link></span></div>}
            {result.serialPrefix && <div className="placeholder-row"><span>Serial prefix</span><span>{result.serialPrefix}</span></div>}
            {result.serialFrom && <div className="placeholder-row"><span>Serial from</span><span>{result.serialPrefix || ''}{result.serialFrom}</span></div>}
            {result.serialTo && <div className="placeholder-row"><span>Serial to</span><span>{result.serialPrefix || ''}{result.serialTo}</span></div>}
            {result.configurationNote && <div className="placeholder-row"><span>Configuration</span><span>{result.configurationNote}</span></div>}
            {result.fitmentNote && <div className="placeholder-row"><span>Fitment note</span><span>{result.fitmentNote}</span></div>}
            {result.sourceUrl && <div className="placeholder-row"><span>Source</span><span><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">{result.sourceTitle || 'Official technical source'}</a></span></div>}
          </section>
        )}

        <div className="notice">
          This tool only confirms rules already stored from cited sources. A missing fitment or missing serial rule is not proof that a part is incompatible. Always verify the complete machine PIN and configuration before ordering.
        </div>
      </div>
    </main>
  );
}
