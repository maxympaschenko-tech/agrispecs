import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';
type IdRow=RowDataPacket&{id:number};
async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw Error('Farmall Medium Utility A correction dependency missing');return Number(r[0].id)}
const VERSION='united-states-current-2026-08';
const corrected=[
 ['farmall-90a',90,75,'Cab','4WD','electronic power shuttle'],
 ['farmall-100a',101,85,'Cab','4WD','electronic power shuttle'],
 ['farmall-110a',110,93,'Cab','4WD','electronic power shuttle'],
] as const;
export const caseIHFarmallMediumUtilityACorrectionsMigration:DbMigration={id:'20260828_258_case_ih_farmall_medium_utility_a_corrections',description:'Correct current Farmall Medium Utility A 90A/100A/110A official US specs in databases where migration 241 already ran',async apply(c){const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);for(const[slug,hp,pto,station,drive,trans]of corrected){const mi=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,slug]);const vi=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mi,VERSION]);const sr=await id(c,`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[`case-ih-${slug}-current-us`]);for(const[key,value,unit]of [['engine.rated_power',hp,'hp'],['pto.rated_power',pto,'hp'],['configuration.station',station,null],['configuration.drive',drive,null],['transmission.options',trans,null]] as const){const di=await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]);await c.query(`UPDATE machine_specs SET value_text=?,value_number=?,unit=?,source_record_id=?,confidence='official' WHERE machine_id=? AND machine_version_id=? AND spec_definition_id=?`,[typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sr,mi,vi,di])}}}};
