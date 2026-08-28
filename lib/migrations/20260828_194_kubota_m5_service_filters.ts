import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m5-091'|'m5-111';
type VariantSource={
  modelSlug:ModelSlug;
  versionSlug:string;
  url:string;
  externalId:string;
  title:string;
  isCab:boolean;
};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;description:string};

const coreParts:PartSeed[]=[
  {partNumber:'HH1C0-32430',normalized:'HH1C032430',name:'Engine Oil Filter',categorySlug:'engine-oil-filters',description:'Kubota engine oil filter used across multiple utility-tractor applications; exact fitment is stored per tractor version.'},
  {partNumber:'59700-26112',normalized:'5970026112',name:'Outer Air Cleaner Element',categorySlug:'engine-air-filters',description:'Kubota outer engine-air cleaner element; exact fitment is stored per tractor version.'},
  {partNumber:'HHTA0-37710',normalized:'HHTA037710',name:'Hydraulic Oil Filter',categorySlug:'hydraulic-filters',description:'Kubota hydraulic oil filter; exact fitment is stored per tractor version.'},
];

const cabParts:PartSeed[]=[
  {partNumber:'6A671-75090',normalized:'6A67175090',name:'Cabin Air Recirculation Filter',categorySlug:'cabin-air-filters',description:'Kubota cab HVAC recirculation filter; exact fitment is stored per tractor version.'},
  {partNumber:'T1855-71600',normalized:'T185571600',name:'Cab Air Filter',categorySlug:'cabin-air-filters',description:'Kubota cab air filter used on supported M-series cab tractors; exact fitment is stored per tractor version.'},
];

const variants:VariantSource[]=[
  {modelSlug:'m5-091',versionSlug:'us-current-hf-2wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-091hf-hf-1/electrical-system/a55001-alternator-component-parts-not-for-reman-unit',externalId:'messicks-m5-091hf-service-filters-2026-08',title:'Kubota M5-091HF/HF-1 parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-091',versionSlug:'us-current-hfc-2wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-091hfc-hfc-1/electrical-system/b10500-switch-sensor-panel-board',externalId:'messicks-m5-091hfc-service-filters-2026-08',title:'Kubota M5-091HFC/HFC-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-091',versionSlug:'us-current-hd-4wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-091hd-hd-1/engine/402000-cylinder-head',externalId:'messicks-m5-091hd-service-filters-2026-08',title:'Kubota M5-091HD/HD-1 parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-091',versionSlug:'us-current-hd12-4wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-091hd12/hydraulic-system/j27500-hydraulic-oil-line-steering-pto',externalId:'messicks-m5-091hd12-service-filters-2026-08',title:'Kubota M5-091HD12 parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-091',versionSlug:'us-current-hdc-4wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-091hdc-hdc-1/accessories-and-service-parts/t11000-accessories-and-service-parts',externalId:'messicks-m5-091hdc-service-filters-2026-08',title:'Kubota M5-091HDC/HDC-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-091',versionSlug:'us-current-hdc12-4wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-091hdc12-hdc12-1/option/u70001-auxiliary-control-valve-kit-scd-option',externalId:'messicks-m5-091hdc12-service-filters-2026-08',title:'Kubota M5-091HDC12/HDC12-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-111',versionSlug:'us-current-hf-2wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-111hf/engine/459000-muffler-pipe-diesel-particulate-filter',externalId:'messicks-m5-111hf-service-filters-2026-08',title:'Kubota M5-111HF parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-111',versionSlug:'us-current-hfc-2wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-111hfc-hfc-1/engine/459000-muffler-pipe-diesel-particulate-filter',externalId:'messicks-m5-111hfc-service-filters-2026-08',title:'Kubota M5-111HFC/HFC-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-111',versionSlug:'us-current-hd-4wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-111hd-hd-1/engine/400000-crank-case',externalId:'messicks-m5-111hd-service-filters-2026-08',title:'Kubota M5-111HD/HD-1 parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-111',versionSlug:'us-current-hd12-4wd-open',url:'https://www.messicks.com/catalogs/kubota/m5-111hd12-hd12-1/hood-bonnet/m12501-bonnet-side-a-new',externalId:'messicks-m5-111hd12-service-filters-2026-08',title:'Kubota M5-111HD12/HD12-1 parts catalog - service filter references',isCab:false},
  {modelSlug:'m5-111',versionSlug:'us-current-hdc-4wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-111hdc-hdc-1/electrical-system/b35000-work-light-front-grille',externalId:'messicks-m5-111hdc-service-filters-2026-08',title:'Kubota M5-111HDC/HDC-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-111',versionSlug:'us-current-hdc12-4wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-111hdc12-hdc12-1/rear-axle-brake/f31000-brake-oil-tank',externalId:'messicks-m5-111hdc12-service-filters-2026-08',title:'Kubota M5-111HDC12/HDC12-1 parts catalog - service filter references',isCab:true},
  {modelSlug:'m5-111',versionSlug:'us-current-hdc24-4wd-cab',url:'https://www.messicks.com/catalogs/kubota/m5-111hdc24-hdc24-1/engine/411000-piston-and-crankshaft',externalId:'messicks-m5-111hdc24-service-filters-2026-08',title:'Kubota M5-111HDC24/HDC24-1 parts catalog - service filter references',isCab:true},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M5 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,variant:VariantSource){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[variant.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,variant.url,variant.externalId,variant.title],
  );
  return Number(result.insertId);
}

async function upsertFitment(
  connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,
  sourceRecordId:number,partNumber:string,variant:VariantSource,
){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=?
       AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,partId],
  );
  const fitmentNote=`${variant.title} lists ${partNumber} among the service/frequently purchased filter items for this exact M5 configuration. Confirm tractor serial number before ordering.`;
  const configurationNote=`${variant.versionSlug} model-specific dealer-catalog service reference`;
  if(existing[0]){
    await connection.query(
      `UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,
      [fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)],
    );
  }else{
    await connection.query(
      `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,'high')`,
      [machineId,versionId,partId,fitmentNote,configurationNote,sourceRecordId],
    );
  }
}

export const kubotaM5ServiceFiltersMigration:DbMigration={
  id:'20260828_194_kubota_m5_service_filters',
  description:'Add variant-specific Kubota M5 engine-oil, outer-air, hydraulic and cab-air service-filter fitments across all 13 current US configurations',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Cabin Air Filters','cabin-air-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId=Number(result.insertId);
    }

    const partIds=new Map<string,number>();
    for(const part of [...coreParts,...cabParts]){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.description],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const variant of variants){
      const machineId=await selectId(connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,
        [variant.modelSlug],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,variant.versionSlug]);
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,variant);
      const applicableParts=variant.isCab?[...coreParts,...cabParts]:coreParts;
      for(const part of applicableParts){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing M5 service part ${part.partNumber}`);
        await upsertFitment(connection,machineId,versionId,partId,sourceRecordId,part.partNumber,variant);
      }
    }
  },
};
