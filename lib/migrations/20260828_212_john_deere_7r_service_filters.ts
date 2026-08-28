import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSeed={slug:string;engine:'6.8L'|'9.0L'};
type PartSeed={number:string;name:string;category:string;note:string};

const GUIDE_URL='https://www.deere.com/assets/pdfs/common/qrg/rx532521.pdf';
const GUIDE_EXTERNAL_ID='john-deere-rx532521-7r-ft4-110101-service-guide';
const VERSION_SLUG='united-states-current-2026-08';

const models:ModelSeed[]=[
  {slug:'7r-210',engine:'6.8L'},{slug:'7r-230',engine:'6.8L'},{slug:'7r-250',engine:'6.8L'},{slug:'7r-270',engine:'6.8L'},
  {slug:'7r-290',engine:'9.0L'},{slug:'7r-310',engine:'9.0L'},{slug:'7r-330',engine:'9.0L'},{slug:'7r-350',engine:'9.0L'},
];

const commonCurrent:PartSeed[]=[
  {number:'AT365869',name:'Fuel Water Separator Filter',category:'fuel-water-separators',note:'Fuel water separator filter, if equipped; Deere guide interval 500 hours.'},
  {number:'RE564863',name:'Primary Engine Air Filter',category:'air-filters',note:'Primary engine air filter; Deere guide interval 1000 hours or annually/as indicated.'},
  {number:'F071151',name:'Secondary Engine Air Filter',category:'air-filters',note:'Secondary engine air filter; Deere guide interval 1000 hours or annually/as indicated.'},
  {number:'RE284091',name:'Cab Fresh Air Filter',category:'cabin-air-filters',note:'Cab fresh-air filter; Deere guide interval 1000 hours or annually.'},
  {number:'RE593819',name:'Cab Recirculation Air Filter',category:'cabin-air-filters',note:'Cab recirculation-air filter; Deere guide interval 1000 hours or annually.'},
  {number:'H216169',name:'Fuel / DEF Tank Vent Filter',category:'vent-filters',note:'Vent filter used by the fuel-tank and DEF-tank vent service positions; Deere guide interval 1500 hours.'},
  {number:'RE577612',name:'Hydraulic Oil Filter Element',category:'hydraulic-filters',note:'Hydraulic oil filter element; Deere guide interval 1500 hours.'},
  {number:'DZ114640',name:'DEF Supply Module Filter',category:'def-filters',note:'DEF supply-module filter; Deere guide interval 3000 hours or 3 years.'},
  {number:'DZ124403',name:'DEF Inline Filter',category:'def-filters',note:'DEF inline filter; Deere guide interval 3000 hours or 3 years.'},
  {number:'LVU14258',name:'Front PTO Oil Filter',category:'pto-filters',note:'Front PTO oil filter, applicable when front PTO is installed; initial 250 hours then every 1500 hours.'},
  {number:'HXE135862',name:'Air Dryer Filter Element',category:'air-dryer-filters',note:'Air-dryer filter element; Deere guide replacement at least every 2 years.'},
];

const engine68:PartSeed[]=[
  {number:'DZ115391',name:'Primary Fuel Filter Element - 6.8L',category:'fuel-filters',note:'Primary fuel filter for 6.8 L 7R engine; Deere guide interval 500 hours/as indicated.'},
  {number:'DZ115392',name:'Secondary Fuel Filter Element - 6.8L',category:'fuel-filters',note:'Secondary fuel filter for 6.8 L 7R engine; Deere guide interval 500 hours/as indicated.'},
  {number:'DZ105100',name:'Open Crankcase Ventilation Filter - 6.8L',category:'crankcase-vent-filters',note:'Open crankcase ventilation filter for 6.8 L 7R engine; Deere guide interval 1500 hours.'},
  {number:'RE539279',name:'Engine Oil Filter - 6.8L',category:'engine-oil-filters',note:'Engine oil filter for 6.8 L 7R engine; Deere guide allows extended 500-hour interval only under stated oil/fuel conditions.'},
];
const engine90Current:PartSeed[]=[
  {number:'RE539465',name:'Primary Fuel Filter Element - 9.0L',category:'fuel-filters',note:'Primary fuel filter for 9.0 L 7R engine; Deere guide interval 500 hours/as indicated.'},
  {number:'DZ110558',name:'Secondary Fuel Filter Element - 9.0L',category:'fuel-filters',note:'Secondary fuel filter for 9.0 L 7R tractors serial 126000 and later; Deere guide interval 500 hours/as indicated.'},
  {number:'RE509672',name:'Engine Oil Filter - 9.0L',category:'engine-oil-filters',note:'Engine oil filter for 9.0 L 7R engine; Deere guide allows extended 500-hour interval only under stated oil/fuel conditions.'},
];
const legacyParts:PartSeed[]=[
  {number:'DZ112918',name:'Secondary Fuel Filter Element - 9.0L Early Serial',category:'fuel-filters',note:'9.0 L secondary fuel filter for serial numbers through 125999.'},
  {number:'RE269061',name:'SCV Oil Filter Kit - Early Serial',category:'hydraulic-filters',note:'SCV oil filter for serial numbers through 134999.'},
  {number:'TA21586',name:'SCV Oil Filter - Current Serial',category:'hydraulic-filters',note:'SCV oil filter for serial 135001 and later; Deere guide interval 1500 hours.'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing John Deere 7R service-filter dependency.');
  return Number(rows[0].id);
}
async function ensureCategory(connection:Parameters<DbMigration['apply']>[0],filtersId:number,name:string,slug:string){
  await connection.query(`INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,[filtersId,name,slug]);
  return selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[slug]);
}
async function link(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number|null,partId:number,sourceRecordId:number,note:string,serialFrom:string|null=null,serialTo:string|null=null){
  const [rows]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND ((machine_version_id=? ) OR (machine_version_id IS NULL AND ? IS NULL)) AND part_id=? AND serial_prefix IS NULL AND ((serial_from=? ) OR (serial_from IS NULL AND ? IS NULL)) AND ((serial_to=? ) OR (serial_to IS NULL AND ? IS NULL)) ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,versionId,partId,serialFrom,serialFrom,serialTo,serialTo],
  );
  const configurationNote=versionId
    ? 'Current US 7R service reference. Confirm tractor serial number and installed options before ordering.'
    : 'Historical FT4 110101+ serial-specific service reference. Confirm exact serial before ordering.';
  if(rows[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='official',serial_from=?,serial_to=? WHERE id=?`,[note,configurationNote,sourceRecordId,serialFrom,serialTo,Number(rows[0].id)]);
  }else{
    await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,serial_from,serial_to,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,?,?, 'official')`,[machineId,versionId,partId,serialFrom,serialTo,note,configurationNote,sourceRecordId]);
  }
}

export const johnDeere7RServiceFiltersMigration:DbMigration={
  id:'20260828_212_john_deere_7r_service_filters',
  description:'Add official John Deere 7R FT4 110101+ engine-specific and serial-specific service filter fitments from RX532521',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    const categoryDefs=[
      ['Engine Oil Filters','engine-oil-filters'],['Fuel Filters','fuel-filters'],['Air Filters','air-filters'],['Hydraulic Filters','hydraulic-filters'],
      ['Cabin Air Filters','cabin-air-filters'],['Fuel / Water Separators','fuel-water-separators'],['DEF Filters','def-filters'],['Vent Filters','vent-filters'],
      ['PTO Filters','pto-filters'],['Air Dryer Filters','air-dryer-filters'],['Crankcase Vent Filters','crankcase-vent-filters'],
    ] as const;
    const categoryIds=new Map<string,number>();
    for(const [name,slug] of categoryDefs) categoryIds.set(slug,await ensureCategory(connection,filtersId,name,slug));

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[GUIDE_EXTERNAL_ID]);
    let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,[sourceId,GUIDE_URL,GUIDE_EXTERNAL_ID,'John Deere 7R FT4 110101+ Replacement Parts Guide - filter overview and service intervals','2024-04-01']);
      sourceRecordId=Number(result.insertId);
    }

    const allParts=[...commonCurrent,...engine68,...engine90Current,...legacyParts];
    const partIds=new Map<string,number>();
    for(const part of allParts){
      const categoryId=categoryIds.get(part.category);
      if(!categoryId) throw new Error(`Missing 7R part category ${part.category}`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number.toUpperCase(),part.name,`John Deere official 7R FT4 110101+ service reference. ${part.note}`],
      );
      partIds.set(part.number,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.number.toUpperCase()]));
    }

    for(const model of models){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,[model.slug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=1 LIMIT 1`,[machineId,VERSION_SLUG]);
      for(const part of commonCurrent){
        const partId=partIds.get(part.number); if(!partId) throw new Error(`Missing 7R part ${part.number}`);
        await link(connection,machineId,versionId,partId,sourceRecordId,part.note);
      }
      const currentScv=legacyParts.find((p)=>p.number==='TA21586')!;
      await link(connection,machineId,versionId,partIds.get('TA21586')!,sourceRecordId,currentScv.note,'135001',null);
      const oldScv=legacyParts.find((p)=>p.number==='RE269061')!;
      await link(connection,machineId,null,partIds.get('RE269061')!,sourceRecordId,oldScv.note,null,'134999');

      if(model.engine==='6.8L'){
        for(const part of engine68){
          const partId=partIds.get(part.number); if(!partId) throw new Error(`Missing 7R 6.8L part ${part.number}`);
          await link(connection,machineId,versionId,partId,sourceRecordId,part.note);
        }
      }else{
        for(const part of engine90Current){
          const partId=partIds.get(part.number); if(!partId) throw new Error(`Missing 7R 9.0L part ${part.number}`);
          const serialFrom=part.number==='DZ110558'?'126000':null;
          await link(connection,machineId,versionId,partId,sourceRecordId,part.note,serialFrom,null);
        }
        const early=legacyParts.find((p)=>p.number==='DZ112918')!;
        await link(connection,machineId,null,partIds.get('DZ112918')!,sourceRecordId,early.note,null,'125999');
      }
    }
  },
};