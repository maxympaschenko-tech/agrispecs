import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  sku: string;
  engineMake: string;
  engineModel: string;
  fuelType: string;
  cylinders: number;
  displacementCc: number;
  horsepower: number;
  torqueLbFt: number;
  fuelEconomyGph: number;
  weightLb: number;
  weight3PtLb: number;
  slopeContinuousDeg: number;
  slopeIntermittentDeg: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.ventrac.com/products/tractors/4520';
const SPEC_URL = 'https://cdn.ventrac.com/documents/o4exPdaArRZS2o9LJEAKoNf9maqdj5xZa5r1XXRr.pdf?response-content-disposition=attachment%3Bfilename%3D4520.pdf';

const models: Seed[] = [
  { slug:'4520n', name:'4520N', url:'https://www.ventrac.com/products/tractors/4520n', sku:'39.51225', engineMake:'Kubota', engineModel:'WG972-G-E4 / WG972 EFI', fuelType:'Gasoline', cylinders:3, displacementCc:962, horsepower:32.5, torqueLbFt:51, fuelEconomyGph:1.2, weightLb:1700, weight3PtLb:1780, slopeContinuousDeg:20, slopeIntermittentDeg:30 },
  { slug:'4520p', name:'4520P', url:'https://www.ventrac.com/products/tractors/4520p', sku:'39.51216', engineMake:'Kawasaki', engineModel:'FD851D DFI', fuelType:'Gasoline', cylinders:2, displacementCc:824, horsepower:31, torqueLbFt:47.1, fuelEconomyGph:1.2, weightLb:1620, weight3PtLb:1700, slopeContinuousDeg:30, slopeIntermittentDeg:30 },
  { slug:'4520y', name:'4520Y', url:'https://www.ventrac.com/products/tractors/4520y', sku:'39.51217', engineMake:'Kubota', engineModel:'D902', fuelType:'Diesel', cylinders:3, displacementCc:898, horsepower:25, torqueLbFt:42, fuelEconomyGph:1.1, weightLb:1705, weight3PtLb:1785, slopeContinuousDeg:20, slopeIntermittentDeg:30 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Machine Configuration','configuration.sku','Manufacturer SKU','text',null,2],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Engine power','decimal','hp',8],
  ['Engine','engine.max_torque','Peak torque','decimal','lb-ft',10],
  ['Engine','engine.fuel_type','Fuel type','text',null,12],
  ['Engine','engine.fuel_economy_reference','Estimated fuel use with 60-inch mower','decimal','gal/h',20],
  ['Drive','drive.type','Drive system','text',null,10],
  ['Drive','drive.frame','Chassis / frame system','text',null,20],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.unladen_weight','Weight with standard hitch','decimal','lb',70],
  ['Dimensions & Weight','dimensions.weight_with_3pt','Weight with 3-point hitch','decimal','lb',75],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.rops_height_up','Height with ROPS up','decimal','in',30],
  ['Dimensions & Weight','dimensions.rops_height_down','Height with ROPS down','decimal','in',31],
  ['Dimensions & Weight','dimensions.ground_clearance','Ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius','decimal','in',60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Operating','operating.slope_continuous','Continuous slope rating','decimal','deg',10],
  ['Operating','operating.slope_intermittent','Intermittent slope rating','decimal','deg',20],
  ['Tires','tires.all_terrain','All-terrain tires','text',null,10],
  ['Tires','tires.turf','Turf tires','text',null,20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Ventrac 4520 migration dependency missing');
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

export const ventrac4520CurrentUsMigration: DbMigration = {
  id: '20260831_464_ventrac_4520_current_us',
  description: 'Introduce Ventrac with the three current US 4520 compact tractor engine configurations',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Ventrac','ventrac') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ventrac' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Ventrac' AND domain='ventrac.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Ventrac','ventrac.com','manufacturer','official')`);
      sourceId = Number(inserted.insertId);
    }

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Ventrac 4520','ventrac-4520') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ventrac-4520' LIMIT 1`, [manufacturerId]);
    const seriesSourceId = await source(c, sourceId, 'ventrac-4520-current-us-2026-08', SERIES_URL, 'Ventrac current 4520 compact tractor lineup', {
      market:'United States', captured:'2026-08-31', currentModels:models.map(m=>m.name),
      currentLineupPolicy:'The current Ventrac tractor product page lists 4520N, 4520P and 4520Y. The older 4500 page is explicitly marked Discontinued and is excluded from current-US status.',
      shared:{drive:'AWD', chassis:'FlexFrame articulated and oscillating chassis', fuelCapacityGal:6, widthIn:48.5, wheelbaseIn:45, ropsUpIn:68, ropsDownIn:54, groundClearanceIn:5, turningRadiusIn:39, tires:{allTerrain:'22x12-8',turf:'22x11-10'}},
      specSheet:SPEC_URL,
      sourceUse:'Current live product/support pages are primary for current lineup and current published weights. The official 4520 spec sheet supplies displacement and continuous/intermittent slope ratings.'
    });

    const definitionIds = new Map<string,number>();
    for (const row of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sourceRecordId = await source(c, sourceId, `ventrac-${m.slug}-current-us-2026-08`, m.url, `Ventrac ${m.name} current specifications`, {market:'United States',captured:'2026-08-31',model:m.name,sku:m.sku,productPage:m.url,specSheet:SPEC_URL});
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Ventrac 4520 compact articulated tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId,equipmentTypeId,seriesId,m.name,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Ventrac US 4520 engine configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,`ROPS; AWD; ${m.engineMake} ${m.engineModel}; ${m.fuelType}`,sourceRecordId||seriesSourceId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const values: Array<[string,string|number,string|null]> = [
        ['configuration.station','ROPS',null],['configuration.sku',m.sku,null],['engine.make',m.engineMake,null],['engine.model',m.engineModel,null],['engine.cylinders',m.cylinders,null],['engine.displacement',m.displacementCc/1000,'L'],['engine.gross_power',m.horsepower,'hp'],['engine.max_torque',m.torqueLbFt,'lb-ft'],['engine.fuel_type',m.fuelType,null],['engine.fuel_economy_reference',m.fuelEconomyGph,'gal/h'],['drive.type','AWD',null],['drive.frame','FlexFrame articulated and oscillating chassis',null],['dimensions.overall_width',48.5,'in'],['dimensions.unladen_weight',m.weightLb,'lb'],['dimensions.weight_with_3pt',m.weight3PtLb,'lb'],['dimensions.wheelbase',45,'in'],['dimensions.rops_height_up',68,'in'],['dimensions.rops_height_down',54,'in'],['dimensions.ground_clearance',5,'in'],['dimensions.turning_radius',39,'in'],['capacities.fuel_tank',6,'gal'],['operating.slope_continuous',m.slopeContinuousDeg,'deg'],['operating.slope_intermittent',m.slopeIntermittentDeg,'deg'],['tires.all_terrain','22x12-8',null],['tires.turf','22x11-10',null]
      ];
      for (const [key,value,unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Ventrac 4520 spec definition ${key}`);
        await put(c,machineId,versionId,definitionId,sourceRecordId||seriesSourceId,value,unit);
      }
    }
  }
};
