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
      `SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_128_6m_6r_loader_compatibility'`,
    );

    const [verifiedLoaders, compatibilityRows, johnDeere5MRows, johnDeere6MRows, johnDeere6RRows] = await Promise.all([
      count(`
        SELECT COUNT(*) AS count
        FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='john-deere'
          AND a.attachment_type='front-loader'
          AND a.data_status='verified'
          AND a.slug IN ('520m','540m','540r','600m','600r','620r','640r','660r')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_attachments ma
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE a.attachment_type='front-loader'
          AND a.slug IN ('520m','540m','540r','600m','600r','620r','640r','660r')
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
      count(`
        SELECT COUNT(*) AS count
        FROM machine_attachments ma
        JOIN attachments a ON a.id=ma.attachment_id
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150')
          AND a.slug IN ('600r','620r','640r')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_attachments ma
        JOIN attachments a ON a.id=ma.attachment_id
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195')
          AND a.slug IN ('620r','640r','660r')
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestMigration: '20260827_128_6m_6r_loader_compatibility',
      migrationApplied: Number(migrationRows[0]?.count || 0) === 1,
      verifiedLoaders,
      expectedVerifiedLoaders: 8,
      compatibilityRows,
      expectedCompatibilityRows: 46,
      johnDeere5MCompatibilityRows: johnDeere5MRows,
      expectedJohnDeere5MCompatibilityRows: 20,
      johnDeere6MCompatibilityRows: johnDeere6MRows,
      expectedJohnDeere6MCompatibilityRows: 14,
      johnDeere6RCompatibilityRows: johnDeere6RRows,
      expectedJohnDeere6RCompatibilityRows: 12,
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
