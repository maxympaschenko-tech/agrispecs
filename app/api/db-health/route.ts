import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const [rows] = await db.query('SELECT DATABASE() AS database_name, 1 AS connected');
    const result = Array.isArray(rows) ? rows[0] as { database_name?: string; connected?: number } : null;

    return NextResponse.json({
      ok: true,
      connected: result?.connected === 1,
      database: result?.database_name || null,
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      { ok: false, connected: false, error: 'Database connection failed' },
      { status: 500 },
    );
  }
}
