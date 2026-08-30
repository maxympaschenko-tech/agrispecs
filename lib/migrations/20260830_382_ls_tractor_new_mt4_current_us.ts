import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  grossHp: number;
  ptoHp: number;
  station: 'ROPS' | 'Cab';
  transmission: string;
  lengthIn: number;
  heightIn: number;
  weightLb: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/new-mt4/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT4_Update_v7.pdf';

const models: Seed[] = [
  { slug: 'mt463', name: 'MT463', url: 'https://lstractorusa.com/tractor/new-mt463/', grossHp: 63, ptoHp: 54.1, station: 'ROPS', transmission: 'Synchro Shuttle', lengthIn: 135, heightIn: 113.9, weightLb: 5313 },
  { slug: 'mt463ps', name: 'MT463PS', url: 'https://lstractorusa.com/tractor/new-mt463ps/', grossHp: 63, ptoHp: 54.1, station: 'ROPS', transmission: 'Electro Power Shuttle', lengthIn: 140, heightIn: 113.9, weightLb: 5423 },
  { slug: 'mt463c', name: 'MT463C', url: 'https://lstractorusa.com/tractor/new-mt463c/', grossHp: 63, ptoHp: 54.1, station: 'Cab', transmission: 'Synchro Shuttle', lengthIn: 135, heightIn: 105.4, weightLb: 5776 },
  { slug: 'mt463cps', name: 'MT463CPS', url: 'https://lstractorusa.com/tractor/new-mt463cps/', grossHp: 63, ptoHp: 54.1, station: 'Cab', transmission: 'Electro Power Shuttle', lengthIn: 135, heightIn: 105.4, weightLb: 5776 },
  { slug: 'mt473', name: 'MT473', url: 'https://lstractorusa.com/tractor/new-mt473/', grossHp: 73, ptoHp: 62.9, station: 'ROPS', transmission: 'Synchro Shuttle', lengthIn: 135, heightIn: 113.9, weightLb: 5423 },
  { slug: 'mt473ps', name: 'MT473PS', url: 'https://lstractorusa.com/tractor/new-mt473ps/', grossHp: 73, ptoHp: 62.9, station: 'ROPS', transmission: 'Electro Power Shuttle', lengthIn: 135, heightIn: 113.9, weightLb: 5423 },
  { slug: 'mt473c', name: 'MT473C', url: 'https://lstractorusa.com/tractor/new-mt473c/', grossHp: 73, ptoHp: 62.9, station: 'Cab', transmission: 'Synchro Shuttle', lengthIn: 135, heightIn: 105.4, weightLb: 5886 },
  { slug: 'mt473cps', name: 'MT473CPS', url: 'https://lstractorusa.com/tractor/new-mt473cps/', grossHp: 73, ptoHp: 62.9, station: 'Cab', transmission: 'Power Shuttle', lengthIn: 135, heightIn: 105.4, weightLb: 5886 },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.type', 'Engine type', 'text', null, 2],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 3],
  ['Engine', 'emissions.standard', 'Emissions standard', 'text', null, 4],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 8],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 9],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speeds / ranges', 'text', null, 20],
  ['Transmission', 'brakes.type', 'Brakes', 'text', null, 30],
  ['Transmission', 'steering.type', 'Steering', 'text', null, 40],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['PTO', 'pto.type', 'PTO type', 'text', null, 15],
  ['PTO', 'pto.rear_description', 'Rear PTO', 'text', null, 20],
  ['Hydraulics', 'hydraulics.control_system', 'Hydraulic control system', 'text', null, 5],
  ['Hydraulics', 'hydraulics.main_pump_capacity', 'Implement hydraulic pump capacity', 'decimal', 'gpm', 10],
  ['Hydraulics', 'hydraulics.power_steering_pump_capacity', 'Power-steering pump capacity', 'decimal', 'gpm', 20],
  ['Hydraulics', 'hydraulics.total_flow', 'Total hydraulic flow', 'decimal', 'gpm', 30],
  ['Hydraulics', 'hitch.category', '3-point hitch category', 'text', null, 40],
  ['Hydraulics', 'hitch.lift_capacity', '3-point hitch lift capacity', 'decimal', 'lb', 50],
  ['Hydraulics', 'hydraulics.remote_valves', 'Remote valves', 'text', null, 60],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width with tires', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight without ballast', 'decimal', 'lb', 70],
  ['Tires', 'tires.ag', 'Ag tires front / rear', 'text', null, 10],
  ['Tires', 'tires.industrial', 'Industrial tires front / rear', 'text', null, 20],
  ['Tires', 'tires.large_ag', 'Large Ag tires front / rear', 'text', null, 30],
  ['Tires', 'tires.r14', 'R14 tires front / rear', 'text', null, 40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor New MT4 migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const lsTractorNewMt4CurrentUsMigration: DbMigration = {
  id: '20260830_382_ls_tractor_new_mt4_current_us',
  description: 'Add the eight current US New MT4 configurations (63-73 hp) from current LS Tractor model pages and brochure',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS New MT4 Series','ls-new-mt4-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-new-mt4-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-new-mt4-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current New MT4 lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentModels: models.map((m) => m.name),
      excludedPreviousGeneration: ['MT458', 'MT458C', 'MT468', 'MT468C', 'MT468CPS'],
      generationPolicy: 'LS Tractor USA exposes separate Previous MT4 and New MT4 toggles. Current machine records here represent only the New MT4 side of that official selector.',
    });

    await ensureSource(c, sourceId, 'ls-tractor-new-mt4-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor current MT4 brochure', {
      market: 'United States',
      captured: '2026-08-30',
      brochureModels: models.map((m) => m.name),
      sharedSpecs: { engine: 'L4C25-T', ratedRpm: 2500, displacementCuIn: 152.85, fuelGal: 24.3, implementPumpGpm: 14.5, steeringPumpGpm: 6.6, totalFlowGpm: 21.1, hitchCategory: 'II', hitchLiftAt610mmLb: 3483 },
      loader: 'LL5001',
      sourceConflict: 'The current brochure extraction collapses some per-column dimensions/weights and states 140 in overall length as a shared value, while current individual model pages publish model-specific values (mostly 135 in; MT463PS 140 in) and specific weights. Variant dimensions and weights therefore follow each current individual model page; the brochure remains the shared-spec cross-check.',
      transmissionWording: 'Current MT473CPS page says Power Shuttle while the brochure matrix uses Electro Power Shuttle/Power Shuttle wording across PS configurations. The model-specific page wording is retained for MT473CPS.',
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `ls-tractor-${m.slug}-current-us-2026-08`, m.url, `LS Tractor ${m.name} current US model page`, {
        market: 'United States',
        captured: '2026-08-30',
        model: m.name,
        generation: 'New MT4',
        role: 'Primary source for current variant transmission, station, dimensions and weight; current MT4 brochure cross-checks shared specifications.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US LS Tractor New MT4 utility tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA New MT4 configuration; model-specific current page is primary for variant fields.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${m.station}; ${m.transmission}; F16 x R16`, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', m.station, null],
        ['engine.type', 'Vertical water-cooled 4-cycle diesel engine', null],
        ['engine.model', 'L4C25-T', null],
        ['emissions.standard', 'Tier 4', null],
        ['engine.displacement', 2.505, 'L'],
        ['engine.gross_power', m.grossHp, 'hp'],
        ['engine.rated_speed', 2500, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', 'F16 x R16', null],
        ['brakes.type', 'Wet, multi-disc', null],
        ['steering.type', 'Hydrostatic power steering', null],
        ['pto.rated_power', m.ptoHp, 'hp'],
        ['pto.type', 'Independent', null],
        ['pto.rear_description', '540 / 540E rpm standard', null],
        ['hydraulics.control_system', 'Position / Draft', null],
        ['hydraulics.main_pump_capacity', 14.5, 'gpm'],
        ['hydraulics.power_steering_pump_capacity', 6.6, 'gpm'],
        ['hydraulics.total_flow', 21.1, 'gpm'],
        ['hitch.category', 'Category II', null],
        ['hitch.lift_capacity', 3483, 'lb'],
        ['hydraulics.remote_valves', '2 pairs front; 2 pairs rear', null],
        ['capacities.fuel_tank', 92, 'L'],
        ['dimensions.overall_length', m.lengthIn, 'in'],
        ['dimensions.overall_width', 72.6, 'in'],
        ['dimensions.overall_height', m.heightIn, 'in'],
        ['dimensions.wheelbase', 83.1, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
        ['tires.ag', '9.5-24 / 16.9-28', null],
        ['tires.industrial', '10.5/80x18 10PR / 19.5Lx24 8PR', null],
        ['tires.large_ag', '11.2-24 / 16.9-30', null],
        ['tires.r14', '320/85R20 119D / 420/75R34 142D', null],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor New MT4 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
