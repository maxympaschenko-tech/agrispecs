import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };

type ModelSeed = {
  modelName:'BX1880'|'BX2380'|'BX2680'|'BX23S';
  slug:'bx1880'|'bx2380'|'bx2680'|'bx23s';
  engineModel:string;
  displacementCuIn:number;
  displacementCc:number;
  grossPower:number;
  ptoPower:number;
  length:number;
  width:number;
  height:number;
  wheelbase:number;
  forwardSpeed:number;
  reverseSpeed:number;
  weight:number;
  hitch:string;
};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-bx-current';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/bx-series-brochure.pdf?sfvrsn=c783b090_7';
const DETAIL_EXTERNAL_ID='kubota-bx-series-detail-brochure-current-2026-08';

const models:ModelSeed[]=[
  {modelName:'BX1880',slug:'bx1880',engineModel:'D722',displacementCuIn:43.9,displacementCc:719,grossPower:16.6,ptoPower:13.7,length:95.5,width:44.1,height:81.9,wheelbase:55.1,forwardSpeed:7.8,reverseSpeed:5.9,weight:1404,hitch:'SAE Category I'},
  {modelName:'BX2380',slug:'bx2380',engineModel:'D902',displacementCuIn:54.8,displacementCc:898,grossPower:21.6,ptoPower:17.7,length:95.5,width:45.1,height:83.1,wheelbase:55.1,forwardSpeed:8.4,reverseSpeed:6.5,weight:1454,hitch:'SAE Category I'},
  {modelName:'BX2680',slug:'bx2680',engineModel:'D1005',displacementCuIn:61.1,displacementCc:1001,grossPower:23.3,ptoPower:19.2,length:95.5,width:45.1,height:83.1,wheelbase:55.1,forwardSpeed:8.4,reverseSpeed:6.5,weight:1520,hitch:'SAE Category I'},
  {modelName:'BX23S',slug:'bx23s',engineModel:'D902',displacementCuIn:54.8,displacementCc:898,grossPower:21.6,ptoPower:17.7,length:99.0,width:45.1,height:86.2,wheelbase:55.1,forwardSpeed:8.4,reverseSpeed:6.5,weight:1598,hitch:'Optional SAE Category I'},
];

const definitions=[
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.displacement_cc','Displacement','decimal','cm3',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['Transmission','transmission.forward_speed','Maximum forward speed','decimal','mph',30],
  ['Transmission','transmission.reverse_speed','Maximum reverse speed','decimal','mph',40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.system','PTO system','text',null,20],
  ['PTO','pto.rear_description','Rear PTO','text',null,30],
  ['PTO','pto.mid_description','Mid PTO','text',null,40],
  ['Hydraulics','hydraulics.main_pump_capacity','Hydraulic pump output','decimal','gpm',10],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,20],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind pin','decimal','lb',30],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length with 3-point hitch','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height with ROPS','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',70],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota BX migration dependency.');
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

export const kubotaBXCurrentSpecsMigration:DbMigration={
  id:'20260827_170_kubota_bx_current_specs',
  description:'Add current US Kubota BX1880, BX2380, BX2680 and BX23S source-backed specification sets with 2026 power revisions',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug)
       VALUES (?,?,'BX Series','bx-series')
       ON DUPLICATE KEY UPDATE name='BX Series'`,
      [manufacturerId,equipmentTypeId],
    );
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='bx-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current BX Series specifications and lineup');
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA BX Series brochure - detailed BX80 specifications');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing BX spec definition ${key}`);return id;};

    for(const model of models){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA BX Series sub-compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.modelName,model.slug],
      );
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      const versionSlug='us-current-hst-4wd';
      const configuration=model.slug==='bx23s'
        ? 'BX23S 4WD HST tractor-loader-backhoe platform; open-station ROPS with optional dealer-installed cab'
        : `${model.modelName} 4WD HST; ROPS with optional dealer-installed cab`;
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,versionSlug,configuration,currentSourceId,'Current 2026 Kubota USA lineup. Current full-line values take precedence where older BX brochures differ, including the BX2680 23.3 gross HP / 19.2 PTO HP revision.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,versionSlug]);

      const detailValues:Array<[string,string|number,string|null]>=[
        ['engine.make','Kubota',null],['engine.model',model.engineModel,null],['engine.type','Liquid-cooled, 3-cylinder diesel',null],['engine.cylinders',3,null],
        ['engine.displacement_cc',model.displacementCc,'cm3'],['engine.rated_speed',3200,'rpm'],['transmission.standard','HST, high-low gear shift (2 forward / 2 reverse)',null],
        ['drivetrain.type','4WD',null],['pto.system','Live independent PTO with hydraulic clutch',null],['pto.rear_description','Standard rear PTO, 540 rpm',null],
        ['pto.mid_description','Standard mid PTO, 2500 rpm',null],['hydraulics.main_pump_capacity',6.2,'gpm'],['hitch.category',model.hitch,null],
        ['hitch.lift_capacity_24in',680,'lb'],['steering.type','Hydrostatic power steering',null],['brakes.type','Wet disc',null],['capacities.fuel_tank_variants','6.6 US gal (25 L)',null],
      ];
      for(const [key,value,unit] of detailValues) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);

      const currentValues:Array<[string,string|number,string|null]>=[
        ['engine.displacement_cuin',model.displacementCuIn,'cu in'],['engine.gross_power',model.grossPower,'hp'],['pto.rated_power',model.ptoPower,'hp'],
        ['transmission.forward_speed',model.forwardSpeed,'mph'],['transmission.reverse_speed',model.reverseSpeed,'mph'],['dimensions.overall_length',model.length,'in'],
        ['dimensions.overall_width',model.width,'in'],['dimensions.overall_height',model.height,'in'],['dimensions.wheelbase',model.wheelbase,'in'],['weight.tractor',model.weight,'lb'],
      ];
      for(const [key,value,unit] of currentValues) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit);
    }
  },
};
