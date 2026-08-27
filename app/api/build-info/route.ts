import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    build: '2026-08-27-versioned-specs-1',
    expectedCommit: 'f7d0ad4+',
  });
}
