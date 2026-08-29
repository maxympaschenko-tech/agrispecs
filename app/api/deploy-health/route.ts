import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const release = {
  marker: '2026-08-29-structured-data-v2',
  expectedFeatures: [
    'tractor-field-favicon',
    'homepage-portal-layout',
    'homepage-popular-comparisons',
    'interactive-tractor-compare',
    'source-backed-parts-catalog',
    'source-backed-attachment-catalog',
    'fitment-checker-guidance',
    'methodology-page',
    'global-website-jsonld',
    'tractor-detail-jsonld',
    'part-detail-jsonld',
    'attachment-detail-jsonld',
    'brand-hub-jsonld',
    'catalog-hub-jsonld',
    'comparison-hub-jsonld',
  ],
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'farm-machine-specs',
    ...release,
    servedAt: new Date().toISOString(),
  });
}
