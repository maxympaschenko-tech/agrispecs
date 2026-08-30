import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  station: 'ROPS' | 'Cab';
  grossHp: number;
  ptoHp: number;
  transmission: string;
  speeds: string;
  control: string;
  steeringPumpGpm: number | null;
  totalFlowGpm: number | null;
  fuelL: number;
  lengthIn: number;
  wheelbaseIn: number;
  heightIn: number;
  weightLb: number;
  agTires: string;
};

const VERSION = 'united-states-current-2026-08';

const models: Seed[] = [
  {
    slug: 'mt335h',
    name: 'MT335H',
    url: 'https://lstractorusa.com/tractor/mt335h/',
    station: 'ROPS',
    grossHp: 35,
    ptoHp: 28,
    transmission: 'Synchro Shuttle/HST (current official page wording; exact split unresolved)',
    speeds: '12F / 12R (current official page wording)',
    control: 'Position',
    steeringPumpGpm: null,
    totalFlowGpm: null,
    fuelL: 40.1,
    lengthIn: 124.3,
    wheelbaseIn: 66,
    heightIn: 93,
    weightLb: 3285,
    agTires: '9.5-16 / 14.9-24',
  },
  {
    slug: 'mt340hc',
    name: 'MT340HC',
    url: 'https://lstractorusa.com/tractor/mt340hc/',
    station: 'Cab',
    grossHp: 40,
    ptoHp: 32,
    transmission: 'HST',
    speeds: '3 ranges',
    control: 'Position / Draft',
    steeringPumpGpm: 5.5,
    totalFlowGpm: 13.7,
    fuelL: 46.9,
    lengthIn: 128.3,
    wheelbaseIn: 69,
    heightIn: 86.6,
    weightLb: 3661,
    agTires: '7-14 / 11.2-24',
  },
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
  ['Dimensions & Weight', 'dimensions.overall_height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight without ballast', 'decimal', 'lb', 70],
  ['Tires', 'tires.ag', 'Ag tires front / rear', 'text', null, 10],
  ['Tires', 'tires.industrial', 'Industrial tires front / rear', 'text', null, 20],
  ['Tires', 'tires.turf', 'Turf tires front / rear', 'text', null, 30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor low-hp MT3 migration dependency missing');
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

export const lsTractorMt3LowHpCurrentUsMigration: DbMigration = {
  id: '20260830_379_ls_tractor_mt3_low_hp_current_us',
  description: 'Add current US LS Tractor MT335H and MT340HC while preserving unresolved MT335H transmission wording',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt3-series' LIMIT 1`, [manufacturerId]);

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
        normalization: { displacement: '114.7 cu in stored as 1.88 L', fuelTank: `${m.station === 'Cab' ? '12.4' : '10.6'} US gal stored as ${m.fuelL} L` },
        sourceQuality: m.slug === 'mt335h'
          ? 'The current MT335H page simultaneously labels the model H, publishes Transmission Type “Synchro Shuttle/HST”, publishes a 12F/12R speed row, and lists alternate steering/total-flow values for HST. To avoid inventing an exact configuration, the page wording is retained verbatim-like for transmission/speeds and ambiguous steering/total-flow numeric specs are intentionally omitted.'
          : 'Current model page is internally specific for the MT340HC HST cab configuration.',
        attachmentConflict: 'Current MT335H/MT340HC model pages list LL3116, while the current central front-loader catalog lists LL3106 for MT335H/MT340 and lists LL3116 for older MT235E/MT240E applications. Loader fitment is therefore deferred rather than silently choosing one source.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US LS Tractor MT3 compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA low-horsepower MT3 configuration; source ambiguities are preserved instead of inferred.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${m.station}; ${m.transmission}; ${m.speeds}`, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', m.station, null],
        ['engine.type', m.slug === 'mt335h' ? '3-cylinder, CRDI, water-cooled turbo diesel' : 'Vertical water-cooled 4-cycle diesel engine', null],
        ['engine.model', 'L3C19-T', null],
        ['emissions.standard', 'Tier 4', null],
        ['engine.displacement', 1.88, 'L'],
        ['engine.gross_power', m.grossHp, 'hp'],
        ['engine.rated_speed', 2600, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', m.speeds, null],
        ['brakes.type', 'Wet, multi-disc', null],
        ['steering.type', 'Hydrostatic power steering', null],
        ['pto.rated_power', m.ptoHp, 'hp'],
        ['pto.type', 'Independent', null],
        ['pto.rear_description', '540 rpm standard; 2,000 rpm mid PTO field option', null],
        ['hydraulics.control_system', m.control, null],
        ['hydraulics.main_pump_capacity', 8.2, 'gpm'],
        ['hitch.category', 'Category I', null],
        ['hitch.lift_capacity', 1808, 'lb'],
        ['hydraulics.remote_valves', '2 pairs front; 2 pairs rear/remote (detent, standard)', null],
        ['capacities.fuel_tank', m.fuelL, 'L'],
        ['dimensions.overall_length', m.lengthIn, 'in'],
        ['dimensions.overall_height', m.heightIn, 'in'],
        ['dimensions.wheelbase', m.wheelbaseIn, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
        ['tires.ag', m.agTires, null],
        ['tires.industrial', '25 x 8.5-14 / 43 x 16-20', null],
        ['tires.turf', '25 x 8.5-14 / 41 x 14-20', null],
      ];
      if (m.steeringPumpGpm !== null) values.push(['hydraulics.power_steering_pump_capacity', m.steeringPumpGpm, 'gpm']);
      if (m.totalFlowGpm !== null) values.push(['hydraulics.total_flow', m.totalFlowGpm, 'gpm']);

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor low-hp MT3 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
