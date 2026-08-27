import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { ensureDatabaseMigrations } from '@/lib/db-migrations';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type StatusRow = RowDataPacket & {
  applied: number;
  latest: string | null;
};

export async function GET() {
  try {
    await ensureDatabaseMigrations();

    const [rows] = await getDb().query<StatusRow[]>(`
      SELECT
        COUNT(*) AS applied,
        MAX(id) AS latest
      FROM schema_migrations
    `);

    return NextResponse.json(
      {
        ok: true,
        applied: Number(rows[0]?.applied || 0),
        latest: rows[0]?.latest || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  } catch (error) {
    console.error('Migration runner failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Migration runner failed' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  }
}
