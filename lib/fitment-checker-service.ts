import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type FitmentConfidence = 'official' | 'high' | 'medium' | 'low';

type PartLookupRow = RowDataPacket & {
  id: number;
  part_number: string;
  part_name: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
};

type MachineLookupRow = RowDataPacket & {
  id: number;
  model_name: string;
  model_slug: string;
  brand: string;
  brand_slug: string;
  equipment_type: string;
  equipment_type_slug: string;
};

type FitmentRow = RowDataPacket & {
  part_number: string;
  part_name: string | null;
  part_manufacturer_name: string | null;
  part_manufacturer_slug: string | null;
  brand: string;
  brand_slug: string;
  model: string;
  model_slug: string;
  equipment_type: string;
  equipment_type_slug: string;
  fitment_confidence: FitmentConfidence;
  fitment_note: string | null;
  serial_prefix: string | null;
  serial_from: string | null;
  serial_to: string | null;
  configuration_note: string | null;
  source_title: string | null;
  source_url: string | null;
};

export type PublishedMachineIdentity = {
  id: number;
  model: string;
  modelSlug: string;
  brand: string;
  brandSlug: string;
  equipmentType: string;
  equipmentTypeSlug: string;
};

export type FitmentCheckResult = {
  status: 'part-not-found' | 'part-ambiguous' | 'machine-not-found' | 'machine-ambiguous' | 'no-fitment' | 'fitment-known' | 'serial-unverified' | 'fits' | 'outside-range' | 'invalid-serial';
  message: string;
  partNumber?: string;
  partName?: string | null;
  partManufacturerName?: string | null;
  partManufacturerSlug?: string | null;
  brand?: string;
  brandSlug?: string;
  model?: string;
  modelSlug?: string;
  equipmentType?: string;
  equipmentTypeSlug?: string;
  fitmentConfidence?: FitmentConfidence;
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

function hasSerialRule(row: FitmentRow) {
  return Boolean(row.serial_prefix || row.serial_from || row.serial_to);
}

function machineBase(row: MachineLookupRow) {
  return {
    brand: row.brand,
    brandSlug: row.brand_slug,
    model: row.model_name,
    modelSlug: row.model_slug,
    equipmentType: row.equipment_type,
    equipmentTypeSlug: row.equipment_type_slug,
  };
}

function resultBase(row: FitmentRow) {
  return {
    partNumber: row.part_number,
    partName: row.part_name,
    partManufacturerName: row.part_manufacturer_name,
    partManufacturerSlug: row.part_manufacturer_slug,
    brand: row.brand,
    brandSlug: row.brand_slug,
    model: row.model,
    modelSlug: row.model_slug,
    equipmentType: row.equipment_type,
    equipmentTypeSlug: row.equipment_type_slug,
    fitmentConfidence: row.fitment_confidence,
    serialPrefix: row.serial_prefix,
    serialFrom: row.serial_from,
    serialTo: row.serial_to,
    configurationNote: row.configuration_note,
    fitmentNote: row.fitment_note,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
  };
}

function serialMatchesRow(serial: string, row: FitmentRow): 'fits' | 'outside' | 'unparseable' {
  let numeric = serial;

  if (row.serial_prefix) {
    if (!/^\d+$/.test(serial)) {
      const prefix = row.serial_prefix.toUpperCase();
      const prefixIndex = serial.lastIndexOf(prefix);
      if (prefixIndex < 0) return 'outside';

      const tail = serial.slice(prefixIndex + prefix.length);
      const suffix = tail.match(/(\d+)$/)?.[1];
      if (!suffix) return 'unparseable';
      numeric = suffix;
    }
  } else if (!/^\d+$/.test(numeric)) {
    return 'unparseable';
  }

  if (!/^\d+$/.test(numeric)) return 'unparseable';

  const value = BigInt(numeric);
  const from = row.serial_from && /^\d+$/.test(row.serial_from) ? BigInt(row.serial_from) : null;
  const to = row.serial_to && /^\d+$/.test(row.serial_to) ? BigInt(row.serial_to) : null;
  return (from === null || value >= from) && (to === null || value <= to) ? 'fits' : 'outside';
}

export async function getPublishedMachineMatches(modelInput: string): Promise<PublishedMachineIdentity[]> {
  const model = normalizeModel(modelInput);
  if (!model) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MachineLookupRow[]>(`
      SELECT
        m.id,
        m.model_name,
        m.slug AS model_slug,
        mf.name AS brand,
        mf.slug AS brand_slug,
        et.name AS equipment_type,
        et.slug AS equipment_type_slug
      FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN equipment_types et ON et.id=m.equipment_type_id
      WHERE m.data_status IN ('partial','verified')
        AND (
          LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(m.model_name,' ',''),'-',''),'/',''),'.',''),'_',''))=?
          OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(m.slug,' ',''),'-',''),'/',''),'.',''),'_',''))=?
        )
      ORDER BY mf.name ASC, et.name ASC, m.model_name ASC, m.id ASC
      LIMIT 25
    `, [model, model]);

    return rows.map((row) => ({
      id: Number(row.id),
      model: row.model_name,
      modelSlug: row.model_slug,
      brand: row.brand,
      brandSlug: row.brand_slug,
      equipmentType: row.equipment_type,
      equipmentTypeSlug: row.equipment_type_slug,
    }));
  } catch (error) {
    console.error('Unable to load published machine identity matches:', error);
    return [];
  }
}

export async function checkPartFitment(
  partInput: string,
  modelInput: string,
  serialInput?: string,
  manufacturerSlugInput?: string,
  machineIdInput?: number,
): Promise<FitmentCheckResult> {
  const part = normalizePart(partInput);
  const model = normalizeModel(modelInput);
  const manufacturerSlug = (manufacturerSlugInput || '').trim().toLowerCase();
  const requestedMachineId = Number.isSafeInteger(machineIdInput) && Number(machineIdInput) > 0
    ? Number(machineIdInput)
    : null;
  if (!part) return { status: 'part-not-found', message: 'Enter a part number.' };
  if (!model) return { status: 'machine-not-found', message: 'Enter a machine model.' };

  const db = await getDbReady();
  const manufacturerFilter = manufacturerSlug ? 'AND pmf.slug=?' : '';
  const partParams = manufacturerSlug ? [part, manufacturerSlug] : [part];
  const [partRows] = await db.query<PartLookupRow[]>(`
    SELECT
      p.id,
      p.part_number,
      p.name AS part_name,
      pmf.name AS manufacturer_name,
      pmf.slug AS manufacturer_slug
    FROM parts p
    LEFT JOIN manufacturers pmf ON pmf.id=p.manufacturer_id
    WHERE p.normalized_part_number=?
      AND p.data_status IN ('partial','verified')
      ${manufacturerFilter}
    ORDER BY p.id
    LIMIT 2
  `, partParams);

  if (!partRows[0]) {
    return {
      status: 'part-not-found',
      message: manufacturerSlug
        ? `Part ${partInput} is not published for the selected manufacturer.`
        : `Part ${partInput} is not in the published source-backed catalog yet.`,
    };
  }

  if (!manufacturerSlug && partRows.length > 1) {
    return {
      status: 'part-ambiguous',
      message: `Part number ${partInput} exists for more than one published manufacturer. Choose the manufacturer before checking fitment.`,
    };
  }

  const selectedPart = partRows[0];
  const partId = Number(selectedPart.id);
  const machineIdFilter = requestedMachineId ? 'AND m.id=?' : '';
  const machineParams = requestedMachineId
    ? [model, model, requestedMachineId]
    : [model, model];
  const machineLimit = requestedMachineId ? 1 : 2;

  const [machineRows] = await db.query<MachineLookupRow[]>(`
    SELECT
      m.id,
      m.model_name,
      m.slug AS model_slug,
      mf.name AS brand,
      mf.slug AS brand_slug,
      et.name AS equipment_type,
      et.slug AS equipment_type_slug
    FROM machines m
    JOIN manufacturers mf ON mf.id=m.manufacturer_id
    JOIN equipment_types et ON et.id=m.equipment_type_id
    WHERE m.data_status IN ('partial','verified')
      AND (
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(m.model_name,' ',''),'-',''),'/',''),'.',''),'_',''))=?
        OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(m.slug,' ',''),'-',''),'/',''),'.',''),'_',''))=?
      )
      ${machineIdFilter}
    ORDER BY mf.name ASC, et.name ASC, m.model_name ASC, m.id ASC
    LIMIT ${machineLimit}
  `, machineParams);

  if (!machineRows[0]) {
    return {
      status: 'machine-not-found',
      message: requestedMachineId
        ? `The selected machine no longer matches published model ${modelInput}. Choose the machine again.`
        : `Machine model ${modelInput} is not in the published catalog yet.`,
      partNumber: selectedPart.part_number,
      partName: selectedPart.part_name,
      partManufacturerName: selectedPart.manufacturer_name,
      partManufacturerSlug: selectedPart.manufacturer_slug,
    };
  }

  if (!requestedMachineId && machineRows.length > 1) {
    return {
      status: 'machine-ambiguous',
      message: `Machine model ${modelInput} exists in more than one published brand, equipment type or generation. Choose the exact machine before checking fitment.`,
      partNumber: selectedPart.part_number,
      partName: selectedPart.part_name,
      partManufacturerName: selectedPart.manufacturer_name,
      partManufacturerSlug: selectedPart.manufacturer_slug,
    };
  }

  const selectedMachine = machineRows[0];
  const machineId = Number(selectedMachine.id);

  const [rows] = await db.query<FitmentRow[]>(`
    SELECT
      p.part_number,
      p.name AS part_name,
      pmf.name AS part_manufacturer_name,
      pmf.slug AS part_manufacturer_slug,
      mf.name AS brand,
      mf.slug AS brand_slug,
      m.model_name AS model,
      m.slug AS model_slug,
      et.name AS equipment_type,
      et.slug AS equipment_type_slug,
      mp.fitment_confidence,
      mp.fitment_note,
      mp.serial_prefix,
      mp.serial_from,
      mp.serial_to,
      mp.configuration_note,
      sr.title AS source_title,
      sr.url AS source_url
    FROM machine_parts mp
    JOIN parts p ON p.id=mp.part_id
      AND p.data_status IN ('partial','verified')
    LEFT JOIN manufacturers pmf ON pmf.id=p.manufacturer_id
    JOIN machines m ON m.id=mp.machine_id
      AND m.data_status IN ('partial','verified')
    JOIN manufacturers mf ON mf.id=m.manufacturer_id
    JOIN equipment_types et ON et.id=m.equipment_type_id
    LEFT JOIN source_records sr ON sr.id=mp.source_record_id
    WHERE p.id=? AND m.id=?
    ORDER BY (mp.serial_prefix IS NOT NULL OR mp.serial_from IS NOT NULL OR mp.serial_to IS NOT NULL) DESC,
             CASE WHEN mp.fitment_confidence='official' THEN 0 WHEN mp.fitment_confidence='high' THEN 1 WHEN mp.fitment_confidence='medium' THEN 2 ELSE 3 END,
             mp.id ASC
  `, [partId, machineId]);

  if (rows.length === 0) {
    return {
      status: 'no-fitment',
      message: `No documented direct fitment is recorded for ${selectedPart.part_number} on ${selectedMachine.brand} ${selectedMachine.model_name}. This is not proof that the part does not fit.`,
      partNumber: selectedPart.part_number,
      partName: selectedPart.part_name,
      partManufacturerName: selectedPart.manufacturer_name,
      partManufacturerSlug: selectedPart.manufacturer_slug,
      ...machineBase(selectedMachine),
    };
  }

  const constrainedRows = rows.filter(hasSerialRule);
  const unconstrainedRows = rows.filter((row) => !hasSerialRule(row));
  const representative = constrainedRows[0] || unconstrainedRows[0] || rows[0];

  if (!serialInput?.trim()) {
    return constrainedRows.length > 0
      ? { status: 'fitment-known', message: `Documented model fitment found with ${constrainedRows.length} source-backed serial-range rule${constrainedRows.length === 1 ? '' : 's'}. Enter the serial number to test all applicable ranges.`, ...resultBase(representative) }
      : { status: 'fitment-known', message: 'Documented model fitment found. No structured serial-number restriction is recorded for this relationship.', ...resultBase(representative) };
  }

  const serial = normalizeSerial(serialInput);
  if (!serial) return { status: 'invalid-serial', message: 'Enter a serial number in the documented format.', ...resultBase(representative) };

  const prefixes = new Set(constrainedRows.map((row) => row.serial_prefix).filter((value): value is string => Boolean(value)));
  if (/^\d+$/.test(serial) && prefixes.size > 1) {
    return {
      status: 'invalid-serial',
      message: `This part/model has multiple documented PIN generations (${Array.from(prefixes).join(', ')}). Enter the full machine PIN or include its prefix so the generation can be identified safely.`,
      ...resultBase(representative),
    };
  }

  let hadParseableRule = false;
  for (const row of constrainedRows) {
    const match = serialMatchesRow(serial, row);
    if (match === 'fits') {
      return { status: 'fits', message: 'The entered serial is inside a documented source-backed fitment range for this part and model.', ...resultBase(row) };
    }
    if (match !== 'unparseable') hadParseableRule = true;
  }

  if (unconstrainedRows.length > 0) {
    return {
      status: 'serial-unverified',
      message: 'A documented model fitment exists without a serial-specific rule. The entered serial is not inside any structured range currently stored, but incompatibility cannot be asserted from the available source data.',
      ...resultBase(unconstrainedRows[0]),
    };
  }

  if (constrainedRows.length > 0 && hadParseableRule) {
    return { status: 'outside-range', message: 'The entered serial is outside all documented serial ranges currently stored for this part and model.', ...resultBase(constrainedRows[0]) };
  }

  if (constrainedRows.length > 0) {
    const hasPrefixlessRule = constrainedRows.some((row) => !row.serial_prefix);
    return {
      status: 'invalid-serial',
      message: hasPrefixlessRule
        ? 'The source provides a numeric-only serial rule for at least one fitment. Enter the numeric serial portion, or enter the full PIN when a documented prefix is available.'
        : 'The entered serial could not be compared with the documented PIN format for this fitment.',
      ...resultBase(constrainedRows[0]),
    };
  }

  return { status: 'serial-unverified', message: 'Documented model fitment found, but the available source does not provide a structured serial-number rule.', ...resultBase(rows[0]) };
}
