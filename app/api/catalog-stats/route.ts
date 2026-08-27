import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';

type CountRow = RowDataPacket & { count: number };

export async function GET() {
  try {
    const db = getDb();
    const [[manufacturers]] = await db.query<CountRow[]>('SELECT COUNT(*) AS count FROM manufacturers');
    const [[machines]] = await db.query<CountRow[]>('SELECT COUNT(*) AS count FROM machines');
    const [[parts]] = await db.query<CountRow[]>('SELECT COUNT(*) AS count FROM parts');

    return NextResponse.json({
      ok: true,
      manufacturers: Number(manufacturers?.count || 0),
      machines: Number(machines?.count || 0),
      parts: Number(parts?.count || 0),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
