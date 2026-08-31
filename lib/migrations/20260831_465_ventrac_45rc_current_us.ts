import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const PRODUCT_URL = 'https://www.ventrac.com/products/tractors/45rc';
const NA_SUPPORT_URL = 'https://www.ventrac.com/support/45rcn-na';
const SPEC_URL = 'https://www.ventrac.com/d/spec/45RC.pdf';

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Machine Configuration','configuration.model_code','Manufacturer model code','text',null,2],
  ['Machine Configuration','configuration.sku','North America SKU','text',null,3],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.gross_power','Engine power','decimal','hp',8],
  ['Engine','engine.fuel_type','Fuel type','text',null,12],
  ['Engine','engine.fuel_economy_reference','Estimated fuel use with 60-inch mower','decimal','gal/h',20],
  ['Drive','drive.operation','Operation modes','text',null,10],
  ['Drive','drive.max_ground_speed','Maximum ground speed','decimal','mph',20],
  ['Drive','drive.controls','Drive controls','text',null,30],
  ['Remote','remote.camera','Remote camera','text',null,10],
  ['Remote','remote.radio_frequency','Radio frequency','text',null,20],
  ['Remote','remote.radio_range','Radio operating range','decimal','ft',30],
  ['Remote','remote.video_range','Video operating range','decimal','ft',40],
  ['Remote','remote.proximity_range','Proximity sensing range','decimal','ft',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.width_duals','Width with dual wheels','decimal','in',21],
  ['Dimensions & Weight','dimensions.height_without_antenna','Height without proximity antenna','decimal','in',30],
  ['Dimensions & Weight','dimensions.height_with_antenna','Height with proximity antenna','decimal','in',31],
  ['Dimensions & Weight','dimensions.unladen_weight','Published tractor weight','decimal','lb',70],
  ['Dimensions & Weight','dimensions.weight_duals','Weight with dual wheels','decimal','lb',71],
  ['Tires','tires.standard','Standard tires','text',null,10],
  ['Tires','tires.dual_wheels','Dual-wheel guidance','text',null,20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Ventrac 45RC migration dependency missing');
  return Number(rows[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId,url,externalId,title,JSON.stringify(raw)]);
  return Number(inserted.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string|number, unit: string|null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);
}

export const ventrac45rcCurrentUsMigration: DbMigration = {
  id: '20260831_465_ventrac_45rc_current_us',
  description: 'Add current North America Ventrac 45RCN remote-control tractor with dual-operation specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ventrac' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Ventrac' AND domain='ventrac.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Ventrac 45RC','ventrac-45rc') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ventrac-45rc' LIMIT 1`, [manufacturerId]);

    const sourceRecordId = await source(c, sourceId, 'ventrac-45rcn-current-na-2026-08', NA_SUPPORT_URL, 'Ventrac 45RCN current North America remote-control tractor', {
      market:'United States / North America', captured:'2026-08-31', productPage:PRODUCT_URL, northAmericaSupport:NA_SUPPORT_URL, currentSpecSheet:SPEC_URL,
      model:'45RCN', displayName:'45RC',
      skuPolicy:'North America support page identifies SKU 39.51226. The general current 45RC product page identifies SKU 39.51229 for the same 45RCN model. These identifiers are retained as market/page-level source identifiers rather than creating duplicate machine records.',
      skuNorthAmerica:'39.51226', skuGeneralCurrent:'39.51229', specSheetStockCode:'39.R51226',
      engine:'Kubota WG972 EFI; 32.5 hp; 3-cylinder liquid-cooled gasoline',
      remote:{camera:'Live feed in RC mode',radioFrequency:'2.4 GHz',remoteDistanceFt:500,radioRangeFt:500,videoRangeFt:250,proximitySensingFt:100},
      dimensions:{lengthIn:81.5,widthIn:48.5,widthDualsIn:73,heightWithoutProximityAntennaIn:72,heightWithProximityAntennaIn:79,weightLb:2160,weightDualsLb:2360},
      operation:'Operator-On and Remote; electric-over-hydraulic controls with V-Trim',
      attachmentPolicy:'The current Ventrac 45RC attachment page and current spec sheet list approved attachments. Fitment is handled in a separate attachment migration.'
    });

    const definitionIds = new Map<string,number>();
    for (const row of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America Ventrac remote-control tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId,equipmentTypeId,seriesId,'45RC','45rc']);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='45rc' LIMIT 1`, [manufacturerId]);
    await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
    await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','45RCN North America; operator-on + remote; Kubota WG972 EFI gasoline',TRUE,?,'Current North America Ventrac 45RCN. One machine record represents the product despite different NA/general current SKUs.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,sourceRecordId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);

    const values: Array<[string,string|number,string|null]> = [
      ['configuration.station','Operator-on platform plus remote operation',null],['configuration.model_code','45RCN',null],['configuration.sku','39.51226 (North America); general current page 39.51229',null],
      ['engine.make','Kubota',null],['engine.model','WG972 EFI',null],['engine.cylinders',3,null],['engine.gross_power',32.5,'hp'],['engine.fuel_type','Gasoline',null],['engine.fuel_economy_reference',1.2,'gal/h'],
      ['drive.operation','Operator-On and Remote',null],['drive.max_ground_speed',10,'mph'],['drive.controls','Electric-over-hydraulic joystick controls with selectable V-Trim',null],
      ['remote.camera','Live feed in RC mode',null],['remote.radio_frequency','2.4 GHz',null],['remote.radio_range',500,'ft'],['remote.video_range',250,'ft'],['remote.proximity_range',100,'ft'],
      ['capacities.fuel_tank',6,'gal'],['dimensions.overall_length',81.5,'in'],['dimensions.overall_width',48.5,'in'],['dimensions.width_duals',73,'in'],['dimensions.height_without_antenna',72,'in'],['dimensions.height_with_antenna',79,'in'],['dimensions.unladen_weight',2160,'lb'],['dimensions.weight_duals',2360,'lb'],
      ['tires.standard','MTN PRO 22x11x8; four tires standard',null],['tires.dual_wheels','Optional dual wheels; current product page recommends duals for all slope operation',null]
    ];
    for (const [key,value,unit] of values) {
      const definitionId = definitionIds.get(key);
      if (!definitionId) throw new Error(`Missing Ventrac 45RC spec definition ${key}`);
      await put(c,machineId,versionId,definitionId,sourceRecordId,value,unit);
    }
  }
};
