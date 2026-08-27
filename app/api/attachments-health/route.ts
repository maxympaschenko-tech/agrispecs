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
      `SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_132_6m_6r_hydraulic_stabilizer_parts'`,
    );

    const [
      verifiedLoaders,
      compatibilityRows,
      johnDeere5MRows,
      johnDeere6MRows,
      johnDeere6RRows,
      loaderMountingParts,
      johnDeere6MMountingFrameFitments,
      johnDeere6RMountingFrameFitments,
      johnDeere6RFrontAccessoryParts,
      johnDeere6RFrontAccessoryFitments,
      pickupHitchValveKitParts,
      pickupHitchValveKitFitments,
      hydraulicControlValveParts,
      hydraulicControlValveFitments,
      stabilizerBraceParts,
      stabilizerBraceFitments,
    ] = await Promise.all([
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
      count(`
        SELECT COUNT(*) AS count
        FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='john-deere'
          AND p.normalized_part_number IN ('AXX10595','AXX10596','AXX10321','AXX10322')
          AND p.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150')
          AND p.normalized_part_number IN ('AXX10595','AXX10596')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195')
          AND p.normalized_part_number IN ('AXX10595','AXX10596','AXX10321','AXX10322')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='john-deere'
          AND p.normalized_part_number IN ('BL16780','BL16781')
          AND p.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195')
          AND p.normalized_part_number IN ('BL16780','BL16781')
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='john-deere' AND p.normalized_part_number='BL16683' AND p.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN (
            '6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150',
            '6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195'
          )
          AND p.normalized_part_number='BL16683'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='john-deere' AND p.normalized_part_number='AL231796' AND p.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN (
            '6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150',
            '6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195'
          )
          AND p.normalized_part_number='AL231796'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='john-deere' AND p.normalized_part_number='AL201127' AND p.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('6r-175','6r-195')
          AND p.normalized_part_number='AL201127'
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestMigration: '20260827_132_6m_6r_hydraulic_stabilizer_parts',
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
      loaderMountingParts,
      expectedLoaderMountingParts: 4,
      johnDeere6MMountingFrameFitments,
      expectedJohnDeere6MMountingFrameFitments: 14,
      johnDeere6RMountingFrameFitments,
      expectedJohnDeere6RMountingFrameFitments: 14,
      johnDeere6RFrontAccessoryParts,
      expectedJohnDeere6RFrontAccessoryParts: 2,
      johnDeere6RFrontAccessoryFitments,
      expectedJohnDeere6RFrontAccessoryFitments: 14,
      pickupHitchValveKitParts,
      expectedPickupHitchValveKitParts: 1,
      pickupHitchValveKitFitments,
      expectedPickupHitchValveKitFitments: 14,
      hydraulicControlValveParts,
      expectedHydraulicControlValveParts: 1,
      hydraulicControlValveFitments,
      expectedHydraulicControlValveFitments: 14,
      stabilizerBraceParts,
      expectedStabilizerBraceParts: 1,
      stabilizerBraceFitments,
      expectedStabilizerBraceFitments: 2,
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
