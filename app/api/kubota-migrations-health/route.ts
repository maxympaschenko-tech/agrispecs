import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { kubotaMigrations } from '@/lib/migrations/kubota';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MigrationRow = RowDataPacket & { id: string };

export async function GET() {
  const registeredIds = kubotaMigrations.map((migration) => migration.id);
  const expectedLatestKubotaMigration = registeredIds.at(-1) || null;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MigrationRow[]>(`
      SELECT id
      FROM schema_migrations
      WHERE id LIKE '20260827_1%'
      ORDER BY id ASC
    `);

    const appliedSet = new Set(rows.map((row) => row.id));
    const missingMigrations = registeredIds.filter((id) => !appliedSet.has(id));
    const appliedRegisteredMigrations = registeredIds.filter((id) => appliedSet.has(id));

    return NextResponse.json({
      ok: missingMigrations.length === 0,
      expectedLatestKubotaMigration,
      latestMigrationApplied: expectedLatestKubotaMigration ? appliedSet.has(expectedLatestKubotaMigration) : false,
      registeredKubotaMigrations: registeredIds.length,
      appliedKubotaMigrations: appliedRegisteredMigrations.length,
      missingMigrations,
    }, {
      status: missingMigrations.length === 0 ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Kubota migration health check failed:', error);
    return NextResponse.json({
      ok: false,
      expectedLatestKubotaMigration,
      registeredKubotaMigrations: registeredIds.length,
      error: 'Kubota migration health check failed',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
