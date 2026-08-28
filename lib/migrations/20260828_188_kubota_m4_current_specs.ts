import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSeed={
  modelName:'M4D-061'|'M4-071'|'M4D-071';
  slug:'m4d-061'|'m4-071'|'m4d-071';
  grossPower:number;
  ptoPower:number;
  weight:number;
  fourWheelDriveClutch:string;
  ptoSpeed:string;
  remoteValves:string;
  trim:string;
};

const CURRENT_URL='https://www.kubotausa.com/equipment-series/m4-series';
const CURRENT_EXTERNAL_ID='kubota-m4-current-us-lineup-2026-08';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m4_brochure---final.pdf?sfvrsn=a36d061d_4';
const DETAIL_EXTERNAL_ID='kubota-m4-current-detail-brochure-2026-08';

const models:ModelSeed[]=[
  {modelName:'M4D-061',slug:'m4d-061',grossPower:65.4,ptoPower:52,weight:6008,fourWheelDriveClutch:'Electro-hydraulic on-the-go',ptoSpeed:'540 / 540E rpm',remoteValves:'2 standard (SCD / FD), maximum 3',trim:'Deluxe'},
  {modelName:'M4-071',slug:'m4-071',grossPower:72.1,ptoPower:60,weight:5952,fourWheelDriveClutch:'Mechanical on-the-go',ptoSpeed:'540 rpm standard; 540 / 540E optional',remoteValves:'1 standard (SCD), maximum 3',trim:'Standard'},
  {modelName:'M4D-071',slug:'m4d-071',grossPower:72.1,ptoPower:60,weight:6008,fourWheelDriveClutch:'Electro-hydraulic on-the-go',ptoSpeed:'540 / 540E rpm',remoteValves:'2 standard (SCD / FD), maximum 3',trim:'Deluxe'},
];

const definitions=[
  ['Machine Configuration','configuration.trim','Trim level','text',null,1],
  ['Machine Configuration','configuration.cab','Operator station','text',null,2],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.displacement_cc','Displacement','decimal','cm3',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,20],
  ['Transmission','drivetrain.type','Driveline','text',null,30],
  ['Transmission','drivetrain.4wd_clutch','4WD clutch engagement','text',null,40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.system','PTO type','text',null,20],
  ['PTO','pto.rear_description','Rear PTO speed','text',null,30],
  ['Hydraulics','hydraulics.main_pump_capacity','3-point hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,20],
  ['Hydraulics','hydraulics.control_system','3-point control system','text',null,30],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',40],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,50],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Electrical','electrical.alternator','Alternator','integer','A',10],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',30],
  ['Dimensions & Weight','dimensions.overall_height','Overall height to cab','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',50],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M4 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}

async function upsertSpec(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceRecordId:number,value:string|number,unit:string|null=null){
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId],
  );
}

export const kubotaM4CurrentSpecsMigration:DbMigration={
  id:'20260828_188_kubota_m4_current_specs',
  description:'Add current US Kubota M4D-061, M4-071 and M4D-071 cab/4WD specification sets with the current 72.1 HP revision',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M4 Series','m4-series') ON DUPLICATE KEY UPDATE name='M4 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m4-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA M4 Series - current US lineup and 72.1 HP model revision');
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA M4 Series current brochure - detailed specifications');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M4 spec definition ${key}`);return id;};

    for(const model of models){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA M4 Series compact utility tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.modelName,model.slug],
      );
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,'us-current-hdc12-cab-4wd','US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,`${model.modelName}HDC12 4WD cab, 12F/12R transmission`,currentSourceId,'Kubota USA current M4 page confirms the three-model lineup and the revised 65.4-72.1 gross HP range; detailed values come from the current M4 brochure.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-hdc12-cab-4wd' LIMIT 1`,[machineId]);
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.trim',model.trim,null],['configuration.cab','Ultra Grand Cab II',null],
        ['engine.make','Kubota',null],['engine.model','V3307-CR-TE4',null],['engine.type','4-cylinder in-line, Common Rail System, direct injection, turbocharged diesel',null],['engine.cylinders',4,null],['engine.displacement_cuin',203,'cu in'],['engine.displacement_cc',3331,'cm3'],['engine.gross_power',model.grossPower,'hp'],['engine.rated_speed',2400,'rpm'],
        ['transmission.standard','Fully synchronized 6-speed main transmission, F12/R12; F18/R18 with creep optional',null],['transmission.shuttle','Hydraulic shuttle',null],['drivetrain.type','4WD',null],['drivetrain.4wd_clutch',model.fourWheelDriveClutch,null],
        ['pto.rated_power',model.ptoPower,'hp'],['pto.system','Live-independent PTO, electro-hydraulic clutch with brake',null],['pto.rear_description',model.ptoSpeed,null],
        ['hydraulics.main_pump_capacity',16.7,'gpm'],['hitch.category','Category I / II',null],['hydraulics.control_system','Position, draft (top-link sensing) and mixed control',null],['hitch.lift_capacity_24in',3307,'lb'],['hydraulics.remote_valves',model.remoteValves,null],
        ['brakes.type','Hydraulic wet disc',null],['electrical.alternator',130,'A'],['capacities.fuel_tank_variants',23.8,'US gal'],
        ['dimensions.overall_length',144,'in'],['dimensions.overall_width',75.6,'in'],['dimensions.wheelbase',84.1,'in'],['dimensions.overall_height',101,'in'],['weight.tractor',model.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);
    }
  },
};
