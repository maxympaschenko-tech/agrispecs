import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='lx2620'|'lx3520'|'lx4020';

type VersionSeed={
  modelName:'LX2620'|'LX3520'|'LX4020';
  modelSlug:ModelSlug;
  versionSlug:string;
  configuration:string;
  engineModel:string;
  grossPower:number;
  ptoPower:number;
  ratedRpm:number;
  displacementCuIn:number;
  displacementCc:number;
  transmission:string;
  pumpGpm:number;
  liftAtPoints:number;
  liftAt24:number;
  length:number;
  width:number;
  wheelbase:number;
  groundClearance:number;
  turningRadius:number;
  weight:number;
  engineOilQt:number;
  transmissionGal:number;
};

const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/3524_kubota_ktc_lx20_brochure_v9.pdf?sfvrsn=9d0b4c05_8';
const DETAIL_EXTERNAL_ID='kubota-lx20-current-detail-brochure-2026-08';
const CURRENT_URL='https://www.kubotausa.com/equipment-series/lx-series';
const CURRENT_EXTERNAL_ID='kubota-lx-series-current-us-2026-08';

const versions:VersionSeed[]=[
  {modelName:'LX2620',modelSlug:'lx2620',versionSlug:'us-current-hsd-rops',configuration:'LX2620HSD 4WD, 3-range HST, ROPS',engineModel:'D1305-E4-D36R',grossPower:23.3,ptoPower:19.4,ratedRpm:2500,displacementCuIn:77.0,displacementCc:1261,transmission:'HST, 3 ranges',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,length:101.8,width:53.7,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:1775,engineOilQt:4.2,transmissionGal:4.0},
  {modelName:'LX2620',modelSlug:'lx2620',versionSlug:'us-current-hsdc-cab',configuration:'LX2620HSDC 4WD, 3-range HST, factory cab',engineModel:'D1305-E4-D26Q',grossPower:23.3,ptoPower:19.4,ratedRpm:2500,displacementCuIn:77.0,displacementCc:1261,transmission:'HST, 3 ranges',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,length:103.9,width:53.7,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:2249,engineOilQt:4.2,transmissionGal:4.0},
  {modelName:'LX2620',modelSlug:'lx2620',versionSlug:'us-current-suhsd-rops',configuration:'LX2620SUHSD Special Utility, 4WD, 3-range HST, ROPS',engineModel:'D1305-E4-D36R',grossPower:23.3,ptoPower:19.4,ratedRpm:2500,displacementCuIn:77.0,displacementCc:1261,transmission:'HST, 3 ranges; SU model',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,length:101.8,width:53.7,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:1775,engineOilQt:4.2,transmissionGal:4.0},
  {modelName:'LX3520',modelSlug:'lx3520',versionSlug:'us-current-dtn-narrow',configuration:'LX3520DTN narrow 4WD gear-drive tractor',engineModel:'V1505-CR-TE5-D40R6',grossPower:34.9,ptoPower:29.6,ratedRpm:2600,displacementCuIn:91.4,displacementCc:1498,transmission:'Gear transmission; dry single-stage clutch',pumpGpm:9.1,liftAtPoints:2348,liftAt24:1819,length:98.2,width:39.4,wheelbase:61.0,groundClearance:12.8,turningRadius:7.5,weight:2154,engineOilQt:5.0,transmissionGal:5.5},
  {modelName:'LX3520',modelSlug:'lx3520',versionSlug:'us-current-hsd-rops',configuration:'LX3520HSD 4WD, 3-range HST, ROPS',engineModel:'V1505-CR-TE5-D40R5',grossPower:34.9,ptoPower:28.7,ratedRpm:2700,displacementCuIn:91.4,displacementCc:1498,transmission:'HST, 3 ranges',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,length:101.6,width:53.7,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2191,engineOilQt:5.0,transmissionGal:5.5},
  {modelName:'LX3520',modelSlug:'lx3520',versionSlug:'us-current-hsdc-cab',configuration:'LX3520HSDC 4WD, 3-range HST, factory cab',engineModel:'V1505-CR-TE5-D40Q4',grossPower:34.9,ptoPower:28.7,ratedRpm:2700,displacementCuIn:91.4,displacementCc:1498,transmission:'HST, 3 ranges',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,length:101.6,width:53.7,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2624,engineOilQt:5.0,transmissionGal:5.5},
  {modelName:'LX3520',modelSlug:'lx3520',versionSlug:'us-current-suhsdc-cab',configuration:'LX3520SUHSDC Special Utility, 4WD, 3-range HST, factory cab',engineModel:'V1505-CR-TE5-D40Q4',grossPower:34.9,ptoPower:28.7,ratedRpm:2700,displacementCuIn:91.4,displacementCc:1498,transmission:'HST, 3 ranges; SU model',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,length:101.6,width:53.7,wheelbase:66.7,groundClearance:12.8,turningRadius:7.5,weight:2590,engineOilQt:5.0,transmissionGal:5.5},
  {modelName:'LX4020',modelSlug:'lx4020',versionSlug:'us-current-hsd-rops',configuration:'LX4020HSD 4WD, 3-range HST, ROPS',engineModel:'V1505-CR-TE5-D40R4',grossPower:39.8,ptoPower:32.6,ratedRpm:2700,displacementCuIn:91.4,displacementCc:1498,transmission:'HST, 3 ranges',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,length:101.6,width:53.7,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2191,engineOilQt:5.0,transmissionGal:5.5},
  {modelName:'LX4020',modelSlug:'lx4020',versionSlug:'us-current-hsdc-cab',configuration:'LX4020HSDC 4WD, 3-range HST, factory cab',engineModel:'V1505-CR-TE5-D40Q3',grossPower:39.8,ptoPower:31.2,ratedRpm:2700,displacementCuIn:91.4,displacementCc:1498,transmission:'HST, 3 ranges',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,length:101.6,width:53.7,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2624,engineOilQt:5.0,transmissionGal:5.5},
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
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.system','PTO system','text',null,20],
  ['PTO','pto.rear_description','Rear PTO','text',null,30],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,10],
  ['Hydraulics','hydraulics.main_pump_capacity','Total hydraulic pump output','decimal','gpm',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,30],
  ['Hydraulics','hydraulics.control_system','Hydraulic control system','text',null,40],
  ['Hydraulics','hitch.lift_capacity_at_points','3-point lift capacity at lift points','decimal','lb',50],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',60],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Capacities','capacities.engine_oil','Engine oil capacity','decimal','US qt',10],
  ['Capacities','capacities.transmission_case','Transmission case capacity','decimal','US gal',20],
  ['Dimensions & Weight','dimensions.overall_length','Overall length without 3-point','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',30],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',40],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius with brake','decimal','ft',50],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',60],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 migration dependency.');
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

export const kubotaLX20CurrentSpecsMigration:DbMigration={
  id:'20260828_181_kubota_lx20_current_specs',
  description:'Add current US Kubota LX20 Series LX2620, LX3520 and LX4020 configuration-specific specification sets',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'LX20 Series','lx20-series')
       ON DUPLICATE KEY UPDATE name='LX20 Series'`,[manufacturerId,equipmentTypeId],
    );
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='lx20-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA LX20 Series brochure - current detailed specifications');
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA LX Series - current US model lineup');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id) throw new Error(`Missing LX20 spec definition ${key}`);return id;};

    const machineIds=new Map<ModelSlug,number>();
    for(const model of [{name:'LX2620',slug:'lx2620'},{name:'LX3520',slug:'lx3520'},{name:'LX4020',slug:'lx4020'}] as const){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA LX20 Series compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.name,model.slug],
      );
      machineIds.set(model.slug,await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]));
    }

    for(const version of versions){
      const machineId=machineIds.get(version.modelSlug);
      if(!machineId) throw new Error(`Missing LX20 machine ${version.modelSlug}`);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.versionSlug,version.configuration,currentSourceId,'Current US LX20 configuration confirmed by Kubota USA; detailed specification values come from the current LX20 brochure.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.versionSlug]);
      const is2620=version.modelSlug==='lx2620';
      const values:Array<[string,string|number,string|null]>=[
        ['engine.make','Kubota',null],
        ['engine.model',version.engineModel,null],
        ['engine.type',is2620?'Indirect injection, vertical, water-cooled 4-cycle diesel':'Direct injection, vertical, water-cooled 4-cycle turbocharged diesel',null],
        ['engine.cylinders',is2620?3:4,null],
        ['engine.displacement_cuin',version.displacementCuIn,'cu in'],
        ['engine.displacement_cc',version.displacementCc,'cm3'],
        ['engine.gross_power',version.grossPower,'hp'],
        ['engine.rated_speed',version.ratedRpm,'rpm'],
        ['transmission.standard',version.transmission,null],
        ['drivetrain.type','4WD',null],
        ['pto.rated_power',version.ptoPower,'hp'],
        ['pto.system','Independent PTO',null],
        ['pto.rear_description','540 rpm rear PTO',null],
        ['hydraulics.system_type','Open center, dual pump',null],
        ['hydraulics.main_pump_capacity',version.pumpGpm,'gpm'],
        ['hitch.category','Category I',null],
        ['hydraulics.control_system','Position control valve',null],
        ['hitch.lift_capacity_at_points',version.liftAtPoints,'lb'],
        ['hitch.lift_capacity_24in',version.liftAt24,'lb'],
        ['steering.type','Hydrostatic power steering',null],
        ['brakes.type','Multi-plate wet disc',null],
        ['capacities.engine_oil',version.engineOilQt,'US qt'],
        ['capacities.transmission_case',version.transmissionGal,'US gal'],
        ['dimensions.overall_length',version.length,'in'],
        ['dimensions.overall_width',version.width,'in'],
        ['dimensions.wheelbase',version.wheelbase,'in'],
        ['dimensions.ground_clearance',version.groundClearance,'in'],
        ['dimensions.turning_radius',version.turningRadius,'ft'],
        ['weight.tractor',version.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);
    }
  },
};
