import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };
type MigrationRow = RowDataPacket & { count: number };

async function count(sql: string, params: unknown[] = []) {
  const db = await getDbReady();
  const [rows] = await db.query<CountRow[]>(sql, params);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const db = await getDbReady();
    const [migrationRows] = await db.query<MigrationRow[]>(
      `SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_126_loader_compatibility'`,
    );

    const [verifiedLoaders, compatibilityRows, johnDeere5MRows] = await Promise.all([
      count(`
        SELECT COUNT(*) AS count
        FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='john-deere'
          AND a.attachment_type='front-loader'
          AND a.data_status='verified'
          AND a.slug IN ('520m','540m','540r','600m')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_attachments ma
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE a.attachment_type='front-loader'
          AND a.slug IN ('520m','540m','540r','600m')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_attachments ma
        JOIN attachments a ON a.id=ma.attachment_id
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('5075m','5095m','5105m','5120m','5130m')
          AND a.slug IN ('520m','540m','540r','600m')
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestMigration: '20260827_126_loader_compatibility',
      migrationApplied: Number(migrationRows[0]?.count || 0) === 1,
      verifiedLoaders,
      expectedVerifiedLoaders: 4,
      compatibilityRows,
      johnDeere5MCompatibilityRows: johnDeere5MRows,
      expectedJohnDeere5MCompatibilityRows: 20,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Attachment health check failed:', error);
    return NextResponse.json({ ok: false, error: 'Attachment health check failed' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
