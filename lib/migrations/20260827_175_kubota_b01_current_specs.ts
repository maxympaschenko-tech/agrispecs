import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type Confidence='official'|'high';

type ModelSeed={
  modelName:'B2301'|'B2601'|'B2401DT'|'B2401DTN';
  slug:'b2301'|'b2601'|'b2401dt'|'b2401dtn';
  versionSlug:'us-current-hst-4wd'|'us-current-gear-4wd'|'us-current-gear-narrow-4wd';
  configuration:string;
  engineModel:'D1005'|'D1105';
  grossPower:number;
  ptoPower:number;
  ratedRpm:number;
  displacementCuIn:number;
  displacementCc:number;
  transmission:string;
  ptoType:string;
  midPto:string;
  pumpGpm:number;
  liftAtPoints:number;
  liftAt24:number;
  steering:string;
  forwardMph:number;
  reverseMph:number;
  length:number;
  width:number;
  wheelbase:number;
  groundClearance:number;
  weight:number;
  currentPowerConfidence:Confidence;
};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-b01-current';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/b01-series-brochure.pdf';
const DETAIL_EXTERNAL_ID='kubota-b01-detail-brochure-us';

const models:ModelSeed[]=[
  {
    modelName:'B2301',slug:'b2301',versionSlug:'us-current-hst-4wd',configuration:'B2301HSD 4WD, 3-range HST, ROPS',
    engineModel:'D1005',grossPower:20.9,ptoPower:17.4,ratedRpm:2800,displacementCuIn:61.1,displacementCc:1001,
    transmission:'HST, 3 ranges',ptoType:'Independent',midPto:'2500 rpm',pumpGpm:8.3,liftAtPoints:1808,liftAt24:1411,
    steering:'Hydraulic power steering',forwardMph:11.8,reverseMph:8.9,length:93.7,width:45.3,wheelbase:61.4,groundClearance:12.0,weight:1566,currentPowerConfidence:'official',
  },
  {
    modelName:'B2601',slug:'b2601',versionSlug:'us-current-hst-4wd',configuration:'B2601HSD current US revision, 4WD, 3-range HST, ROPS',
    engineModel:'D1105',grossPower:23.3,ptoPower:19.4,ratedRpm:2800,displacementCuIn:68.5,displacementCc:1123,
    transmission:'HST, 3 ranges',ptoType:'Independent',midPto:'2500 rpm',pumpGpm:8.3,liftAtPoints:1808,liftAt24:1411,
    steering:'Hydraulic power steering',forwardMph:12.7,reverseMph:9.5,length:94.9,width:49.0,wheelbase:61.4,groundClearance:12.8,weight:1632,currentPowerConfidence:'high',
  },
  {
    modelName:'B2401DT',slug:'b2401dt',versionSlug:'us-current-gear-4wd',configuration:'B2401DT 4WD, 9 forward / 3 reverse gear transmission, ROPS',
    engineModel:'D1105',grossPower:21.9,ptoPower:19.2,ratedRpm:2600,displacementCuIn:68.5,displacementCc:1123,
    transmission:'Gear, 9 forward / 3 reverse',ptoType:'Transmission driven with one-way clutch',midPto:'2500 rpm',pumpGpm:7.0,liftAtPoints:1653,liftAt24:1290,
    steering:'Integral type power steering',forwardMph:11.7,reverseMph:6.0,length:93.7,width:48.8,wheelbase:61.4,groundClearance:12.2,weight:1521,currentPowerConfidence:'official',
  },
  {
    modelName:'B2401DTN',slug:'b2401dtn',versionSlug:'us-current-gear-narrow-4wd',configuration:'B2401DTN narrow 4WD, 9 forward / 3 reverse gear transmission, ROPS',
    engineModel:'D1105',grossPower:21.9,ptoPower:19.2,ratedRpm:2600,displacementCuIn:68.5,displacementCc:1123,
    transmission:'Gear, 9 forward / 3 reverse',ptoType:'Transmission driven with one-way clutch',midPto:'Not available on B2401DTN narrow model',pumpGpm:7.0,liftAtPoints:1653,liftAt24:1290,
    steering:'Integral type power steering',forwardMph:10.9,reverseMph:5.6,length:92.8,width:35.6,wheelbase:61.4,groundClearance:11.0,weight:1433,currentPowerConfidence:'official',
  },
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
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,10],
  ['Hydraulics','hydraulics.main_pump_capacity','Total hydraulic pump output','decimal','gpm',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,30],
  ['Hydraulics','hitch.lift_capacity_at_points','3-point lift capacity at lift points','decimal','lb',40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length without 3-point','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',30],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',40],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius with brake','decimal','ft',50],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',60],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota B01 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}

async function upsertSpec(
  connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,
  sourceRecordId:number,value:string|number,unit:string|null=null,confidence:Confidence='official',
){
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence=VALUES(confidence)`,
    [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId,confidence],
  );
}

export const kubotaB01CurrentSpecsMigration:DbMigration={
  id:'20260827_175_kubota_b01_current_specs',
  description:'Add current US Kubota B01 Series B2301, B2601, B2401DT and B2401DTN specification sets with B2601 revision-conflict provenance',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'B01 Series','b01-series')
       ON DUPLICATE KEY UPDATE name='B01 Series'`,
      [manufacturerId,equipmentTypeId],
    );
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='b01-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current B01 Series lineup and revision values');
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA B01 Series brochure - detailed mechanical specifications');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing B01 spec definition ${key}`);return id;};

    for(const model of models){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA B01 Series compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.modelName,model.slug],
      );
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      const notes=model.slug==='b2601'
        ? 'Current 2025-2026 Full Product Line lists B2601 at 23.3 gross HP / 19.4 PTO HP, while older B01 brochure and some current marketing copy still show 24.3 / 19.5. Current-version power values are retained with high confidence to expose this source conflict rather than silently mixing revisions.'
        : 'Current Kubota USA B01 configuration. Current full-line values are used for power, dimensions and weight; stable mechanical details come from the official B01 brochure.';
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,model.versionSlug,model.configuration,currentSourceId,notes],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,model.versionSlug]);

      const detailValues:Array<[string,string|number,string|null]>=[
        ['engine.make','Kubota',null],['engine.model',model.engineModel,null],['engine.type','E-TVCS, liquid-cooled, 3-cylinder diesel',null],['engine.cylinders',3,null],
        ['engine.displacement_cc',model.displacementCc,'cm3'],['engine.rated_speed',model.ratedRpm,'rpm'],['transmission.standard',model.transmission,null],['drivetrain.type','4WD',null],
        ['pto.system',model.ptoType,null],['pto.rear_description','540 rpm rear PTO',null],['pto.mid_description',model.midPto,null],['hydraulics.system_type','Open center, dual pump',null],
        ['hydraulics.main_pump_capacity',model.pumpGpm,'gpm'],['hitch.category','SAE Category I',null],['hitch.lift_capacity_at_points',model.liftAtPoints,'lb'],['hitch.lift_capacity_24in',model.liftAt24,'lb'],
        ['steering.type',model.steering,null],['brakes.type','Multi-plate wet disc',null],['capacities.fuel_tank_variants','6.1 US gal (23 L)',null],['dimensions.wheelbase',model.wheelbase,'in'],['dimensions.turning_radius',6.9,'ft'],
      ];
      for(const [key,value,unit] of detailValues) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);

      const currentValues:Array<[string,string|number,string|null,Confidence?]>=[
        ['engine.displacement_cuin',model.displacementCuIn,'cu in'],['engine.gross_power',model.grossPower,'hp',model.currentPowerConfidence],['pto.rated_power',model.ptoPower,'hp',model.currentPowerConfidence],
        ['transmission.forward_speed',model.forwardMph,'mph'],['transmission.reverse_speed',model.reverseMph,'mph'],['dimensions.overall_length',model.length,'in'],['dimensions.overall_width',model.width,'in'],
        ['dimensions.ground_clearance',model.groundClearance,'in'],['weight.tractor',model.weight,'lb'],
      ];
      for(const [key,value,unit,confidence] of currentValues) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit,confidence||'official');
    }
  },
};
