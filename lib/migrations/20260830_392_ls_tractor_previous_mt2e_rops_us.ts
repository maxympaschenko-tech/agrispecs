import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  sourceUrl: string;
  engineModel: string;
  engineType: string;
  grossHp: number;
  ptoHp: number;
  ratedRpm: number;
  displacementL: number;
  fuelL: number;
  alternator: string;
  transmission: string;
  speeds: string;
  implementGpm: number;
  steeringGpm: number;
  totalGpm: number;
  lengthIn: number;
  widthIn: number;
  wheelbaseIn: number;
  heightIn: number;
  weightLb: number;
  industrialTires: string;
};

const VERSION = 'united-states-previous-mt2e-generation';
const SERIES_URL = 'https://lstractorusa.com/series/previous-mt2e/';
const MT225_BROCHURE = 'https://www.lstractorusa.com/wp-content/themes/impactbase/brochures/LS-Tractor-Brochure_MT225E.pdf';
const MT2E_BROCHURE = 'https://lstractorusa.com/wp-content/themes/weicks-media-base-theme/brochures/LS-Tractor-Brochure_MT2E.pdf';

const models: Seed[] = [
  { slug: 'mt225e', name: 'MT225E', sourceUrl: 'https://lstractorusa.com/tractor/mt225e/', engineModel: 'Mitsubishi S3L2', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 24.6, ptoHp: 19.2, ratedRpm: 2500, displacementL: 1.318, fuelL: 28.0, alternator: '12 V / 50 A', transmission: 'Synchro Shuttle', speeds: 'F12 x R12', implementGpm: 7.9, steeringGpm: 4.6, totalGpm: 12.5, lengthIn: 118, widthIn: 54, wheelbaseIn: 66, heightIn: 88, weightLb: 2434, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt225he', name: 'MT225HE', sourceUrl: 'https://lstractorusa.com/tractor/mt225he/', engineModel: 'Mitsubishi S3L2', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 24.6, ptoHp: 17.2, ratedRpm: 2500, displacementL: 1.318, fuelL: 28.0, alternator: '12 V / 50 A', transmission: 'HST', speeds: '3 ranges', implementGpm: 7.9, steeringGpm: 4.6, totalGpm: 12.5, lengthIn: 118, widthIn: 54, wheelbaseIn: 66, heightIn: 88, weightLb: 2469, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt230e', name: 'MT230E', sourceUrl: 'https://lstractorusa.com/tractor/mt230e/', engineModel: 'L3C19-D3', engineType: '3-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 30, ptoHp: 25.5, ratedRpm: 2600, displacementL: 1.88, fuelL: 28.0, alternator: '12 V / 70 A', transmission: 'Synchro Shuttle', speeds: 'F12 x R12', implementGpm: 8.2, steeringGpm: 4.1, totalGpm: 12.3, lengthIn: 121, widthIn: 54, wheelbaseIn: 69, heightIn: 88, weightLb: 2866, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt235e', name: 'MT235E', sourceUrl: 'https://lstractorusa.com/tractor/mt235e/', engineModel: 'L3C19-D2', engineType: '3-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 35, ptoHp: 29.7, ratedRpm: 2600, displacementL: 1.88, fuelL: 28.0, alternator: '12 V / 70 A', transmission: 'Synchro Shuttle', speeds: 'F12 x R12', implementGpm: 8.2, steeringGpm: 4.1, totalGpm: 12.3, lengthIn: 121, widthIn: 54, wheelbaseIn: 69, heightIn: 88, weightLb: 2866, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt235he', name: 'MT235HE', sourceUrl: 'https://lstractorusa.com/tractor/mt235he/', engineModel: 'L3C19-D2', engineType: '3-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 35, ptoHp: 28, ratedRpm: 2600, displacementL: 1.88, fuelL: 28.0, alternator: '12 V / 70 A', transmission: 'HST', speeds: '3 ranges', implementGpm: 8.2, steeringGpm: 5.5, totalGpm: 13.7, lengthIn: 121, widthIn: 54, wheelbaseIn: 69, heightIn: 88, weightLb: 2870, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt240e', name: 'MT240E', sourceUrl: 'https://lstractorusa.com/tractor/mt240e/', engineModel: 'L3C19-T', engineType: '3-cylinder, liquid-cooled, turbocharged CRDI diesel', grossHp: 40, ptoHp: 34, ratedRpm: 2600, displacementL: 1.88, fuelL: 28.0, alternator: '12 V / 70 A', transmission: 'Synchro Shuttle', speeds: 'F12 x R12', implementGpm: 8.2, steeringGpm: 4.1, totalGpm: 12.3, lengthIn: 121, widthIn: 54, wheelbaseIn: 69, heightIn: 88, weightLb: 2881, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
  { slug: 'mt240he', name: 'MT240HE', sourceUrl: 'https://lstractorusa.com/tractor/mt240he/', engineModel: 'L3C19-T', engineType: '3-cylinder, liquid-cooled, turbocharged CRDI diesel', grossHp: 40, ptoHp: 32, ratedRpm: 2600, displacementL: 1.88, fuelL: 28.0, alternator: '12 V / 70 A', transmission: 'HST', speeds: '3 ranges', implementGpm: 8.2, steeringGpm: 5.5, totalGpm: 13.7, lengthIn: 121, widthIn: 54, wheelbaseIn: 69, heightIn: 88, weightLb: 2884, industrialTires: '25 x 8.5-14 / 43 x 16-20' },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','engine.type','Engine type','text',null,4],
  ['Engine','emissions.standard','Emissions standard','text',null,5],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20],
  ['Transmission','brakes.type','Brakes','text',null,30],
  ['Transmission','steering.type','Steering','text',null,40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.type','PTO type','text',null,15],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.control_system','Hydraulic control system','text',null,5],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','gpm',30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity at hitch end','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Remote valves','text',null,60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Electrical','electrical.alternator','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight without ballast','decimal','lb',70],
  ['Tires','tires.ag','Ag tires front / rear','text',null,10],
  ['Tires','tires.industrial','Industrial tires front / rear','text',null,20],
  ['Tires','tires.turf','Turf tires front / rear','text',null,30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor Previous MT2E ROPS dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId,url,externalId,title,JSON.stringify(raw)]);
  return Number(inserted.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], machineId:number, versionId:number, definitionId:number, sourceRecordId:number, value:string|number, unit:string|null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);
}

export const lsTractorPreviousMt2eRopsUsMigration: DbMigration = {
  id: '20260830_392_ls_tractor_previous_mt2e_rops_us',
  description: 'Archive seven previous-generation US MT2E ROPS configurations separately from current New MT2E',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS Previous MT2E Series','ls-previous-mt2e-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-previous-mt2e-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-previous-mt2e-lineup-2026-08', SERIES_URL, 'LS Tractor USA Previous MT2E selector snapshot', {
      market: 'United States', captured: '2026-08-30', generationStatus: 'Previous', models: ['MT225E','MT225HE','MT230E','MT235E','MT235HE','MT235EC','MT235HEC','MT240E','MT240HE','MT240HEC'],
      currentFlagPolicy: 'Previous-generation models are stored with machine_versions.is_current=false even though LS Tractor still exposes them in its Previous MT2E selector and owner-manual library.'
    });
    const mt225Source = await ensureSource(c, sourceId, 'ls-tractor-mt225e-he-generation-brochure', MT225_BROCHURE, 'LS Tractor MT225E / MT225HE generation brochure', {
      generation: 'Previous MT2E', sourceRole: 'Primary generation-correct specification matrix for MT225E/MT225HE',
      normalization: { displacement: '80.4 cu in stored as 1.318 L', fuel: '7.4 US gal stored as 28.0 L' }
    });
    const mt2eSource = await ensureSource(c, sourceId, 'ls-tractor-previous-mt2e-rops-generation-brochure', MT2E_BROCHURE, 'LS Tractor MT230E / MT235E / MT235HE / MT240E / MT240HE generation brochure', {
      generation: 'Previous MT2E', sourceRole: 'Primary generation-correct ROPS specification matrix',
      normalization: { displacement: '114.7 cu in stored as 1.88 L', fuel: '7.4 US gal stored as 28.0 L' },
      conflicts: [
        'The current Previous MT2E series card and current MT230E HTML page display MT230E as 35 hp, while the official generation brochure/model comparison identifies MT230E as 30 hp with 25.5 PTO hp. Archive normalization follows the generation brochure.',
        'For MT230/235/240 ROPS, the generation brochure publishes 54 in overall width and 69 in wheelbase. Current HTML model pages publish 69 in width and 54 in wheelbase, consistent with those fields being transposed. Archive normalization follows the generation brochure.',
        'Some current HTML pages publish 27x8.50-14 industrial front tires while the generation brochure publishes 25x8.5-14. Archive normalization follows the generation brochure.'
      ]
    });

    const definitionIds = new Map<string,number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const primarySource = m.slug.startsWith('mt225') ? mt225Source : mt2eSource;
      const liveSource = await ensureSource(c, sourceId, `ls-tractor-${m.slug}-previous-html-2026-08`, m.sourceUrl, `LS Tractor ${m.name} still-published US model page`, { market:'United States', captured:'2026-08-30', generation:'Previous MT2E', role:'Availability/HTML cross-check; generation brochure is primary for archive fields where current HTML conflicts.' });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Previous-generation US LS Tractor MT2E compact tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId,equipmentTypeId,seriesId,m.name,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,FALSE,?,'Previous-generation LS Tractor MT2E ROPS configuration. Stored for archive/search coverage and intentionally excluded from current-model filters.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,`ROPS; ${m.transmission}; ${m.speeds}`,liveSource]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const is225 = m.slug.startsWith('mt225');
      const values:Array<[string,string|number,string|null]> = [
        ['configuration.station','ROPS',null], ['engine.model',m.engineModel,null], ['engine.type',m.engineType,null], ['emissions.standard','Tier 4',null], ['engine.displacement',m.displacementL,'L'], ['engine.gross_power',m.grossHp,'hp'], ['engine.rated_speed',m.ratedRpm,'rpm'],
        ['transmission.standard',m.transmission,null], ['transmission.speeds',m.speeds,null], ['brakes.type','Wet, multi-disc',null], ['steering.type','Hydrostatic power steering',null],
        ['pto.rated_power',m.ptoHp,'hp'], ['pto.type','Independent',null], ['pto.rear_description','540 rpm standard',null],
        ['hydraulics.control_system','Position',null], ['hydraulics.main_pump_capacity',m.implementGpm,'gpm'], ['hydraulics.power_steering_pump_capacity',m.steeringGpm,'gpm'], ['hydraulics.total_flow',m.totalGpm,'gpm'], ['hitch.category','Category I',null], ['hitch.lift_capacity',1808,'lb'], ['hydraulics.remote_valves','Optional',null],
        ['capacities.fuel_tank',m.fuelL,'L'], ['electrical.alternator',m.alternator,null], ['dimensions.overall_length',m.lengthIn,'in'], ['dimensions.overall_width',m.widthIn,'in'], ['dimensions.overall_height',m.heightIn,'in'], ['dimensions.wheelbase',m.wheelbaseIn,'in'], ['dimensions.unladen_weight',m.weightLb,'lb'],
        ['tires.ag','7-14 / 11.2-24',null], ['tires.industrial',m.industrialTires,null], ['tires.turf','25 x 8.5-14 / 41 x 14-20',null],
      ];
      if (!is225) values.push(['pto.mid_description','2,000 rpm optional',null]);
      for (const [key,value,unit] of values) {
        const definitionId = definitionIds.get(key); if (!definitionId) throw new Error(`Missing Previous MT2E spec definition ${key}`);
        await put(c,machineId,versionId,definitionId,primarySource,value,unit);
      }
    }
  },
};
