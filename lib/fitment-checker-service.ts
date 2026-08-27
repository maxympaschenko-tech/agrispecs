import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type FitmentRow = RowDataPacket & {
  part_number: string;
  part_name: string | null;
  brand: string;
  brand_slug: string;
  model: string;
  model_slug: string;
  fitment_note: string | null;
  serial_prefix: string | null;
  serial_from: string | null;
  serial_to: string | null;
  configuration_note: string | null;
  source_title: string | null;
  source_url: string | null;
};

export type FitmentCheckResult = {
  status: 'part-not-found' | 'machine-not-found' | 'no-fitment' | 'fitment-known' | 'serial-unverified' | 'fits' | 'outside-range' | 'invalid-serial';
  message: string;
  partNumber?: string;
  partName?: string | null;
  brand?: string;
  brandSlug?: string;
  model?: string;
  modelSlug?: string;
  serialPrefix?: string | null;
  serialFrom?: string | null;
  serialTo?: string | null;
  configurationNote?: string | null;
  fitmentNote?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
};

function normalizePart(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeModel(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeSerial(value: string) {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export async function checkPartFitment(partInput: string, modelInput: string, serialInput?: string): Promise<FitmentCheckResult> {
  const part = normalizePart(partInput);
  const model = normalizeModel(modelInput);
  if (!part) return { status:'part-not-found', message:'Enter a part number.' };
  if (!model) return { status:'machine-not-found', message:'Enter a machine model.' };

  const db = await getDbReady();
  const [partRows] = await db.query<RowDataPacket[]>(`SELECT id FROM parts WHERE normalized_part_number=? LIMIT 1`, [part]);
  if (!partRows[0]) return { status:'part-not-found', message:`Part ${partInput} is not in the verified catalog yet.` };

  const [machineRows] = await db.query<RowDataPacket[]>(`
    SELECT id FROM machines
    WHERE LOWER(REPLACE(REPLACE(REPLACE(model_name,' ',''),'-',''),'.',''))=?
       OR LOWER(REPLACE(REPLACE(REPLACE(slug,' ',''),'-',''),'.',''))=?
    LIMIT 1
  `, [model,model]);
  if (!machineRows[0]) return { status:'machine-not-found', message:`Machine model ${modelInput} is not in the catalog yet.` };

  const [rows] = await db.query<FitmentRow[]>(`
    SELECT p.part_number, p.name AS part_name, mf.name AS brand, mf.slug AS brand_slug,
           m.model_name AS model, m.slug AS model_slug, mp.fitment_note,
           mp.serial_prefix, mp.serial_from, mp.serial_to, mp.configuration_note,
           sr.title AS source_title, sr.url AS source_url
    FROM machine_parts mp
    JOIN parts p ON p.id=mp.part_id
    JOIN machines m ON m.id=mp.machine_id
    JOIN manufacturers mf ON mf.id=m.manufacturer_id
    LEFT JOIN source_records sr ON sr.id=mp.source_record_id
    WHERE p.normalized_part_number=? AND m.id=?
    ORDER BY (mp.serial_from IS NOT NULL OR mp.serial_to IS NOT NULL) DESC
  `, [part,Number(machineRows[0].id)]);

  if (!rows[0]) return { status:'no-fitment', message:`No verified direct fitment is recorded for ${partInput} on ${modelInput}. This is not proof that the part does not fit.` };

  const row = rows[0];
  const base = {
    partNumber: row.part_number,
    partName: row.part_name,
    brand: row.brand,
    brandSlug: row.brand_slug,
    model: row.model,
    modelSlug: row.model_slug,
    serialPrefix: row.serial_prefix,
    serialFrom: row.serial_from,
    serialTo: row.serial_to,
    configurationNote: row.configuration_note,
    fitmentNote: row.fitment_note,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
  };

  const hasSerialRule = Boolean(row.serial_prefix || row.serial_from || row.serial_to);
  if (!serialInput?.trim()) {
    return hasSerialRule
      ? { status:'fitment-known', message:'Verified model fitment found. Enter the serial number to test the documented serial range.', ...base }
      : { status:'fitment-known', message:'Verified model fitment found. No structured serial-number restriction is recorded for this fitment.', ...base };
  }

  if (!hasSerialRule) {
    return { status:'serial-unverified', message:'Verified model fitment found, but the source record does not provide a structured serial-number rule. The entered serial cannot be confirmed automatically.', ...base };
  }

  const serial = normalizeSerial(serialInput);
  let numeric = serial;
  if (row.serial_prefix) {
    const prefix = row.serial_prefix.toUpperCase();
    if (!serial.startsWith(prefix)) {
      return { status:'outside-range', message:`The entered serial does not match the verified prefix ${prefix}.`, ...base };
    }
    numeric = serial.slice(prefix.length);
  }

  if (!/^\d+$/.test(numeric)) {
    return { status:'invalid-serial', message:'This fitment rule uses a numeric serial range. Enter the serial number in the documented format.', ...base };
  }

  const value = BigInt(numeric);
  const from = row.serial_from && /^\d+$/.test(row.serial_from) ? BigInt(row.serial_from) : null;
  const to = row.serial_to && /^\d+$/.test(row.serial_to) ? BigInt(row.serial_to) : null;
  const fits = (from === null || value >= from) && (to === null || value <= to);

  return fits
    ? { status:'fits', message:'The entered serial is inside the verified fitment range.', ...base }
    : { status:'outside-range', message:'The entered serial is outside the verified fitment range for this part.', ...base };
}
