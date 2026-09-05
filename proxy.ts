import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname, searchParams } = request.nextUrl;
  const hasQuery = searchParams.toString().length > 0;

  const isInteractiveComparison = (
    pathname === '/compare'
    || pathname === '/equipment/compare'
  ) && hasQuery;

  const isHistoricalTractorVersion = pathname.startsWith('/tractors/') && searchParams.has('version');

  if (isInteractiveComparison || isHistoricalTractorVersion) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }

  return response;
}

export const config = {
  matcher: [
    '/compare',
    '/equipment/compare',
    '/tractors/:brand/:model',
  ],
};
