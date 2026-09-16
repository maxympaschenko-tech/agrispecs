import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'farmmachinespecs.com';
const WWW_HOST = `www.${CANONICAL_HOST}`;

function isStaticLikePath(pathname: string) {
  return pathname.startsWith('/.well-known/')
    || pathname.startsWith('/_next/')
    || /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const needsHttps = forwardedProto ? forwardedProto === 'http' : request.nextUrl.protocol === 'http:';
  const needsCanonicalHost = host === WWW_HOST;
  const needsTrailingSlashRemoval = pathname.length > 1
    && pathname.endsWith('/')
    && !isStaticLikePath(pathname);

  if (needsHttps || needsCanonicalHost || needsTrailingSlashRemoval) {
    const destination = request.nextUrl.clone();
    destination.protocol = 'https:';
    destination.hostname = CANONICAL_HOST;
    destination.port = '';

    if (needsTrailingSlashRemoval) {
      destination.pathname = pathname.replace(/\/+$/, '');
    }

    return NextResponse.redirect(destination, 308);
  }

  const response = NextResponse.next();
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
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
