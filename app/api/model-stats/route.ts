import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';

type CountRow = RowDataPacket & { count: number };
type MachineRow = RowDataPacket & { id: number; data_status: string };

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get('brand') || 'john-deere';
  const model = request.nextUrl.searchParams.get('model') || '5075e';

  try {
    const db = getDb();
    const [machines] = await db.query<MachineRow[]>(`
      SELECT m.id, m.data_status
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      WHERE mf.slug = ? AND m.slug = ?
      LIMIT 1
    `, [brand, model]);

    const machine = machines[0];
    if (!machine) {
      return NextResponse.json({ ok: false, found: false }, { status: 404 });
    }

    const [[versions]] = await db.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM machine_versions WHERE machine_id = ?',
      [machine.id],
    );
    const [[specs]] = await db.query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM machine_specs WHERE machine_id = ?',
      [machine.id],
    );

    return NextResponse.json({
      ok: true,
      found: true,
      dataStatus: machine.data_status,
      versions: Number(versions?.count || 0),
      specs: Number(specs?.count || 0),
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
