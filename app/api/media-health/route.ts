import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const root = process.cwd();
    const manifestPath = path.join(root, 'public', 'media', 'media-build-manifest.json');
    const raw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw) as {
      generatedAt: string;
      images: Array<{
        sourceKey: string;
        publicUrl: string;
        sha256: string;
        bytes: number;
        contentType: string;
      }>;
    };

    const files = [];
    for (const image of manifest.images) {
      const localFile = path.join(root, 'public', image.publicUrl.replace(/^\//, ''));
      const fileStat = await stat(localFile);
      files.push({
        sourceKey: image.sourceKey,
        publicUrl: image.publicUrl,
        exists: fileStat.isFile(),
        bytes: fileStat.size,
        sha256: image.sha256,
        contentType: image.contentType,
      });
    }

    return NextResponse.json(
      { ok: true, storage: 'local-public', generatedAt: manifest.generatedAt, files },
      { headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error('Media health check failed:', error);
    return NextResponse.json(
      { ok: false, storage: 'local-public', error: 'Local media manifest or files are unavailable' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }
}
