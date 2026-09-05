import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Model = {
  slug: 't6-145' | 't6-155' | 't6-160' | 't6-175' | 't6-180';
  model: string;
  cylinders: number;
  displacementL: number;
  maxBoostedHp: number;
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const BROCHURE_URL = 'https://cnhi-p-001-delivery.sitecorecontenthub.cloud/api/public/content/1863181669f2438a9ce80b017d23079c?v=c0e8ad9c';
const BROCHURE_EXTERNAL_ID = 'new-holland-t6-current-us-brochure-spec-table-2026-09';
const CURRENT_PAGE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t6-series';
const CURRENT_PAGE_EXTERNAL_ID = 'new-holland-t6-current-us-gvw-2026-09';

const models: Model[] = [
  { slug: 't6-145', model: 'T6.145', cylinders: 4, displacementL: 4.5, maxBoostedHp: 145 },
  { slug: 't6-155', model: 'T6.155', cylinders: 4, displacementL: 4.5, maxBoostedHp: 155 },
  { slug: 't6-160', model: 'T6.160', cylinders: 6, displacementL: 6.7, maxBoostedHp: 165 },
  { slug: 't6-175', model: 'T6.175', cylinders: 4, displacementL: 4.5, maxBoostedHp: 175 },
  { slug: 't6-180', model: 'T6.180', cylinders: 6, displacementL: 6.7, maxBoostedHp: 175 },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing current T6 enrichment dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,'manufacturer','official')`,
    [name, domain],
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function ensureDefinition(
  connection: Parameters<DbMigration['apply']>[0],
  section: string,
  specKey: string,
  label: string,
  valueType: 'text' | 'integer' | 'decimal',
  canonicalUnit: string | null,
  displayOrder: number,
) {
  await connection.query(
    `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    [section, specKey, label, valueType, canonicalUnit, displayOrder],
  );
  return selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [specKey]);
}

export const newHollandT6CurrentEnrichmentMigration: DbMigration = {
  id: '20260905_644_new_holland_t6_current_enrichment',
  description: 'Enrich current US T6.145/T6.155/T6.160/T6.175/T6.180 engine, electrical, dimension and fuel/DEF capacity data from official New Holland sources',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    const brochureSourceId = await ensureSource(
      connection,
      'New Holland CNH Content Hub',
      'cnhi-p-001-delivery.sitecorecontenthub.cloud',
    );
    const currentPageSourceId = await ensureSource(
      connection,
      'New Holland Agriculture',
      'agriculture.newholland.com',
    );

    const brochureSourceRecordId = await ensureSourceRecord(
      connection,
      brochureSourceId,
      BROCHURE_EXTERNAL_ID,
      BROCHURE_URL,
      'New Holland T6 Series North America brochure - specifications table',
      {
        role: 'Official New Holland/CNH detailed T6 technical specification evidence',
        linkedFrom: CURRENT_PAGE_URL,
        currentModelsUsed: models.map((item) => item.model),
        excludedBrochureModel: 'T6.165',
        sharedValues: {
          engineMakeModel: 'Fiat Powertrain Technology (FPT) NEF',
          valvesPerCylinder: 4,
          ratedEngineSpeedRpm: 2100,
          aspiration: 'Turbo charger with air-to-air intercooler',
          dieselTankStandard: '52.2 US gal (197.2 L)',
          dieselTankWithAuxiliary: '58.6 US gal (222 L) total',
          defTank: '10.4 US gal (39.5 L)',
          alternator: '150 Amp standard; 200 Amp optional',
          battery: '1300 CCA',
          standardWheelbase: '104 in (2642 mm)',
        },
        modelValues: models.map((item) => ({
          model: item.model,
          cylinders: item.cylinders,
          displacementL: item.displacementL,
          maxBoostedHp: item.maxBoostedHp,
        })),
        guardrails: [
          'T6.165 appears in the brochure table but is not inserted because the current New Holland North America Available Models section does not list it.',
          'The brochure is internally inconsistent on service interval: the engine narrative states 750 engine hours / 1500 driveline hours while the specification table states 600 engine hours. No service interval is inserted by this migration.',
          'Maximum gross vehicle weight is sourced from the live current New Holland North America page rather than the brochure table because the live page publishes a newer 23,100 lb figure.',
        ],
      },
    );

    const currentPageSourceRecordId = await ensureSourceRecord(
      connection,
      currentPageSourceId,
      CURRENT_PAGE_EXTERNAL_ID,
      CURRENT_PAGE_URL,
      'New Holland North America current T6 Series - current models and maximum gross vehicle weight',
      {
        role: 'Live current North American model-scope and GVW evidence',
        currentModels: models.map((item) => item.model),
        maximumGrossVehicleWeightLb: 23100,
        evidence: 'The live T6 Series page states an overall maximum gross vehicle weight of 23,100 pounds on all models.',
        guardrail: 'This live current page is used for GVW and current model scope. It does not resolve the separate service-interval conflict inside the linked brochure.',
      },
    );

    const definitions = {
      make: await ensureDefinition(connection, 'Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1),
      model: await ensureDefinition(connection, 'Engine', 'engine.model', 'Engine family', 'text', null, 2),
      cylinders: await ensureDefinition(connection, 'Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 4),
      displacement: await ensureDefinition(connection, 'Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20),
      valvesPerCylinder: await ensureDefinition(connection, 'Engine', 'engine.valves_per_cylinder', 'Valves per cylinder', 'integer', null, 25),
      ratedSpeed: await ensureDefinition(connection, 'Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30),
      aspiration: await ensureDefinition(connection, 'Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40),
      maxBoostedPower: await ensureDefinition(connection, 'Engine', 'engine.max_boosted_power', 'Maximum boosted engine power', 'decimal', 'hp', 12),
      alternator: await ensureDefinition(connection, 'Electrical', 'electrical.alternator', 'Alternator', 'text', null, 10),
      batteryCca: await ensureDefinition(connection, 'Electrical', 'electrical.battery_cca', 'Battery cold-cranking amps', 'integer', 'CCA', 20),
      wheelbase: await ensureDefinition(connection, 'Dimensions & Weight', 'dimensions.wheelbase', 'Standard 4WD wheelbase', 'decimal', 'in', 30),
      maxGvw: await ensureDefinition(connection, 'Dimensions & Weight', 'weight.maximum_gross_vehicle_weight', 'Maximum gross vehicle weight', 'decimal', 'lb', 60),
    };

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      const brochureSpecs: Array<[number, string | null, number | null, string | null]> = [
        [definitions.make, 'FPT', null, null],
        [definitions.model, 'NEF', null, null],
        [definitions.cylinders, null, model.cylinders, null],
        [definitions.displacement, null, model.displacementL, 'L'],
        [definitions.valvesPerCylinder, null, 4, null],
        [definitions.ratedSpeed, null, 2100, 'rpm'],
        [definitions.aspiration, 'Turbocharged with air-to-air intercooler', null, null],
        [definitions.maxBoostedPower, null, model.maxBoostedHp, 'hp'],
        [definitions.alternator, '150 A standard; 200 A optional', null, null],
        [definitions.batteryCca, null, 1300, 'CCA'],
        [definitions.wheelbase, null, 104, 'in'],
      ];

      for (const [definitionId, valueText, valueNumber, unit] of brochureSpecs) {
        await connection.query(
          `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
           VALUES (?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, versionId, definitionId, valueText, valueNumber, unit, brochureSourceRecordId],
        );
      }

      await connection.query(
        `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
         VALUES (?,?,?,NULL,23100,'lb',?,'official')
         ON DUPLICATE KEY UPDATE value_text=NULL,value_number=23100,unit='lb',source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, versionId, definitions.maxGvw, currentPageSourceRecordId],
      );

      const capacities = [
        {
          key: 'fuel-tank-standard',
          label: 'Fuel tank',
          configuration: 'Standard diesel tank',
          value: 197.2,
          unit: 'L',
          notes: '52.2 US gal standard diesel tank.',
        },
        {
          key: 'fuel-tank-auxiliary-total',
          label: 'Fuel tank',
          configuration: 'With auxiliary diesel tank',
          value: 222,
          unit: 'L',
          notes: '58.6 US gal total diesel capacity with auxiliary tank.',
        },
        {
          key: 'def-tank',
          label: 'DEF / AdBlue tank',
          configuration: 'Stage V diesel tractor',
          value: 39.5,
          unit: 'L',
          notes: '10.4 US gal DEF / AdBlue capacity.',
        },
      ] as const;

      for (const capacity of capacities) {
        await connection.query(
          `INSERT INTO machine_capacities (
            machine_id,machine_version_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,NULL,?,?,'official')
          ON DUPLICATE KEY UPDATE
            machine_version_id=VALUES(machine_version_id),label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),
            fluid_name=NULL,notes=VALUES(notes),confidence='official'`,
          [
            machineId,
            versionId,
            capacity.key,
            capacity.label,
            capacity.configuration,
            capacity.value,
            capacity.unit,
            capacity.notes,
            brochureSourceRecordId,
          ],
        );
      }
    }
  },
};
