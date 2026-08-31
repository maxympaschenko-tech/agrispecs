import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl?: string;
  applicationTiming?: string;
  workingWidth?: string;
  applicatorStyle?: string;
  modelNote: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/fertilizer-applicators';
const models: Seed[] = [
  {
    slug: 'nutri-placer-920',
    model: 'Nutri-Placer 920',
    modelNote: 'Current US family page confirms the Nutri-Placer 920 and its X-wing folding design. Model-specific tank capacities from non-US market pages are intentionally not copied into this US record.',
  },
  {
    slug: 'nutri-placer-930',
    model: 'Nutri-Placer 930',
    sourceUrl: `${FAMILY_URL}/nutri-placer-930`,
    applicationTiming: 'Preplant',
    workingWidth: '32.5 - 47.5 ft (9.9 - 14.48 m)',
    applicatorStyle: 'Shank style or High-Speed Low Disturbance (HSLD) coulter',
    modelNote: 'Current Case IH US Nutri-Placer 930 product page captured 2026-08-31.',
  },
  {
    slug: 'nutri-placer-940',
    model: 'Nutri-Placer 940',
    sourceUrl: `${FAMILY_URL}/nutri-placer-940`,
    applicationTiming: 'Preplant',
    workingWidth: '50 - 65 ft (15.2 - 19.8 m)',
    applicatorStyle: 'Shank style or High-Speed Low Disturbance (HSLD) coulter',
    modelNote: 'Current Case IH US Nutri-Placer 940 product page captured 2026-08-31.',
  },
  {
    slug: 'nutri-placer-2800',
    model: 'Nutri-Placer 2800',
    workingWidth: '17.5 - 37.5 ft',
    modelNote: 'Current US family page confirms the Nutri-Placer 2800 and its 17.5-to-37.5-ft published working-width range. Model-specific tank capacities from non-US market pages are intentionally not copied into this US record.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Nutrient Application System', 'fertilizer.application_timing', 'Application timing', 'text', null, 10],
  ['Nutrient Application System', 'fertilizer.working_width', 'Working width', 'text', null, 20],
  ['Nutrient Application System', 'fertilizer.applicator_style', 'Applicator style', 'text', null, 30],
  ['Nutrient Application System', 'fertilizer.row_unit_options', 'Family row-unit options', 'text', null, 40],
  ['Nutrient Application System', 'fertilizer.depth_control', 'Depth control', 'text', null, 50],
  ['Dimensions & Transport', 'fertilizer.fold_modes', 'Published fold modes', 'text', null, 10],
  ['Dimensions & Transport', 'fertilizer.rear_hitch_capacity', 'Optional rear hitch towing capacity', 'text', null, 20],
  ['Precision Technology', 'fertilizer.precision_system', 'Precision nutrient-management features', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Nutri-Placer migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function ensureRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string,
) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,NULL,NULL,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, value, sourceRecordId],
  );
}

export const caseIhNutriPlacerFertilizerApplicatorsCurrentMigration: DbMigration = {
  id: '20260831_533_case_ih_nutri_placer_fertilizer_applicators_current',
  description: 'Add current Case IH US Nutri-Placer 920, 930, 940 and 2800 fertilizer applicators',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Fertilizer Applicator','fertilizer-applicator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='fertilizer-applicator' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const familyRecordId = await ensureRecord(
      connection,
      sourceId,
      'case-ih-nutri-placer-family-us-current-2026-08',
      FAMILY_URL,
      'Case IH Nutri-Placer current US fertilizer applicator family specifications',
      {
        captured: '2026-08-31',
        market: 'United States',
        equipmentType: 'Fertilizer Applicator',
        models: models.map((model) => model.model),
        familyFeatures: {
          rowUnitOptions: ['High-Clearance Shank', 'Heavy-Duty Spring', 'High-Speed Low Disturbance'],
          depthControl: 'Single-point and hydraulic depth control are described for the family',
          foldModes: 'Single-, double-, or triple-fold transport modes depending configuration',
          optionalRearHitch: '25,000 lb constant-level rear hitch towing capacity',
          precision: 'Case IH precision technology with prescription mapping, data management, and AccuGuide sub-inch repeatability',
        },
      },
    );

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'Nutri-Placer Fertilizer Applicators','nutri-placer-fertilizer-applicators')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(
      connection,
      `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='nutri-placer-fertilizer-applicators' LIMIT 1`,
      [manufacturerId, equipmentTypeId],
    );

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Nutri-Placer spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const modelRecordId = model.sourceUrl
        ? await ensureRecord(
            connection,
            sourceId,
            `case-ih-${model.slug}-fertilizer-applicator-us-current-2026-08`,
            model.sourceUrl,
            `Case IH ${model.model} current US fertilizer applicator specifications`,
            {
              captured: '2026-08-31', market: 'United States', equipmentType: 'Fertilizer Applicator',
              model: model.model, applicationTiming: model.applicationTiming, workingWidth: model.workingWidth,
              applicatorStyle: model.applicatorStyle, familySource: FAMILY_URL,
            },
          )
        : familyRecordId;

      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States Nutri-Placer fertilizer applicator lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Nutri-Placer fertilizer applicator specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, modelRecordId, model.modelNote],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), familyRecordId, 'Pull-type fertilizer applicator');
      await put(connection, machineId, versionId, def('configuration.market_scope'), familyRecordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('fertilizer.row_unit_options'), familyRecordId, 'High-Clearance Shank; Heavy-Duty Spring; High-Speed Low Disturbance row-unit options published for the family');
      await put(connection, machineId, versionId, def('fertilizer.depth_control'), familyRecordId, 'Single-point and hydraulic depth-control systems published for the family');
      await put(connection, machineId, versionId, def('fertilizer.fold_modes'), familyRecordId, 'Single-, double-, or triple-fold transport modes depending configuration');
      await put(connection, machineId, versionId, def('fertilizer.rear_hitch_capacity'), familyRecordId, 'Optional constant-level rear hitch: 25,000 lb towing capacity');
      await put(connection, machineId, versionId, def('fertilizer.precision_system'), familyRecordId, 'Prescription mapping, fertilizer data management, and AccuGuide guidance are described for the Nutri-Placer family');

      if (model.applicationTiming) await put(connection, machineId, versionId, def('fertilizer.application_timing'), modelRecordId, model.applicationTiming);
      if (model.workingWidth) await put(connection, machineId, versionId, def('fertilizer.working_width'), modelRecordId, model.workingWidth);
      if (model.applicatorStyle) await put(connection, machineId, versionId, def('fertilizer.applicator_style'), modelRecordId, model.applicatorStyle);
    }
  },
};
