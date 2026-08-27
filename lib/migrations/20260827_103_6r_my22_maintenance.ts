import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Group = {
  slugs: string[];
  url: string;
  externalId: string;
  title: string;
  engineOilFilter: string;
  engineOilHours: number;
  engineOilInitialHours: number | null;
  engineOilLiters: number;
  primaryFuel: string;
  secondaryFuel: string;
  fuelHours: number;
  primaryAir: string;
  secondaryAir: string;
  transHours: number;
  transInitialHours: number;
  hydraulicHours: number;
  hydraulicInitialHours: number;
  fuelTankLiters: number;
  optionalFuelTankLiters?: number;
  defLiters: number;
  coolantLiters: number;
  transmissionCapacities: Array<{ key: string; label: string; value: number }>;
  axleHousingNoSuspension: number;
  axleHousingSuspended: number;
  finalDriveNoBrake: number;
  finalDriveWithBrake: number;
};

const groups: Group[] = [
  {
    slugs: ['6r-110','6r-120','6r-130'],
    url: 'https://www.deere.com/assets/pdfs/common/qrg/6r-ft4-6r110-6r-120-6r-130.pdf',
    externalId: 'jd-rpg-6r-110-120-130-my22-2022-06',
    title: 'John Deere 6R 110, 6R 120 and 6R 130 MY22 Replacement Parts Guide',
    engineOilFilter: 'RE504836', engineOilHours: 500, engineOilInitialHours: null, engineOilLiters: 16,
    primaryFuel: 'DZ115389', secondaryFuel: 'DZ115390', fuelHours: 500,
    primaryAir: 'AL215055', secondaryAir: 'AL215054',
    transHours: 500, transInitialHours: 100, hydraulicHours: 500, hydraulicInitialHours: 100,
    fuelTankLiters: 199, defLiters: 14, coolantLiters: 22,
    transmissionCapacities: [
      { key:'commandquad-plus', label:'CommandQuad Plus', value:53 },
      { key:'autoquad-plus', label:'AutoQuad Plus', value:53 },
      { key:'autopowr', label:'AutoPowr / IVT', value:60 },
    ],
    axleHousingNoSuspension: 5.4, axleHousingSuspended: 6.0, finalDriveNoBrake: 0.8, finalDriveWithBrake: 1.5,
  },
  {
    slugs: ['6r-140','6r-150'],
    url: 'https://www.deere.com/assets/pdfs/common/qrg/6r-ft4stage-v-my22-6r-140-6r150.pdf',
    externalId: 'jd-rpg-6r-140-150-my22-2022-06',
    title: 'John Deere 6R 140 and 6R 150 MY22 Replacement Parts Guide',
    engineOilFilter: 'RE504836', engineOilHours: 500, engineOilInitialHours: 100, engineOilLiters: 16,
    primaryFuel: 'RE541922', secondaryFuel: 'RE541925', fuelHours: 500,
    primaryAir: 'AL215055', secondaryAir: 'AL215054',
    transHours: 750, transInitialHours: 100, hydraulicHours: 750, hydraulicInitialHours: 100,
    fuelTankLiters: 199, optionalFuelTankLiters: 225, defLiters: 14, coolantLiters: 22,
    transmissionCapacities: [
      { key:'autoquad-plus', label:'AutoQuad Plus', value:53 },
      { key:'commandquad-plus', label:'CommandQuad Plus', value:53 },
      { key:'autopowr', label:'AutoPowr / IVT', value:60 },
    ],
    axleHousingNoSuspension: 5.4, axleHousingSuspended: 6.0, finalDriveNoBrake: 0.8, finalDriveWithBrake: 1.5,
  },
  {
    slugs: ['6r-175','6r-195'],
    url: 'https://www.deere.com/assets/pdfs/common/qrg/6r-ft4stage-6r145-6r175-6r195-6r215.pdf',
    externalId: 'jd-rpg-6r-175-195-my22-2022-06',
    title: 'John Deere 6R 175 and 6R 195 MY22 Replacement Parts Guide',
    engineOilFilter: 'RE539279', engineOilHours: 750, engineOilInitialHours: 100, engineOilLiters: 24,
    primaryFuel: 'DZ115391', secondaryFuel: 'DZ115392', fuelHours: 750,
    primaryAir: 'AL215053', secondaryAir: 'AL215054',
    transHours: 750, transInitialHours: 100, hydraulicHours: 750, hydraulicInitialHours: 100,
    fuelTankLiters: 324, defLiters: 20, coolantLiters: 28,
    transmissionCapacities: [
      { key:'autoquad-plus', label:'AutoQuad Plus', value:71 },
      { key:'autopowr', label:'AutoPowr / IVT', value:75 },
      { key:'directdrive', label:'DirectDrive', value:81 },
    ],
    axleHousingNoSuspension: 10.6, axleHousingSuspended: 11.0, finalDriveNoBrake: 1.9, finalDriveWithBrake: 2.5,
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 6R maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere6RMY22MaintenanceMigration: DbMigration = {
  id: '20260827_103_6r_my22_maintenance',
  description: 'Add MY22 John Deere 6R maintenance filters, service intervals and configuration-specific capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`, [filtersId,'Emissions Filters','emissions-filters']);

    const partSeeds: Array<[string,string,string]> = [
      ['RE504836','Engine Oil Filter','engine-oil-filters'], ['RE539279','Engine Oil Filter','engine-oil-filters'],
      ['DZ115389','Primary Fuel Filter','fuel-filters'], ['DZ115390','Secondary Fuel Filter','fuel-filters'],
      ['RE541922','Primary Fuel Filter','fuel-filters'], ['RE541925','Secondary Fuel Filter','fuel-filters'],
      ['DZ115391','Primary Fuel Filter','fuel-filters'], ['DZ115392','Secondary Fuel Filter','fuel-filters'],
      ['AL215055','Primary Air Filter','air-filters'], ['AL215053','Primary Air Filter','air-filters'], ['AL215054','Secondary Air Filter','air-filters'],
      ['DZ105100','Crankcase Ventilation Filter','emissions-filters'], ['DZ114640','Diesel Exhaust Filter','emissions-filters'], ['DZ104594','Diesel Particulate Filter','emissions-filters'],
      ['AL232896','Hydraulic Oil Filter Element','hydraulic-filters'], ['AL232898','Hydraulic Oil Filter Element','hydraulic-filters'],
      ['AL221066','Transmission Oil Filter','hydraulic-filters'], ['AL206482','Transmission Oil Filter Element','hydraulic-filters'],
      ['DE30500','Front PTO Oil Filter','hydraulic-filters'],
      ['AL220527','Fresh Cab Air Filter','cab-air-filters'], ['L214634','Recirculation Cab Air Filter - A/C','cab-air-filters'], ['L205372','Recirculation Cab Air Filter - without A/C','cab-air-filters'], ['AL208648','Activated Carbon Cab Filter Kit','cab-air-filters'],
    ];

    for (const [number,name,categorySlug] of partSeeds) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,number,name],
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,number]);
    }

    for (const group of groups) {
      const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [group.externalId]);
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
          [sourceId,group.url,group.externalId,group.title,'2022-06-01'],
        );
        sourceRecordId = Number(result.insertId);
      }

      for (const slug of group.slugs) {
        const machineId = await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [slug]);

        const fitments: Array<[string,string]> = [
          [group.engineOilFilter,`${slug.toUpperCase()} MY22 engine oil filter; ${group.engineOilHours} hours${group.engineOilInitialHours ? ` after initial ${group.engineOilInitialHours} hours` : ''}`],
          [group.primaryFuel,`${slug.toUpperCase()} MY22 primary fuel filter; ${group.fuelHours} hours`],
          [group.secondaryFuel,`${slug.toUpperCase()} MY22 secondary fuel filter; ${group.fuelHours} hours`],
          [group.primaryAir,`${slug.toUpperCase()} MY22 primary air filter; 1500 hours or 2 years`],
          [group.secondaryAir,`${slug.toUpperCase()} MY22 secondary air filter; every fourth primary-filter change or 4500 hours`],
          ['DZ105100',`${slug.toUpperCase()} MY22 crankcase ventilation filter; 1500 hours or 2 years`],
          ['AL232896',`${slug.toUpperCase()} MY22 hydraulic oil filter option; service interval follows Deere MY22 guide`],
          ['AL232898',`${slug.toUpperCase()} MY22 hydraulic oil filter option; service interval follows Deere MY22 guide`],
          ['AL221066',`${slug.toUpperCase()} MY22 transmission oil filter for applicable transmission configuration`],
          ['AL206482',`${slug.toUpperCase()} MY22 transmission oil filter for AutoPowr / IVT configuration`],
          ['DE30500',`${slug.toUpperCase()} MY22 front PTO oil filter when equipped; 500 hours`],
          ['AL220527',`${slug.toUpperCase()} MY22 fresh cab air filter; 1500 hours or 2 years/as required`],
          ['L214634',`${slug.toUpperCase()} MY22 recirculation cab air filter with A/C; 1500 hours or 2 years/as required`],
          ['L205372',`${slug.toUpperCase()} MY22 recirculation cab air filter without A/C; 1500 hours or 2 years/as required`],
          ['AL208648',`${slug.toUpperCase()} MY22 activated carbon cab filter kit; ${group.transHours === 750 ? 750 : 500} hours or 1 year`],
        ];
        if (group.slugs.includes('6r-175')) {
          fitments.push(['DZ114640',`${slug.toUpperCase()} MY22 diesel exhaust filter; 4500 hours or 3 years`]);
          fitments.push(['DZ104594',`${slug.toUpperCase()} MY22 diesel particulate filter; replace when Deere warning indicates service`]);
        } else if (group.slugs.includes('6r-110')) {
          fitments.push(['DZ114640',`${slug.toUpperCase()} MY22 diesel exhaust filter; 4500 hours or 3 years`]);
        }

        for (const [number,note] of fitments) {
          const pid = await partId(number);
          const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,pid,note]);
          if (!existing[0]) await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
        }

        const tasks = [
          { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:null as string | null, hours:group.engineOilHours, months:12, initial:group.engineOilInitialHours, capacity:group.engineOilLiters, unit:'L', text:`${group.engineOilInitialHours ? `After initial ${group.engineOilInitialHours} hours, then ` : ''}every ${group.engineOilHours} hours or annually`, notes:'John Deere Plus-50 II. Extended interval requires the conditions stated in the Deere MY22 guide.' },
          { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:group.engineOilFilter, hours:group.engineOilHours, months:12, initial:group.engineOilInitialHours, capacity:null, unit:null, text:`${group.engineOilInitialHours ? `After initial ${group.engineOilInitialHours} hours, then ` : ''}every ${group.engineOilHours} hours or annually`, notes:null },
          { key:'primary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Primary fuel filter', part:group.primaryFuel, hours:group.fuelHours, months:null, initial:null, capacity:null, unit:null, text:`Every ${group.fuelHours} hours`, notes:null },
          { key:'secondary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Secondary fuel filter', part:group.secondaryFuel, hours:group.fuelHours, months:null, initial:null, capacity:null, unit:null, text:`Every ${group.fuelHours} hours`, notes:null },
          { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:group.primaryAir, hours:1500, months:24, initial:null, capacity:null, unit:null, text:'Every 1500 hours or 2 years, whichever comes first', notes:null },
          { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:group.secondaryAir, hours:4500, months:group.slugs.includes('6r-110') ? 36 : 60, initial:null, capacity:null, unit:null, text:`Every fourth primary-air-filter change, or after 4500 hours or ${group.slugs.includes('6r-110') ? 3 : 5} years`, notes:null },
          { key:'crankcase-vent-filter', section:'Engine', action:'Replace', title:'Crankcase ventilation filter', part:'DZ105100', hours:1500, months:24, initial:null, capacity:null, unit:null, text:'Every 1500 hours or 2 years', notes:null },
          { key:'transmission-filter', section:'Transmission', action:'Replace', title:'Transmission oil filter', part:'AL221066', hours:group.transHours, months:null, initial:group.transInitialHours, capacity:null, unit:null, text:`After initial ${group.transInitialHours} hours, then every ${group.transHours} hours`, notes:'AL206482 is used for AutoPowr / IVT configurations where specified by Deere.' },
          { key:'hydraulic-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', part:'AL232896', hours:group.hydraulicHours, months:null, initial:group.hydraulicInitialHours, capacity:null, unit:null, text:`After initial ${group.hydraulicInitialHours} hours, then every ${group.hydraulicHours} hours`, notes:'AL232898 applies to specified larger-pump configurations.' },
          { key:'front-pto-filter', section:'PTO', action:'Replace', title:'Front PTO oil filter', part:'DE30500', hours:500, months:null, initial:null, capacity:null, unit:null, text:'Every 500 hours', notes:'When equipped with front PTO.' },
          { key:'fresh-cab-air-filter', section:'Cab', action:'Replace', title:'Fresh cab air filter', part:'AL220527', hours:1500, months:24, initial:null, capacity:null, unit:null, text:'Every 1500 hours, 2 years, as required, or with the engine primary air filter', notes:null },
        ];

        for (const task of tasks) {
          const pid = task.part ? await partId(task.part) : null;
          await connection.query(
            `INSERT INTO maintenance_tasks (machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,initial_interval_hours,capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),initial_interval_hours=VALUES(initial_interval_hours),capacity_value=VALUES(capacity_value),capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
            [machineId,task.key,task.section,task.action,task.title,pid,task.hours,task.months,task.initial,task.capacity,task.unit,task.text,task.notes,sourceRecordId],
          );
        }

        const capacities: Array<[string,string,string,number,string,string | null,string | null]> = [
          ['fuel-tank','Fuel tank','Standard',group.fuelTankLiters,'L',null,null],
          ['def-tank','DEF tank','',group.defLiters,'L','John Deere Diesel Exhaust Fluid',null],
          ['cooling-system','Cooling system','',group.coolantLiters,'L','John Deere Cool-Gard II',null],
          ['engine-oil','Engine oil / crankcase','',group.engineOilLiters,'L','John Deere Plus-50 II',null],
          ['front-axle-no-suspension','Front axle housing','Without suspension',group.axleHousingNoSuspension,'L','John Deere Hy-Gard',null],
          ['front-axle-suspended','Front axle housing','Suspended axle',group.axleHousingSuspended,'L','John Deere Hy-Gard',null],
          ['final-drive-no-brake','Final drive','Per side, without brake',group.finalDriveNoBrake,'L','John Deere Hy-Gard',null],
          ['final-drive-with-brake','Final drive','Per side, with brake',group.finalDriveWithBrake,'L','John Deere Hy-Gard',null],
        ];
        if (group.optionalFuelTankLiters) capacities.push(['fuel-tank-optional','Fuel tank','Optional',group.optionalFuelTankLiters,'L',null,null]);
        if (!group.slugs.includes('6r-110')) capacities.push(['front-pto','Front PTO','When equipped',2.6,'L','John Deere Hy-Gard',null]);
        for (const trans of group.transmissionCapacities) capacities.push([`transmission-${trans.key}`,'Transmission / hydraulic system',trans.label,trans.value,'L','John Deere Hy-Gard',null]);

        for (const [systemKey,label,configuration,value,unit,fluid,notes] of capacities) {
          await connection.query(
            `INSERT INTO machine_capacities (machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence)
             VALUES (?,?,?,?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
            [machineId,systemKey,label,configuration,value,unit,fluid,notes,sourceRecordId],
          );
        }
      }
    }
  },
};
