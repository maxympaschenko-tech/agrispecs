import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug:string; name:string; url:string; grossHp:number; ptoHp:number; transmission:string; speeds:string; steeringGpm:number; totalGpm:number; weightLb:number;
};

const VERSION = 'united-states-previous-mt2e-generation';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/themes/weicks-media-base-theme/brochures/LS-Tractor-Brochure_MT2EC.pdf';
const models:Seed[] = [
  { slug:'mt235ec', name:'MT235EC', url:'https://lstractorusa.com/tractor/mt235ec/', grossHp:35, ptoHp:29.7, transmission:'Synchro Shuttle', speeds:'F12 x R12', steeringGpm:4.1, totalGpm:12.3, weightLb:3589 },
  { slug:'mt235hec', name:'MT235HEC', url:'https://lstractorusa.com/tractor/mt235hec/', grossHp:35, ptoHp:28, transmission:'HST', speeds:'3 ranges', steeringGpm:5.5, totalGpm:13.7, weightLb:3655 },
  { slug:'mt240hec', name:'MT240HEC', url:'https://lstractorusa.com/tractor/mt240hec/', grossHp:40, ptoHp:32, transmission:'HST', speeds:'3 ranges', steeringGpm:5.5, totalGpm:13.7, weightLb:3661 },
];

const definitions:Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1], ['Engine','engine.model','Engine model','text',null,3], ['Engine','engine.type','Engine type','text',null,4], ['Engine','emissions.standard','Emissions standard','text',null,5], ['Engine','engine.displacement','Engine displacement','decimal','L',6], ['Engine','engine.gross_power','Gross engine power','decimal','hp',8], ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10], ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20], ['Transmission','brakes.type','Brakes','text',null,30], ['Transmission','steering.type','Steering','text',null,40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10], ['PTO','pto.type','PTO type','text',null,15], ['PTO','pto.rear_description','Rear PTO','text',null,20], ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.control_system','Hydraulic control system','text',null,5], ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',10], ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20], ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','gpm',30], ['Hydraulics','hitch.category','3-point hitch category','text',null,40], ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity at hitch end','decimal','lb',50], ['Hydraulics','hydraulics.remote_valves','Remote valves','text',null,60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10], ['Electrical','electrical.alternator','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10], ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20], ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30], ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40], ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight without ballast','decimal','lb',70],
  ['Tires','tires.ag','Ag tires front / rear','text',null,10], ['Tires','tires.industrial','Industrial tires front / rear','text',null,20], ['Tires','tires.turf','Turf tires front / rear','text',null,30],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await c.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('LS Tractor Previous MT2E Cab dependency missing');return Number(rows[0].id);}
async function ensureSource(c:Parameters<DbMigration['apply']>[0],sourceId:number,externalId:string,url:string,title:string,raw:unknown){const [rows]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(rows[0])return Number(rows[0].id);const [inserted]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sourceId,url,externalId,title,JSON.stringify(raw)]);return Number(inserted.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceRecordId:number,value:string|number,unit:string|null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);}

export const lsTractorPreviousMt2eCabUsMigration:DbMigration={
  id:'20260830_393_ls_tractor_previous_mt2e_cab_us',
  description:'Archive previous-generation MT235EC, MT235HEC and MT240HEC separately from current New MT2E',
  async apply(c){
    const manufacturerId=await id(c,`SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);const equipmentTypeId=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);const sourceId=await id(c,`SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);const seriesId=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-previous-mt2e-series' LIMIT 1`,[manufacturerId]);
    const brochureSource=await ensureSource(c,sourceId,'ls-tractor-previous-mt2e-cab-generation-brochure',BROCHURE_URL,'LS Tractor MT2E Cabin Series generation brochure',{
      generation:'Previous MT2E', models:models.map(m=>m.name), normalization:{displacement:'114.7 cu in stored as 1.88 L',fuel:'12.4 US gal stored as 46.9 L'},
      sourceConflicts:[
        'The generation cabin brochure publishes 62 in overall width and 69 in wheelbase. Current individual HTML pages publish 69 in width and 62 in wheelbase, indicating the same transposition seen on ROPS HTML pages. Archive normalization follows the generation brochure.',
        'The generation brochure publishes 25 x 8.5-14 industrial front tires, while current HTML pages publish 27x8.50-14. Archive normalization follows the generation brochure.',
        'The generation brochure backhoe table names LB2104 but labels its tractor application XR3100 Series rather than MT2E. Current cab HTML pages list LB1105. No cab backhoe fitment is normalized in this migration; it is deferred to attachment provenance review.'
      ]
    });
    const definitionIds=new Map<string,number>();for(const row of definitions){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);definitionIds.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]));}
    for(const m of models){
      const liveSource=await ensureSource(c,sourceId,`ls-tractor-${m.slug}-previous-html-2026-08`,m.url,`LS Tractor ${m.name} still-published US cab model page`,{market:'United States',captured:'2026-08-30',generation:'Previous MT2E',role:'Availability/HTML cross-check; generation cabin brochure is primary for archive geometry and tires.'});
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Previous-generation US LS Tractor MT2E cab tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[manufacturerId,equipmentTypeId,seriesId,m.name,m.slug]);
      const machineId=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,m.slug]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,FALSE,?,'Previous-generation LS Tractor MT2E cab configuration; archive-only and intentionally excluded from current-model filters.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,VERSION,`Cab; ${m.transmission}; ${m.speeds}`,liveSource]);
      const versionId=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION]);
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station','Cab',null],['engine.model','L3C19-T',null],['engine.type','Vertical water-cooled 4-cycle diesel engine',null],['emissions.standard','Tier 4',null],['engine.displacement',1.88,'L'],['engine.gross_power',m.grossHp,'hp'],['engine.rated_speed',2600,'rpm'],
        ['transmission.standard',m.transmission,null],['transmission.speeds',m.speeds,null],['brakes.type','Wet, multi-disc',null],['steering.type','Hydrostatic power steering',null],['pto.rated_power',m.ptoHp,'hp'],['pto.type','Independent',null],['pto.rear_description','540 rpm standard',null],['pto.mid_description','2,000 rpm optional',null],
        ['hydraulics.control_system','Position / Draft',null],['hydraulics.main_pump_capacity',8.2,'gpm'],['hydraulics.power_steering_pump_capacity',m.steeringGpm,'gpm'],['hydraulics.total_flow',m.totalGpm,'gpm'],['hitch.category','Category I',null],['hitch.lift_capacity',1808,'lb'],['hydraulics.remote_valves','Optional',null],
        ['capacities.fuel_tank',46.9,'L'],['electrical.alternator','12 V / 70 A',null],['dimensions.overall_length',128.3,'in'],['dimensions.overall_width',62,'in'],['dimensions.overall_height',86.6,'in'],['dimensions.wheelbase',69,'in'],['dimensions.unladen_weight',m.weightLb,'lb'],['tires.ag','7-14 / 11.2-24',null],['tires.industrial','25 x 8.5-14 / 43 x 16-20',null],['tires.turf','25 x 8.5-14 / 41 x 14-20',null],
      ];
      for(const [key,value,unit] of values){const definitionId=definitionIds.get(key);if(!definitionId)throw new Error(`Missing Previous MT2E Cab spec definition ${key}`);await put(c,machineId,versionId,definitionId,brochureSource,value,unit);}
    }
  }
};
