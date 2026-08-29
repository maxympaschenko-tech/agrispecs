import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const release = {
  marker: '2026-08-29-homepage-portal-v1',
  expectedFeatures: [
    'tractor-field-favicon',
    'homepage-coverage-counters',
    'homepage-cross-brand-featured-tractors',
    'homepage-popular-comparisons',
    'interactive-tractor-compare',
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
