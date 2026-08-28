import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug:string; model:string; grossHp:number; ptoHp:number; emissions:string };

const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/powerstar-tractors';
const SOURCE_EXTERNAL_ID = 'new-holland-powerstar-current-us-2026-08';
const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  { slug:'powerstar-75', model:'PowerStar 75', grossHp:74, ptoHp:65, emissions:'Tier 4B Final - DOC + Light CEGR' },
  { slug:'powerstar-90', model:'PowerStar 90', grossHp:86, ptoHp:73, emissions:'Tier 4B Final - ECOBlue Compact HI-eSCR + Light CEGR' },
  { slug:'powerstar-100', model:'PowerStar 100', grossHp:99, ptoHp:85, emissions:'Tier 4B Final - ECOBlue Compact HI-eSCR + Light CEGR' },
  { slug:'powerstar-110', model:'PowerStar 110', grossHp:107, ptoHp:93, emissions:'Tier 4B Final - ECOBlue Compact HI-eSCR + Light CEGR' },
  { slug:'powerstar-120', model:'PowerStar 120', grossHp:117, ptoHp:100, emissions:'Tier 4B Final - ECOBlue Compact HI-eSCR + Light CEGR' },
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('New Holland PowerStar dependency missing');return Number(r[0].id)}

export const newHollandPowerStarCurrentSpecsMigration:DbMigration={
  id:'20260828_272_new_holland_powerstar_current_specs',
  description:'Add current official US New Holland PowerStar 75/90/100/110/120 specifications',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    let [sources]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);
    let sourceId=sources[0]?.id?Number(sources[0].id):0;
    if(!sourceId){const[result]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);sourceId=Number(result.insertId)}
    const [records]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=records[0]?.id?Number(records[0].id):0;
    if(!sourceRecordId){const[result]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title) VALUES(?,?,?,'New Holland US PowerStar Series current specifications')`,[sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID]);sourceRecordId=Number(result.insertId)}

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'PowerStar Series','powerstar-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId]);
    const seriesId=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='powerstar-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    const defs:Array<[string,string,string,string,string|null,number]>=[
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,2],
      ['Engine','engine.make','Engine manufacturer','text',null,1],
      ['Engine','engine.model','Engine model','text',null,2],
      ['Engine','engine.cylinders','Cylinders','integer',null,4],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.gross_power','Gross engine power','decimal','hp',10],
      ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',30],
      ['Engine','engine.aspiration','Aspiration','text',null,40],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Maintenance','maintenance.engine_service_interval','Engine service interval','integer','hours',10],
      ['Transmission','transmission.standard','Standard transmission','text',null,10],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
    ];
    for(const d of defs)await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);

    for(const m of models){
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US New Holland PowerStar utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,[manufacturerId,equipmentTypeId,seriesId,m.model,m.slug]);
      const machineId=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Cab or ROPS utility tractor',TRUE,?,'Official New Holland North America current PowerStar data captured August 2026.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,VERSION,sourceRecordId]);
      const versionId=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION]);
      const vals:Array<[string,string|number,string|null]>=[
        ['configuration.station','Cab or ROPS',null],['configuration.drive','2WD or 4WD',null],['engine.make','FPT',null],['engine.model','F5C',null],['engine.cylinders',4,null],['engine.displacement',3.4,'L'],['engine.gross_power',m.grossHp,'hp'],['engine.rated_speed',2300,'rpm'],['engine.aspiration','Turbocharged / aftercooled',null],['engine.emissions',m.emissions,null],['maintenance.engine_service_interval',600,'hours'],['transmission.standard','12x12 synchronized transmission with power shuttle',null],['pto.rated_power',m.ptoHp,'hp'],
      ];
      for(const[k,v,u]of vals){const defId=await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[k]);await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,defId,typeof v==='string'?v:null,typeof v==='number'?v:null,u,sourceRecordId])}
    }
  }
};