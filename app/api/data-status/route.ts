import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MigrationRow = RowDataPacket & {
  id: string;
  applied_at: string;
};

type CountRow = RowDataPacket & {
  total: number;
  seed: number;
  partial: number;
  verified: number;
  review: number;
};

export async function GET() {
  try {
    const db = getDb();

    let migrations: MigrationRow[] = [];
    try {
      const [rows] = await db.query<MigrationRow[]>(`
        SELECT id, DATE_FORMAT(applied_at, '%Y-%m-%d %H:%i:%s') AS applied_at
        FROM schema_migrations
        ORDER BY applied_at ASC, id ASC
      `);
      migrations = rows;
    } catch {
      migrations = [];
    }

    const [counts] = await db.query<CountRow[]>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN m.data_status = 'seed' THEN 1 ELSE 0 END) AS seed,
        SUM(CASE WHEN m.data_status = 'partial' THEN 1 ELSE 0 END) AS partial,
        SUM(CASE WHEN m.data_status = 'verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN m.data_status = 'review' THEN 1 ELSE 0 END) AS review
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      WHERE mf.slug = 'john-deere'
    `);

    const row = counts[0];
    return NextResponse.json(
      {
        ok: true,
        migrations: migrations.map((item) => ({ id: item.id, appliedAt: item.applied_at })),
        johnDeere: {
          total: Number(row?.total || 0),
          seed: Number(row?.seed || 0),
          partial: Number(row?.partial || 0),
          verified: Number(row?.verified || 0),
          review: Number(row?.review || 0),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  } catch (error) {
    console.error('Read-only data status failed:', error);
    return NextResponse.json(
      { ok: false },
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
