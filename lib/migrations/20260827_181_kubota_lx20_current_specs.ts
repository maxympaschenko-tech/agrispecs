import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

type VersionSeed={
  machine:'lx2620'|'lx3520'|'lx4020';
  modelName:'LX2620'|'LX3520'|'LX4020';
  slug:string;
  configuration:string;
  engineModel:string;
  engineType:string;
  displacement:number;
  grossPower:number;
  ptoPower:number;
  ratedRpm:number;
  transmission:string;
  midPto:string;
  pumpGpm:number;
  liftAtPoints:number;
  liftAt24:number;
  forwardMph:number;
  reverseMph:number;
  fuelGal:number;
  length:number;
  width:number;
  height:number;
  wheelbase:number;
  groundClearance:number;
  turningRadius:number;
  weight:number;
};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/3524_kubota_ktc_lx20_brochure_v9.pdf?sfvrsn=9d0b4c05_8';
const SOURCE_EXTERNAL_ID='kubota-lx20-current-brochure-2026-08';

const versions:VersionSeed[]=[
  {machine:'lx2620',modelName:'LX2620',slug:'us-current-hsd-rops',configuration:'LX2620HSD 4WD, 3-range HST, ROPS',engineModel:'D1305-E4-D36R',engineType:'Indirect injection, vertical, water-cooled 4-cycle diesel',displacement:77.0,grossPower:23.3,ptoPower:19.4,ratedRpm:2500,transmission:'HST, 3 ranges',midPto:'2500 rpm standard',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,forwardMph:11.2,reverseMph:8.4,fuelGal:7.1,length:101.8,width:53.7,height:88.4,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:1775},
  {machine:'lx2620',modelName:'LX2620',slug:'us-current-hsdc-cab',configuration:'LX2620HSDC 4WD, 3-range HST, factory cab',engineModel:'D1305-E4-D26Q',engineType:'Indirect injection, vertical, water-cooled 4-cycle diesel',displacement:77.0,grossPower:23.3,ptoPower:19.4,ratedRpm:2500,transmission:'HST, 3 ranges',midPto:'2500 rpm standard',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,forwardMph:11.2,reverseMph:8.4,fuelGal:8.5,length:103.9,width:53.7,height:84.6,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:2249},
  {machine:'lx2620',modelName:'LX2620',slug:'us-current-su-hsd-rops',configuration:'LX2620SUHSD 4WD, 3-range HST, Special Utility ROPS',engineModel:'D1305-E4-D36R',engineType:'Indirect injection, vertical, water-cooled 4-cycle diesel',displacement:77.0,grossPower:23.3,ptoPower:19.4,ratedRpm:2500,transmission:'HST, 3 ranges',midPto:'Optional',pumpGpm:8.7,liftAtPoints:2139,liftAt24:1676,forwardMph:11.2,reverseMph:8.4,fuelGal:7.1,length:101.8,width:53.7,height:88.4,wheelbase:65.6,groundClearance:14.6,turningRadius:6.9,weight:1775},
  {machine:'lx3520',modelName:'LX3520',slug:'us-current-dtn-narrow-gear',configuration:'LX3520DTN narrow 4WD gear-drive ROPS',engineModel:'V1505-CR-TE5-D40R6',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:34.9,ptoPower:29.6,ratedRpm:2600,transmission:'Gear drive; current Kubota narrow-series page lists 12 forward / 12 reverse',midPto:'Not available',pumpGpm:9.1,liftAtPoints:2348,liftAt24:1819,forwardMph:14.7,reverseMph:14.6,fuelGal:8.5,length:98.2,width:39.4,height:84.0,wheelbase:61.0,groundClearance:12.8,turningRadius:7.5,weight:2154},
  {machine:'lx3520',modelName:'LX3520',slug:'us-current-hsd-rops',configuration:'LX3520HSD 4WD, 3-range HST, ROPS',engineModel:'V1505-CR-TE5-D40R5',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:34.9,ptoPower:28.7,ratedRpm:2700,transmission:'HST, 3 ranges',midPto:'2460 rpm standard',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,forwardMph:17.0,reverseMph:13.0,fuelGal:8.5,length:101.6,width:53.7,height:88.4,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2191},
  {machine:'lx4020',modelName:'LX4020',slug:'us-current-hsd-rops',configuration:'LX4020HSD 4WD, 3-range HST, ROPS',engineModel:'V1505-CR-TE5-D40R4',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:39.8,ptoPower:32.6,ratedRpm:2700,transmission:'HST, 3 ranges',midPto:'2460 rpm standard',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,forwardMph:17.0,reverseMph:13.0,fuelGal:8.5,length:101.6,width:53.7,height:88.2,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2191},
  {machine:'lx3520',modelName:'LX3520',slug:'us-current-hsdc-cab',configuration:'LX3520HSDC 4WD, 3-range HST, factory cab',engineModel:'V1505-CR-TE5-D40Q4',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:34.9,ptoPower:28.7,ratedRpm:2700,transmission:'HST, 3 ranges',midPto:'2460 rpm standard',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,forwardMph:17.0,reverseMph:13.0,fuelGal:8.5,length:101.6,width:53.7,height:85.6,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2624},
  {machine:'lx4020',modelName:'LX4020',slug:'us-current-hsdc-cab',configuration:'LX4020HSDC 4WD, 3-range HST, factory cab',engineModel:'V1505-CR-TE5-D40Q3',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:39.8,ptoPower:31.2,ratedRpm:2700,transmission:'HST, 3 ranges',midPto:'2460 rpm standard',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,forwardMph:17.0,reverseMph:13.0,fuelGal:8.5,length:101.6,width:53.7,height:85.6,wheelbase:66.7,groundClearance:8.9,turningRadius:7.5,weight:2624},
  {machine:'lx3520',modelName:'LX3520',slug:'us-current-su-hsdc-cab',configuration:'LX3520SUHSDC 4WD, 3-range HST, Special Utility factory cab',engineModel:'V1505-CR-TE5-D40Q4',engineType:'Direct injection, vertical, water-cooled 4-cycle turbo diesel',displacement:91.4,grossPower:34.9,ptoPower:28.7,ratedRpm:2700,transmission:'HST, 3 ranges',midPto:'Optional',pumpGpm:9.5,liftAtPoints:2535,liftAt24:1962,forwardMph:17.0,reverseMph:13.0,fuelGal:8.5,length:101.6,width:53.7,height:85.6,wheelbase:66.7,groundClearance:12.8,turningRadius:7.5,weight:2590},
];

const definitions=[
  ['Engine','engine.make','Engine manufacturer','text',null,1],['Engine','engine.model','Engine model','text',null,2],['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],['Engine','engine.gross_power','Gross engine power','decimal','hp',7],['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['Transmission','transmission.standard','Transmission','text',null,10],['Transmission','drivetrain.type','Driveline','text',null,20],['Transmission','transmission.forward_speed','Maximum forward speed','decimal','mph',30],['Transmission','transmission.reverse_speed','Maximum reverse speed','decimal','mph',40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],['PTO','pto.rear_description','Rear PTO','text',null,20],['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.main_pump_capacity','Total hydraulic pump output','decimal','gpm',10],['Hydraulics','hitch.category','3-point hitch category','text',null,20],['Hydraulics','hitch.lift_capacity_at_points','3-point lift capacity at lift point','decimal','lb',30],['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',40],
  ['Steering & Brakes','steering.type','Steering','text',null,10],['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length without 3-point','decimal','in',10],['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],['Dimensions & Weight','dimensions.turning_radius','Turning radius with brake','decimal','ft',60],['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',70],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing Kubota LX20 migration dependency.');return Number(rows[0].id);}
async function upsertSpec(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceRecordId:number,value:string|number,unit:string|null=null){await connection.query(`INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES (?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);}

export const kubotaLX20CurrentSpecsMigration:DbMigration={
  id:'20260827_181_kubota_lx20_current_specs',
  description:'Add nine current US Kubota LX20 cab, ROPS, SU and narrow configuration-specific specification sets from the current manufacturer brochure',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'LX20 Series','lx20-series') ON DUPLICATE KEY UPDATE name='LX20 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='lx20-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA LX20 Series current brochure - configuration-specific specifications']);sourceRecordId=Number(result.insertId);}

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));}
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing LX20 spec definition ${key}`);return id;};

    for(const v of versions){
      await connection.query(`INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES (?,?,?,?,?,'Current Kubota USA LX20 Series compact tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[manufacturerId,equipmentTypeId,seriesId,v.modelName,v.machine]);
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,v.machine]);
      await connection.query(`INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES (?,?,'US','United States',?,TRUE,?,'Current Kubota USA LX20 brochure. Cab, ROPS, SU and narrow configurations are kept separate because PTO, dimensions, weight and implement compatibility differ.') ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,v.slug,v.configuration,sourceRecordId]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,v.slug]);
      const values:Array<[string,string|number,string|null]>=[
        ['engine.make','Kubota',null],['engine.model',v.engineModel,null],['engine.type',v.engineType,null],['engine.displacement_cuin',v.displacement,'cu in'],['engine.gross_power',v.grossPower,'hp'],['engine.rated_speed',v.ratedRpm,'rpm'],
        ['transmission.standard',v.transmission,null],['drivetrain.type','4WD',null],['transmission.forward_speed',v.forwardMph,'mph'],['transmission.reverse_speed',v.reverseMph,'mph'],
        ['pto.rated_power',v.ptoPower,'hp'],['pto.rear_description','540 rpm rear PTO',null],['pto.mid_description',v.midPto,null],
        ['hydraulics.main_pump_capacity',v.pumpGpm,'gpm'],['hitch.category','SAE Category I',null],['hitch.lift_capacity_at_points',v.liftAtPoints,'lb'],['hitch.lift_capacity_24in',v.liftAt24,'lb'],
        ['steering.type','Hydrostatic power steering',null],['brakes.type','Multi-plate wet disc',null],['capacities.fuel_tank_variants',`${v.fuelGal} US gal`,null],
        ['dimensions.overall_length',v.length,'in'],['dimensions.overall_width',v.width,'in'],['dimensions.overall_height',v.height,'in'],['dimensions.wheelbase',v.wheelbase,'in'],['dimensions.ground_clearance',v.groundClearance,'in'],['dimensions.turning_radius',v.turningRadius,'ft'],['weight.tractor',v.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),sourceRecordId,value,unit);
    }
  },
};
