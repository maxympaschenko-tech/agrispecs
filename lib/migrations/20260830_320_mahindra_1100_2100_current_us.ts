import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type MachineSeed = {
  slug: string; name: string; hp: number; rpm: number; displacementL: number; fuelL: number;
  transmission: string; maxSpeedMph: number; ptoType: string; ptoPowerHp: number; ptoSpeeds: string;
  totalFlowGpm: number; mainFlowGpm: number; hitchLb: number; lengthIn: number; wheelbaseIn: number;
  widthIn: number; heightIn: number; clearanceIn: number; weightLb: number;
};
type SeriesSeed = {
  slug: string; name: string; url: string; models: MachineSeed[];
  loader: { slug: string; model: string; liftHeightIn: number; liftCapacityLb: number; diggingDepthIn: number };
};

const VERSION = 'united-states-current-2026-08';
const common1100 = { displacementL: 1.102, fuelL: 25, transmission: 'HST - 2 range', maxSpeedMph: 7.3, ptoType: 'Independent wet clutch', ptoSpeeds: 'Rear 540 @ 2837 rpm; Mid 2500 @ 2837 rpm', totalFlowGpm: 11.2, mainFlowGpm: 7.6, hitchLb: 771, lengthIn: 100.4, wheelbaseIn: 55.1, widthIn: 46.3 };
const common2100 = { displacementL: 1.318, fuelL: 22, transmission: 'HST - 3 range', maxSpeedMph: 11.2, ptoType: 'Live', ptoSpeeds: 'Rear 540 @ 2376 rpm; Mid 2500 @ 2500 rpm', totalFlowGpm: 11.2, mainFlowGpm: 6.3, hitchLb: 1760, lengthIn: 112.7, wheelbaseIn: 61.4, widthIn: 54.4, clearanceIn: 13.4 };
const series: SeriesSeed[] = [
  {
    slug: 'mahindra-1100', name: 'Mahindra 1100 Series', url: 'https://www.mahindrausa.com/series/1100/',
    models: [
      { slug: '1120-hst', name: '1120 HST', hp: 20.1, rpm: 2900, ptoPowerHp: 13.9, heightIn: 86.6, clearanceIn: 6.6, weightLb: 1620, ...common1100 },
      { slug: '1120-hst-cab', name: '1120 HST Cab', hp: 20.1, rpm: 2900, ptoPowerHp: 13.9, heightIn: 80.5, clearanceIn: 6.7, weightLb: 1962, ...common1100 },
      { slug: '1123-hst', name: '1123 HST', hp: 22.9, rpm: 3000, ptoPowerHp: 16.8, heightIn: 86.6, clearanceIn: 6.7, weightLb: 1620, ...common1100 },
      { slug: '1123-hst-cab', name: '1123 HST Cab', hp: 22.9, rpm: 3000, ptoPowerHp: 16.8, heightIn: 80.5, clearanceIn: 6.7, weightLb: 1962, ...common1100 },
      { slug: '1126-hst', name: '1126 HST', hp: 25.3, rpm: 3000, ptoPowerHp: 19.2, heightIn: 86.6, clearanceIn: 6.7, weightLb: 1620, ...common1100 },
      { slug: '1126-hst-cab', name: '1126 HST Cab', hp: 25.3, rpm: 3000, ptoPowerHp: 19.2, heightIn: 80.5, clearanceIn: 6.7, weightLb: 1962, ...common1100 },
    ],
    loader: { slug: 'mahindra-l11', model: 'L11', liftHeightIn: 68, liftCapacityLb: 794, diggingDepthIn: 3 },
  },
  {
    slug: 'mahindra-2100', name: 'Mahindra 2100 Series', url: 'https://www.mahindrausa.com/series/2100/',
    models: [
      { slug: '2123-hst', name: '2123 HST', hp: 22.9, rpm: 2500, ptoPowerHp: 16.8, heightIn: 93.6, weightLb: 2101, ...common2100 },
      { slug: '2126-hst', name: '2126 HST', hp: 25.3, rpm: 2700, ptoPowerHp: 18.8, heightIn: 93.6, weightLb: 2101, ...common2100 },
      { slug: '2126-hst-cab', name: '2126 HST Cab', hp: 25.3, rpm: 2700, ptoPowerHp: 18.8, heightIn: 84.4, weightLb: 2607, ...common2100 },
    ],
    loader: { slug: 'mahindra-l21', model: 'L21', liftHeightIn: 77, liftCapacityLb: 1477, diggingDepthIn: 3 },
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql, params); if (!r[0]) throw new Error('Mahindra migration dependency missing'); return Number(r[0].id); }
async function put(c: Parameters<DbMigration['apply']>[0], mi: number, vi: number, di: number, sr: number, value: string | number, unit: string | null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mi, vi, di, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sr]);
}

export const mahindra11002100CurrentUsMigration: DbMigration = {
  id: '20260830_320_mahindra_1100_2100_current_us',
  description: 'Add current US Mahindra 1100 and 2100 Series tractors plus verified L11/L21 loader fitment',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Mahindra','mahindra') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='mahindra' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Mahindra' AND domain='mahindrausa.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) { const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Mahindra','mahindrausa.com','manufacturer','official')`); sourceId = Number(x.insertId); }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Engine','engine.power','Engine power','decimal','hp',4], ['Engine','engine.power_speed','Engine speed at published power','integer','rpm',5], ['Engine','engine.displacement','Engine displacement','decimal','L',6], ['Engine','engine.cylinders','Engine cylinders','integer',null,7],
      ['Transmission','transmission.options','Transmission','text',null,10], ['Transmission','transmission.max_forward_speed','Maximum forward speed','decimal','mph',20],
      ['PTO','pto.type','PTO type','text',null,5], ['PTO','pto.speeds','PTO speeds','text',null,10], ['PTO','pto.power','PTO power','decimal','hp',20],
      ['Hydraulics','hydraulics.total_flow','Maximum total hydraulic flow','decimal','US gal/min',10], ['Hydraulics','hydraulics.main_pump_flow','Main pump output','decimal','US gal/min',20], ['Hydraulics','hitch.rear_max_lift_capacity','3-point hitch lift capacity @ 24 in aft','decimal','lb',30],
      ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10], ['Electrical','electrical.battery_system','Battery','text',null,10], ['Electrical','electrical.alternator','Alternator','text',null,20],
      ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10], ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',20], ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',30], ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',40], ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50], ['Dimensions & Weight','dimensions.unladen_weight','Weight','decimal','lb',60],
    ];
    const definitionIds = new Map<string,number>();
    for (const row of defs) { await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row); definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]])); }

    for (const s of series) {
      await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId,s.name,s.slug]);
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,s.slug]);
      const ext = `${s.slug}-current-us-2026-08`; let [rr] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [ext]); let sr = rr[0]?.id ? Number(rr[0].id) : 0;
      if (!sr) { const [x] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId,s.url,ext,`${s.name} current US specifications`,JSON.stringify({ market:'United States', captured:'2026-08-30', models:s.models, loader:s.loader, note:s.slug==='mahindra-2100'?'The current specification table publishes 2123 HST, 2126 HST and 2126 HST Cab. A 2123 HST Cab offer appears elsewhere on the page but is not seeded without a complete specification column.':null })]); sr = Number(x.insertId); }

      await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'front-loader',?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`, [manufacturerId,s.loader.model,s.loader.slug,`${s.loader.liftCapacityLb} lb`,`${s.loader.liftHeightIn} in`,`Official ${s.name} loader; digging depth ${s.loader.diggingDepthIn} in`]);
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,s.loader.slug]);

      for (const m of s.models) {
        await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Mahindra tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId,equipmentTypeId,seriesId,m.name,m.slug]);
        const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
        await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi,VERSION]);
        await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current US Mahindra record from the official series specification table. Engine HP is stored as neutral Engine power because the manufacturer does not label it rated or maximum power.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi,VERSION,m.name,sr]);
        const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mi,VERSION]);
        const values: Array<[string,string|number,string|null]> = [['engine.power',m.hp,'hp'],['engine.power_speed',m.rpm,'rpm'],['engine.displacement',m.displacementL,'L'],['engine.cylinders',3,null],['transmission.options',m.transmission,null],['transmission.max_forward_speed',m.maxSpeedMph,'mph'],['pto.type',m.ptoType,null],['pto.speeds',m.ptoSpeeds,null],['pto.power',m.ptoPowerHp,'hp'],['hydraulics.total_flow',m.totalFlowGpm,'US gal/min'],['hydraulics.main_pump_flow',m.mainFlowGpm,'US gal/min'],['hitch.rear_max_lift_capacity',m.hitchLb,'lb'],['capacities.fuel_tank',m.fuelL,'L'],['electrical.battery_system',s.slug==='mahindra-1100'?'12.6 V, 650 CCA':'12 V, 650 CCA',null],['electrical.alternator','12 V, 55 A',null],['dimensions.overall_length',m.lengthIn,'in'],['dimensions.wheelbase',m.wheelbaseIn,'in'],['dimensions.overall_width',m.widthIn,'in'],['dimensions.overall_height',m.heightIn,'in'],['dimensions.ground_clearance',m.clearanceIn,'in'],['dimensions.unladen_weight',m.weightLb,'lb']];
        for (const [key,value,unit] of values) await put(c,mi,vi,definitionIds.get(key)!,sr,value,unit);
        await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [mi,attachmentId,`Official ${s.loader.model} loader listed in the ${s.name} specification table.`,sr]);
      }
    }
  },
};
