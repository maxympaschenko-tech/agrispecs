import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Loader = [string,string,string,number,number,string[],string];
const URL='https://www.masseyferguson.com/en_us/products/materials-handling/professional-loaders.html';
const L:Loader[]=[
['MF FL.3522','mf-fl-3522','Non self leveling',140,2760,['mf-4707','mf-4709','mf-4710'],'MF 4700 Series'],
['MF FL.3615','mf-fl-3615','Mechanical self leveling',140,3420,['mf-4707','mf-4709','mf-4710'],'MF 4700 Series'],
['MF FL.3723','mf-fl-3723','Non self leveling',149,2840,['mf-5710','mf-5710-d','mf-5711','mf-6712','mf-6713'],'MF 5700 Series and MF 6700 Series'],
['MF FL.3819','mf-fl-3819','Mechanical self leveling',149,4230,['mf-5710','mf-5710-d','mf-5711','mf-6712','mf-6713'],'MF 5700 Series and MF 6700 Series'],
['MF FL.4121','mf-fl-4121','Mechanical self leveling',160,2870,['mf-5s-115','mf-5s-135','mf-5s-145'],'MF 5S Series'],
['MF FL.4124','mf-fl-4124','Mechanical self leveling',160,4370,['mf-6s-145','mf-6s-155','mf-6s-165','mf-6s-180'],'MF 6S Series'],
['MF FL.4125','mf-fl-4125','Non self leveling',160,2870,['mf-5s-115','mf-5s-135','mf-5s-145','mf-6s-145','mf-6s-155','mf-6s-165','mf-6s-180'],'MF 5S Series and MF 6S Series'],
['MF FL.4227','mf-fl-4227','Non self leveling',167,3510,['mf-7s-155','mf-7s-165','mf-7s-180','mf-7s-190','mf-7s-210'],'MF 7S Series'],
['MF FL.4327','mf-fl-4327','Mechanical self leveling',167,5450,['mf-7s-155','mf-7s-165','mf-7s-180','mf-7s-190','mf-7s-210'],'MF 7S Series'],
['MF FL.4628','mf-fl-4628','Mechanical self leveling',181,5490,['mf-8s-205','mf-8s-225','mf-8s-245','mf-8s-265','mf-8s-285','mf-8s-305'],'MF 8S Series'],
];
async function id(c:Parameters<DbMigration['apply']>[0],q:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(q,p);if(!r[0])throw Error('MF professional loader dependency missing');return Number(r[0].id)}
export const masseyFergusonProfessionalLoadersMigration:DbMigration={id:'20260829_303_massey_ferguson_professional_loaders',description:'Add 10 current US Massey Ferguson professional loaders and 46 official fitment links',async apply(c){
const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='massey-ferguson' LIMIT 1`);const sid=await id(c,`SELECT id FROM sources WHERE name='Massey Ferguson' AND domain='masseyferguson.com' ORDER BY id LIMIT 1`);const ext='massey-ferguson-professional-loaders-current-us-2026-08';let[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[ext]);let sr=r[0]?.id?Number(r[0].id):0;if(!sr){const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,ext,'Massey Ferguson US Professional Loaders current specifications and compatibility',JSON.stringify({market:'United States',captured:'2026-08-29',loaders:L})]);sr=Number(x.insertId)}
for(const [model,slug,level,height,lift,machines,label] of L){await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'front-loader',?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[mf,model,slug,`${lift.toLocaleString('en-US')} lb to full height @ 31.5 in forward of pivot pin`,`${height} in @ pivot pin`,`${level}; official compatibility: ${label}`]);const ai=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,slug]);for(const ms of machines){const mi=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,ms]);await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[mi,ai,`Official current US Massey Ferguson ${model} compatibility for ${label}.`,sr])}}
}};
