import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  group: '342' | '347' | '352' | '357';
  grossHp: number;
  ptoHp: number;
  station: 'ROPS' | 'Cab';
  transmission: string;
  speeds: string;
  steeringPumpGpm: number;
  totalFlowGpm: number;
  fuelL: number;
  weightLb: number;
  heightIn: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/MT3/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3_Update_v5.pdf';

const groupUrls: Record<Seed['group'], string[]> = {
  '342': ['https://lstractorusa.com/tractor/mt342h-hc-c/'],
  '347': ['https://lstractorusa.com/tractor/mt347h-hc-c/'],
  '352': ['https://lstractorusa.com/tractor/mt352pct-pctc/', 'https://lstractorusa.com/tractor/mt352h-hc-c/'],
  '357': ['https://lstractorusa.com/tractor/mt357pct-pctc/', 'https://lstractorusa.com/tractor/mt357h-hc-c/'],
};

const models: Seed[] = [
  { slug: 'mt342', name: 'MT342', group: '342', grossHp: 42, ptoHp: 35.7, station: 'ROPS', transmission: 'Synchro Shuttle', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 40.1, weightLb: 3869, heightIn: 95 },
  { slug: 'mt342c', name: 'MT342C', group: '342', grossHp: 42, ptoHp: 35.7, station: 'Cab', transmission: 'Synchro Shuttle', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 46.9, weightLb: 4380, heightIn: 90 },
  { slug: 'mt342h', name: 'MT342H', group: '342', grossHp: 42, ptoHp: 33.6, station: 'ROPS', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 5.5, totalFlowGpm: 13.7, fuelL: 40.1, weightLb: 3935, heightIn: 95 },
  { slug: 'mt342hc', name: 'MT342HC', group: '342', grossHp: 42, ptoHp: 33.6, station: 'Cab', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 6.8, totalFlowGpm: 15.0, fuelL: 46.9, weightLb: 4446, heightIn: 90 },

  { slug: 'mt347', name: 'MT347', group: '347', grossHp: 47, ptoHp: 39.9, station: 'ROPS', transmission: 'Synchro Shuttle', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 40.1, weightLb: 3869, heightIn: 95 },
  { slug: 'mt347c', name: 'MT347C', group: '347', grossHp: 47, ptoHp: 39.9, station: 'Cab', transmission: 'Synchro Shuttle', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 46.9, weightLb: 4380, heightIn: 90 },
  { slug: 'mt347h', name: 'MT347H', group: '347', grossHp: 47, ptoHp: 37.6, station: 'ROPS', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 5.5, totalFlowGpm: 13.7, fuelL: 40.1, weightLb: 3935, heightIn: 95 },
  { slug: 'mt347hc', name: 'MT347HC', group: '347', grossHp: 47, ptoHp: 37.6, station: 'Cab', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 6.8, totalFlowGpm: 15.0, fuelL: 46.9, weightLb: 4446, heightIn: 90 },

  { slug: 'mt352pct', name: 'MT352PCT', group: '352', grossHp: 52, ptoHp: 44.2, station: 'ROPS', transmission: 'Synchro Shuttle / Powerclutch', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 40.1, weightLb: 3869, heightIn: 95 },
  { slug: 'mt352pctc', name: 'MT352PCTC', group: '352', grossHp: 52, ptoHp: 44.2, station: 'Cab', transmission: 'Synchro Shuttle / Powerclutch', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 46.9, weightLb: 4380, heightIn: 90 },
  { slug: 'mt352h', name: 'MT352H', group: '352', grossHp: 52, ptoHp: 41.6, station: 'ROPS', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 5.5, totalFlowGpm: 13.7, fuelL: 40.1, weightLb: 3935, heightIn: 95 },
  { slug: 'mt352hc', name: 'MT352HC', group: '352', grossHp: 52, ptoHp: 41.6, station: 'Cab', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 6.8, totalFlowGpm: 15.0, fuelL: 46.9, weightLb: 4446, heightIn: 90 },

  { slug: 'mt357pct', name: 'MT357PCT', group: '357', grossHp: 57, ptoHp: 48.4, station: 'ROPS', transmission: 'Synchro Shuttle / Powerclutch', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 40.1, weightLb: 3869, heightIn: 95 },
  { slug: 'mt357pctc', name: 'MT357PCTC', group: '357', grossHp: 57, ptoHp: 48.4, station: 'Cab', transmission: 'Synchro Shuttle / Powerclutch', speeds: 'F16 x R16', steeringPumpGpm: 4.1, totalFlowGpm: 12.3, fuelL: 46.9, weightLb: 4380, heightIn: 90 },
  { slug: 'mt357h', name: 'MT357H', group: '357', grossHp: 57, ptoHp: 45.6, station: 'ROPS', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 5.5, totalFlowGpm: 13.7, fuelL: 40.1, weightLb: 3935, heightIn: 95 },
  { slug: 'mt357hc', name: 'MT357HC', group: '357', grossHp: 57, ptoHp: 45.6, station: 'Cab', transmission: 'HST', speeds: '3 ranges', steeringPumpGpm: 6.8, totalFlowGpm: 15.0, fuelL: 46.9, weightLb: 4446, heightIn: 90 },
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
  ['Tires', 'tires.turf', 'Turf tires front / rear', 'text', null, 30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT3 migration dependency missing');
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

export const lsTractorMt3CurrentUsMigration: DbMigration = {
  id: '20260830_378_ls_tractor_mt3_current_us',
  description: 'Add sixteen current US LS Tractor MT3 42-57 hp configurations with variant-specific transmission, cab and PTO data',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS MT3 Series','ls-mt3-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt3-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-mt3-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current MT3 Series lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentGroups: ['MT357PCT/PCTC', 'MT357H/HC', 'MT352PCT/PCTC', 'MT352H/HC', 'MT347/H/HC/C', 'MT342/H/HC/C', 'MT340HC', 'MT335H'],
      scopeInThisMigration: 'The current 42-57 hp MT342/347/352/357 architecture covered by the current MT3 brochure. MT340HC and MT335H are intentionally handled separately because the current brochure begins at 42 hp and those models use different dimensions/hydraulic specifications.',
    });

    const brochureSourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-mt3-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor MT3 Series current brochure specifications', {
      market: 'United States',
      captured: '2026-08-30',
      sourceColumns: ['MT342', 'MT342C', 'MT342H', 'MT342HC', 'MT347', 'MT347C', 'MT347H', 'MT347HC', 'MT352', 'MT352C', 'MT352H', 'MT352HC', 'MT357', 'MT357C', 'MT357H', 'MT357HC'],
      currentNameMapping: { MT352: 'MT352PCT', MT352C: 'MT352PCTC', MT357: 'MT357PCT', MT357C: 'MT357PCTC' },
      normalization: {
        displacement: '114.7 cu in stored as 1.88 L',
        fuelRops: '10.6 US gal stored as 40.1 L',
        fuelCab: '12.4 US gal stored as 46.9 L',
      },
      sourceConflict: 'Several current grouped MT3 web pages render the text labels for Hydro/Gear PTO values in the opposite order from the current brochure/model-comparison columns and from expected transmission losses. Variant PTO values in this migration follow the current brochure columns: gear/powerclutch 35.7/39.9/44.2/48.4 hp and HST 33.6/37.6/41.6/45.6 hp.',
      fitmentNote: 'Current grouped model pages identify current Powerclutch names MT352PCT/PCTC and MT357PCT/PCTC; these are mapped to the brochure gear columns MT352/MT352C and MT357/MT357C.',
    });

    const groupSourceIds = new Map<Seed['group'], number>();
    for (const group of Object.keys(groupUrls) as Seed['group'][]) {
      const urls = groupUrls[group];
      const primaryUrl = urls[0];
      const sourceRecordId = await ensureSource(c, sourceId, `ls-tractor-mt3-${group}-current-us-2026-08`, primaryUrl, `LS Tractor current MT3 ${group} model group`, {
        market: 'United States',
        captured: '2026-08-30',
        urls,
        role: 'Confirms current US model names/configurations and current grouped-page specifications; current brochure provides the exact variant weight/PTO matrix.',
      });
      groupSourceIds.set(group, sourceRecordId);
    }

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
      const groupSourceRecordId = groupSourceIds.get(m.group);
      if (!groupSourceRecordId) throw new Error(`Missing LS Tractor MT3 group source ${m.group}`);

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
         VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA MT3 configuration. Current grouped page confirms market naming/configuration; current MT3 brochure supplies the variant-specific PTO, weight and shared dimensional matrix.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${m.station}; ${m.transmission}; ${m.speeds}`, groupSourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', m.station, null],
        ['engine.type', '3-cylinder, liquid-cooled turbo diesel, CRDI', null],
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
        ['pto.rear_description', '540 rpm standard; 2,000 rpm mid PTO optional', null],
        ['hydraulics.control_system', 'Position / Draft', null],
        ['hydraulics.main_pump_capacity', 8.2, 'gpm'],
        ['hydraulics.power_steering_pump_capacity', m.steeringPumpGpm, 'gpm'],
        ['hydraulics.total_flow', m.totalFlowGpm, 'gpm'],
        ['hitch.category', 'Category II', null],
        ['hitch.lift_capacity', 2755, 'lb'],
        ['hydraulics.remote_valves', '2 pairs front; 2 pairs rear (detent, standard)', null],
        ['capacities.fuel_tank', m.fuelL, 'L'],
        ['dimensions.overall_length', 133, 'in'],
        ['dimensions.overall_width', 62.5, 'in'],
        ['dimensions.overall_height', m.heightIn, 'in'],
        ['dimensions.wheelbase', 73.2, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
        ['tires.ag', '9.5-16 / 13.6-24', null],
        ['tires.industrial', '12-16.5 / 17.5L-24', null],
        ['tires.turf', '28 x 8.5-15 / 41 x 14-20', null],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor MT3 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, brochureSourceRecordId, value, unit);
      }
    }
  },
};
