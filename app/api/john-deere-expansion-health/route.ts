import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { johnDeereExpansionMigrations } from '@/lib/migrations/john-deere-expansion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MigrationRow = RowDataPacket & { id: string };

export async function GET() {
  const registeredIds = johnDeereExpansionMigrations.map((migration) => migration.id);
  const expectedLatestJohnDeereExpansionMigration = registeredIds.at(-1) || null;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MigrationRow[]>(`
      SELECT id
      FROM schema_migrations
      WHERE id LIKE '20260828_2%'
      ORDER BY id ASC
    `);

    const appliedSet = new Set(rows.map((row) => row.id));
    const missingMigrations = registeredIds.filter((id) => !appliedSet.has(id));
    const appliedRegisteredMigrations = registeredIds.filter((id) => appliedSet.has(id));

    return NextResponse.json({
      ok: missingMigrations.length === 0,
      expectedLatestJohnDeereExpansionMigration,
      latestMigrationApplied: expectedLatestJohnDeereExpansionMigration
        ? appliedSet.has(expectedLatestJohnDeereExpansionMigration)
        : false,
      registeredJohnDeereExpansionMigrations: registeredIds.length,
      appliedJohnDeereExpansionMigrations: appliedRegisteredMigrations.length,
      missingMigrations,
    }, {
      status: missingMigrations.length === 0 ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('John Deere expansion migration health check failed:', error);
    return NextResponse.json({
      ok: false,
      expectedLatestJohnDeereExpansionMigration,
      registeredJohnDeereExpansionMigrations: registeredIds.length,
      error: 'John Deere expansion migration health check failed',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
