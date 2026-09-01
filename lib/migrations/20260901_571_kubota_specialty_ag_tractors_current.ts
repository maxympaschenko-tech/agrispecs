import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type SeriesKey = 'narrow' | 'low-profile' | 'high-clearance';
type SourceKey = 'narrow-live' | 'specialty-live' | 'm6h-live';
type Variant = {
  machineSlug: string;
  modelName: string;
  series: SeriesKey;
  versionSlug: string;
  configuration: string;
  station: string;
  specialtyClass: string;
  grossHp: number;
  ptoHp: number;
  engineType: string;
  transmission: string;
  shuttle?: string;
  speedRange?: string;
  maxSpeed?: number;
  heightReference: string;
  widthIn: number;
  lengthIn: number;
  clearanceIn: number;
  wheelbaseIn: number;
  weightLb: number;
  loader?: string;
  remoteFlowGpm?: number;
  remoteValves?: string;
  drivetrain?: string;
  source: SourceKey;
  notes: string;
};

const FULL_LINE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/2026-full-product-line-brochure.pdf?sfvrsn=efd39503_10';
const NARROW_LIVE_URL = 'https://www.kubotausa.com/special-offer/m-narrow-series-tractors';
const SPECIALTY_LIVE_URL = 'https://www.kubotausa.com/tractors/specialty-tractors';
const M6H_LIVE_URL = 'https://www.kubotausa.com/equipment-series/m6h';

const variants: Variant[] = [
  {
    machineSlug: 'm4n-071', modelName: 'M4N-071', series: 'narrow', versionSlug: 'us-2026-hd12-open',
    configuration: 'M4N-071 HD12 open-station narrow tractor', station: 'Open station', specialtyClass: 'Narrow', grossHp: 72.6, ptoHp: 61,
    engineType: 'Kubota liquid-cooled CRS direct-injection 4-cylinder turbocharged Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '54.7 in to top of hood', widthIn: 51.6, lengthIn: 147.6, clearanceIn: 12, wheelbaseIn: 83.9, weightLb: 5049,
    source: 'narrow-live', notes: 'Current M4N narrow configuration carried in Kubota USA 2026 full-line material; active M Narrow financing material explicitly covers M4N/M5N Series equipment.'
  },
  {
    machineSlug: 'm4n-071', modelName: 'M4N-071', series: 'narrow', versionSlug: 'us-2026-hdc12-cab',
    configuration: 'M4N-071 HDC12 cab narrow tractor', station: 'Cab', specialtyClass: 'Narrow', grossHp: 72.6, ptoHp: 61,
    engineType: 'Kubota liquid-cooled CRS direct-injection 4-cylinder turbocharged Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '90.2 in cab height', widthIn: 53.9, lengthIn: 149.2, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 5291,
    source: 'narrow-live', notes: 'Cab and open-station dimensional values are kept separate because Kubota publishes different width, height-reference and weight figures.'
  },
  {
    machineSlug: 'm5n-091pk', modelName: 'M5N-091PK Power Krawler', series: 'narrow', versionSlug: 'us-2026-power-krawler-cab',
    configuration: 'M5N-091PK 4WD cab Power Krawler narrow tractor', station: 'Cab', specialtyClass: 'Narrow / Power Krawler', grossHp: 92.5, ptoHp: 78,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F12/R12; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle', drivetrain: '4WD with independently oscillating rear tracks',
    heightReference: '93.3 in cab height', widthIn: 48, lengthIn: 155.5, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 7275,
    source: 'narrow-live', notes: 'Power Krawler remains a distinct 2026 full-line configuration; its 48 in published width and 7,275 lb weight are not copied to wheeled M5N models.'
  },
  {
    machineSlug: 'm5n-091', modelName: 'M5N-091', series: 'narrow', versionSlug: 'us-2026-hdc12-cab',
    configuration: 'M5N-091 HDC12 cab narrow tractor', station: 'Cab', specialtyClass: 'Narrow', grossHp: 92.5, ptoHp: 78,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '90.2 in cab height', widthIn: 53.9, lengthIn: 155.5, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 5622,
    source: 'narrow-live', notes: '2026 full-line HDC12 value set; PTO rating remains 78 hp for the 12-speed configuration.'
  },
  {
    machineSlug: 'm5n-091', modelName: 'M5N-091', series: 'narrow', versionSlug: 'us-2026-hdc24-cab',
    configuration: 'M5N-091 HDC24 cab narrow tractor', station: 'Cab', specialtyClass: 'Narrow', grossHp: 92.5, ptoHp: 75,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F24/R24 fully synchronized; F36/R36 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '90.2 in cab height', widthIn: 53.9, lengthIn: 155.5, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 5622,
    source: 'narrow-live', notes: '2026 full-line HDC24 value set; Kubota publishes 75 PTO hp for the 24-speed configuration rather than the 78 hp used by HDC12.'
  },
  {
    machineSlug: 'm5n-092', modelName: 'M5N-092', series: 'narrow', versionSlug: 'us-2026-hd12-open',
    configuration: 'M5N-092 HD12 open-station narrow tractor', station: 'Open station', specialtyClass: 'Narrow', grossHp: 92.5, ptoHp: 78,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '59.8 in to top of hood', widthIn: 53.5, lengthIn: 155.5, clearanceIn: 12, wheelbaseIn: 83.9, weightLb: 5357,
    source: 'narrow-live', notes: 'Second-generation M5N-092 ROPS model; current Kubota offer explicitly lists HD12 with 92.5 gross hp.'
  },
  {
    machineSlug: 'm5n-092', modelName: 'M5N-092', series: 'narrow', versionSlug: 'us-2026-hd24-open',
    configuration: 'M5N-092 HD24 open-station narrow tractor', station: 'Open station', specialtyClass: 'Narrow', grossHp: 92.5, ptoHp: 75,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F24/R24 fully synchronized; F36/R36 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '59.8 in to top of hood', widthIn: 53.5, lengthIn: 155.5, clearanceIn: 12, wheelbaseIn: 83.9, weightLb: 5357,
    source: 'narrow-live', notes: 'Second-generation M5N-092 ROPS model; current Kubota offer explicitly lists HD24 with 92.5 gross hp.'
  },
  {
    machineSlug: 'm5n-111', modelName: 'M5N-111', series: 'narrow', versionSlug: 'us-2026-hdc12-cab',
    configuration: 'M5N-111 HDC12 cab narrow tractor', station: 'Cab', specialtyClass: 'Narrow', grossHp: 105.7, ptoHp: 91,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '90.2 in cab height', widthIn: 53.9, lengthIn: 155.5, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 5622,
    source: 'narrow-live', notes: '2026 full-line HDC12 configuration with 91 PTO hp.'
  },
  {
    machineSlug: 'm5n-111', modelName: 'M5N-111', series: 'narrow', versionSlug: 'us-2026-hdc24-cab',
    configuration: 'M5N-111 HDC24 cab narrow tractor', station: 'Cab', specialtyClass: 'Narrow', grossHp: 105.7, ptoHp: 88,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F24/R24 fully synchronized; F36/R36 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '90.2 in cab height', widthIn: 53.9, lengthIn: 155.5, clearanceIn: 14.6, wheelbaseIn: 83.9, weightLb: 5622,
    source: 'narrow-live', notes: '2026 full-line HDC24 configuration with 88 PTO hp; kept separate from HDC12.'
  },
  {
    machineSlug: 'm5n-112', modelName: 'M5N-112', series: 'narrow', versionSlug: 'us-2026-hd12-open',
    configuration: 'M5N-112 HD12 open-station narrow tractor', station: 'Open station', specialtyClass: 'Narrow', grossHp: 105.7, ptoHp: 91,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '59.8 in to top of hood', widthIn: 53.5, lengthIn: 155.5, clearanceIn: 12, wheelbaseIn: 83.9, weightLb: 5357,
    source: 'narrow-live', notes: 'Second-generation M5N-112 ROPS model; current Kubota offer explicitly lists HD12 with 105.7 gross hp.'
  },
  {
    machineSlug: 'm5n-112', modelName: 'M5N-112', series: 'narrow', versionSlug: 'us-2026-hd24-open',
    configuration: 'M5N-112 HD24 open-station narrow tractor', station: 'Open station', specialtyClass: 'Narrow', grossHp: 105.7, ptoHp: 88,
    engineType: 'Kubota CRS direct-injection 4-cylinder turbocharged intercooled Tier 4 diesel',
    transmission: 'F24/R24 fully synchronized; F36/R36 with creep', shuttle: 'Electro-hydraulic shuttle',
    heightReference: '59.8 in to top of hood', widthIn: 53.5, lengthIn: 155.5, clearanceIn: 12, wheelbaseIn: 83.9, weightLb: 5357,
    source: 'narrow-live', notes: 'Second-generation M5N-112 ROPS model; current Kubota offer explicitly lists HD24 with 105.7 gross hp.'
  },
  {
    machineSlug: 'm5l-111', modelName: 'M5L-111', series: 'low-profile', versionSlug: 'us-2026-low-profile',
    configuration: 'M5L-111 low-profile orchard tractor', station: 'Open station / foldable ROPS', specialtyClass: 'Low-Profile', grossHp: 105.6, ptoHp: 89,
    engineType: 'Kubota V3800-TIEF4 CRS direct-injection 4-cylinder turbocharged intercooled diesel',
    transmission: 'F12/R12 fully synchronized; F18/R18 with creep', speedRange: 'Up to 20.1 mph', maxSpeed: 20.1,
    heightReference: '90.6 in ROPS upright / 66.3 in ROPS folded', widthIn: 77.6, lengthIn: 155.9, clearanceIn: 16.3, wheelbaseIn: 88.6, weightLb: 5908,
    loader: 'LA1854', source: 'specialty-live', notes: '2026 low-profile model intended for fruit, nut orchard and other low-clearance work; folded-ROPS height is preserved separately from upright height.'
  },
  {
    machineSlug: 'm6l-111', modelName: 'M6L-111', series: 'low-profile', versionSlug: 'us-2026-low-profile',
    configuration: 'M6L-111 low-profile orchard tractor', station: 'Open station / ROPS', specialtyClass: 'Low-Profile', grossHp: 114.1, ptoHp: 95,
    engineType: 'Kubota V3800-TIEF4 CRS direct-injection 4-cylinder turbocharged intercooled diesel',
    transmission: 'F32/R32 fully synchronized; F48/R48 with creep', speedRange: '0.86–18.56 mph', maxSpeed: 18.56,
    heightReference: '89.4 in ROPS height', widthIn: 83.5, lengthIn: 163.2, clearanceIn: 18.5, wheelbaseIn: 95.9, weightLb: 7077,
    loader: 'LA1944A', source: 'specialty-live', notes: '2026 low-profile model; published speed range is retained as a range instead of being reduced to a single transport-speed claim.'
  },
  {
    machineSlug: 'm6h-101', modelName: 'M6H-101', series: 'high-clearance', versionSlug: 'us-2026-high-clearance',
    configuration: 'M6H-101 high-clearance specialty crop tractor', station: 'Open station / ROPS', specialtyClass: 'High-Clearance', grossHp: 104.4, ptoHp: 84,
    engineType: 'Kubota V3800-TIEF4 common-rail direct-injection 4-cylinder turbocharged diesel with DPF, DOC and SCR',
    transmission: 'F24/R24 with creep per 2026 full-line catalog', shuttle: 'Electro-hydraulic shuttle', speedRange: '0.11–16.37 mph per 2026 full-line catalog', maxSpeed: 16.37,
    heightReference: '111.6 in ROPS unfolded', widthIn: 79.9, lengthIn: 168.3, clearanceIn: 25.8, wheelbaseIn: 95.3, weightLb: 8157,
    remoteFlowGpm: 17.6, remoteValves: '2 standard rear remote valves', drivetrain: '4WD', source: 'm6h-live',
    notes: 'The 2026 full-line catalog publishes F24/R24 w/ creep and a 0.11 mph minimum. Kubota’s current live M6H page instead describes 24F/24R with creeper as an option producing 48F/48R and cites 0.18 mph. This version keeps the catalog value set and records the live-page conflict rather than merging unlike statements.'
  },
];

const definitions = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Machine Configuration', 'configuration.specialty_class', 'Specialty tractor class', 'text', null, 2],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
  ['Engine', 'engine.type', 'Engine type', 'text', null, 3],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 4],
  ['Engine', 'engine.displacement_cuin', 'Displacement', 'decimal', 'cu in', 5],
  ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 6],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['Transmission', 'transmission.standard', 'Transmission speeds', 'text', null, 10],
  ['Transmission', 'transmission.shuttle', 'Shuttle shift', 'text', null, 20],
  ['Transmission', 'transmission.speed_range', 'Published traveling speed range', 'text', null, 25],
  ['Transmission', 'transmission.max_speed', 'Maximum traveling speed', 'decimal', 'mph', 30],
  ['Transmission', 'drivetrain.type', 'Driveline', 'text', null, 40],
  ['Hydraulics', 'hydraulics.remote_flow', 'Rated flow at remote outlets', 'decimal', 'gpm', 10],
  ['Hydraulics', 'hydraulics.remote_valves', 'Standard rear remote valves', 'text', null, 20],
  ['Dimensions & Weight', 'dimensions.published_height_reference', 'Published height reference', 'text', null, 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.crop_clearance', 'Crop / ground clearance', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 50],
  ['Dimensions & Weight', 'weight.tractor', 'Tractor weight', 'decimal', 'lb', 60],
  ['Attachments', 'attachments.front_loader', 'Published front loader', 'text', null, 10],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota specialty tractor migration dependency');
  return Number(rows[0].id);
}

async function sourceId(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function ensureRecord(connection: Parameters<DbMigration['apply']>[0], sid: number, url: string, externalId: string, title: string, rawReference: unknown) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, externalId, title, JSON.stringify(rawReference)]);
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, recordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, recordId],
  );
}

export const kubotaSpecialtyAgTractorsCurrentMigration: DbMigration = {
  id: '20260901_571_kubota_specialty_ag_tractors_current',
  description: 'Add current Kubota USA narrow low-profile and high-clearance specialty ag tractors from 2026 manufacturer sources',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await sourceId(connection);

    const fullLineRecord = await ensureRecord(connection, sid, FULL_LINE_URL, 'kubota-2026-full-line-specialty-ag-tractors', 'Kubota USA 2026 Full Product Line - Utility/Specialty Ag Tractors', { captured: '2026-09-01', pages: '38-43', market: 'United States', sections: ['M Narrow Models', 'M Low-Profile Models', 'High-Clearance Models'] });
    const liveRecords: Record<SourceKey, number> = {
      'narrow-live': await ensureRecord(connection, sid, NARROW_LIVE_URL, 'kubota-m-narrow-current-offer-2026-09', 'Kubota USA current M Narrow Series offer', { captured: '2026-09-01', current: true, offerEnds: '2026-09-30' }),
      'specialty-live': await ensureRecord(connection, sid, SPECIALTY_LIVE_URL, 'kubota-specialty-tractors-current-2026-09', 'Kubota USA current Specialty Tractors category', { captured: '2026-09-01', current: true }),
      'm6h-live': await ensureRecord(connection, sid, M6H_LIVE_URL, 'kubota-m6h-current-live-2026-09', 'Kubota USA current M6H Series page', { captured: '2026-09-01', current: true, liveConflict: 'Live page describes creeper as optional and cites 0.18 mph while 2026 full-line catalog publishes F24/R24 w/ creep and 0.11 mph minimum.' }),
    };

    const seriesDefinitions: Record<SeriesKey, { name: string; slug: string }> = {
      narrow: { name: 'M Narrow Series', slug: 'm-narrow-series' },
      'low-profile': { name: 'M Low-Profile Series', slug: 'm-low-profile-series' },
      'high-clearance': { name: 'M6H High-Clearance Series', slug: 'm6h-high-clearance-series' },
    };
    const seriesIds = new Map<SeriesKey, number>();
    for (const [key, series] of Object.entries(seriesDefinitions) as Array<[SeriesKey, { name: string; slug: string }]>) {
      await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, series.name, series.slug]);
      seriesIds.set(key, await selectId(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, series.slug]));
    }

    const definitionIds = new Map<string, number>();
    for (const [section, key, label, valueType, canonicalUnit, displayOrder] of definitions) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, [section, key, label, valueType, canonicalUnit, displayOrder]);
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing specialty tractor spec definition ${key}`);
      return value;
    };

    const machineIds = new Map<string, number>();
    for (const variant of variants) {
      if (!machineIds.has(variant.machineSlug)) {
        const series = seriesIds.get(variant.series);
        if (!series) throw new Error(`Missing specialty tractor series ${variant.series}`);
        await connection.query(
          `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
           VALUES(?,?,?,?,?,'Current Kubota USA utility/specialty agricultural tractor','partial')
           ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
          [manufacturerId, equipmentTypeId, series, variant.modelName, variant.machineSlug],
        );
        machineIds.set(variant.machineSlug, await selectId(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, variant.machineSlug]));
      }
    }

    for (const variant of variants) {
      const machineId = machineIds.get(variant.machineSlug);
      if (!machineId) throw new Error(`Missing specialty tractor machine ${variant.machineSlug}`);
      const liveRecord = liveRecords[variant.source];
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, variant.versionSlug, variant.configuration, liveRecord, variant.notes],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, variant.versionSlug]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', variant.station, null],
        ['configuration.specialty_class', variant.specialtyClass, null],
        ['engine.make', 'Kubota', null],
        ['engine.type', variant.engineType, null],
        ['engine.cylinders', 4, null],
        ['engine.displacement_cuin', 230, 'cu in'],
        ['engine.gross_power', variant.grossHp, 'hp'],
        ['pto.rated_power', variant.ptoHp, 'hp'],
        ['transmission.standard', variant.transmission, null],
        ['dimensions.published_height_reference', variant.heightReference, null],
        ['dimensions.overall_width', variant.widthIn, 'in'],
        ['dimensions.overall_length', variant.lengthIn, 'in'],
        ['dimensions.crop_clearance', variant.clearanceIn, 'in'],
        ['dimensions.wheelbase', variant.wheelbaseIn, 'in'],
        ['weight.tractor', variant.weightLb, 'lb'],
      ];
      if (variant.shuttle) values.push(['transmission.shuttle', variant.shuttle, null]);
      if (variant.speedRange) values.push(['transmission.speed_range', variant.speedRange, null]);
      if (variant.maxSpeed !== undefined) values.push(['transmission.max_speed', variant.maxSpeed, 'mph']);
      if (variant.drivetrain) values.push(['drivetrain.type', variant.drivetrain, null]);
      if (variant.remoteFlowGpm !== undefined) values.push(['hydraulics.remote_flow', variant.remoteFlowGpm, 'gpm']);
      if (variant.remoteValves) values.push(['hydraulics.remote_valves', variant.remoteValves, null]);
      if (variant.loader) values.push(['attachments.front_loader', variant.loader, null]);

      for (const [key, value, unit] of values) await put(connection, machineId, versionId, def(key), fullLineRecord, value, unit);
    }
  },
};