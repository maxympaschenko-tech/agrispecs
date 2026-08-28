import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp: number;
  ratedIpmHp: number;
  maxIpmHp: number;
  engineModel: string;
  transmission: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  { slug: '6r-215', model: '6R 215', ratedHp: 215, maxHp: 237, ratedIpmHp: 255, maxIpmHp: 259, engineModel: 'John Deere PowerTech PVS', transmission: 'AutoQuad Plus, DirectDrive, or AutoPowr/IVT depending on configuration' },
  { slug: '6r-230', model: '6R 230', ratedHp: 230, maxHp: 253, ratedIpmHp: 270, maxIpmHp: 281, engineModel: 'John Deere PowerTech PSS', transmission: 'AutoPowr/IVT' },
  { slug: '6r-250', model: '6R 250', ratedHp: 250, maxHp: 275, ratedIpmHp: 290, maxIpmHp: 301, engineModel: 'John Deere PowerTech PSS', transmission: 'AutoPowr/IVT' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6R 215-250 dependency missing');
  return Number(rows[0].id);
}

export const johnDeere6R215250CurrentSpecsMigration: DbMigration = {
  id: '20260828_266_john_deere_6r_215_250_current_specs',
  description: 'Add current supported John Deere 6R 215, 6R 230 and 6R 250 official specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const pricebookSourceId = await id(c, `SELECT id FROM source_records WHERE external_id='john-deere-6000s-pricebook-2026-05-05' LIMIT 1`);
    const familySourceId = await id(c, `SELECT id FROM source_records WHERE external_id='john-deere-us-6r-family-current-2026-08' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'6R Series','6r-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='6r-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,2],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.cylinders','Cylinders','integer',null,25],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Engine','engine.rated_power_ipm','Rated engine power with IPM','decimal','hp',17],
      ['Engine','engine.maximum_power_ipm','Maximum engine power with IPM','decimal','hp',18],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
    ];
    for (const d of defs) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        d,
      );
    }

    for (const m of models) {
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current supported US John Deere 6R tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current 6R cab tractor',TRUE,?,'Current-model support is confirmed by Deere US 6R references; engine power values use Deere North America official price-book/specification data.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,VERSION,pricebookSourceId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const values: Array<[string,string|number,string|null,number]> = [
        ['configuration.station','Cab',null,familySourceId],
        ['configuration.drive','MFWD',null,familySourceId],
        ['engine.model',m.engineModel,null,pricebookSourceId],
        ['engine.displacement',6.8,'L',pricebookSourceId],
        ['engine.cylinders',6,null,pricebookSourceId],
        ['engine.rated_power',m.ratedHp,'hp',pricebookSourceId],
        ['engine.maximum_power',m.maxHp,'hp',pricebookSourceId],
        ['engine.rated_power_ipm',m.ratedIpmHp,'hp',pricebookSourceId],
        ['engine.maximum_power_ipm',m.maxIpmHp,'hp',pricebookSourceId],
        ['engine.emissions','Final Tier 4',null,pricebookSourceId],
        ['transmission.options',m.transmission,null,familySourceId],
      ];
      for (const [key,value,unit,sourceRecordId] of values) {
        const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(
          `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
           VALUES(?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId],
        );
      }
    }
  },
};
