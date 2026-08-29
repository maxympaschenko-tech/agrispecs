import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/workmaster-25s-sub-compact';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland WORKMASTER 25S enrichment dependency missing');
  return Number(rows[0].id);
}

export const newHollandWorkmaster25SCurrentEnrichmentMigration: DbMigration = {
  id: '20260829_293_new_holland_workmaster_25s_current_enrichment',
  description: 'Enrich current New Holland WORKMASTER 25S with PTO power, hitch lift, operator station and attachment fitments',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='workmaster-25s' LIMIT 1`, [manufacturerId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);

    const externalId = 'new-holland-workmaster-25s-current-enrichment-2026-08';
    let [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = rows[0]?.id ? Number(rows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America WORKMASTER 25S current feature and attachment specifications', JSON.stringify({
          ptoHorsepower: 17.2,
          hitchLiftLb: 992,
          operatorStation: 'Cab or open-air ROPS',
          loader: '100LC',
          mower: '160GMS',
          mowerWidthIn: 60,
          backhoe: '905GBL',
          backhoeDigDepthIn: 79.4,
        })],
      );
      sourceRecordId = Number(result.insertId);
    }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['PTO','pto.rated_power','PTO horsepower','decimal','hp',10],
      ['Hydraulics','hitch.rear_lift_capacity','Rear three-point hitch lift capacity','decimal','lb',40],
    ];
    for (const def of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, def);
    }

    const values: Array<[string,string|number,string|null]> = [
      ['configuration.station','Cab or open-air ROPS',null],
      ['pto.rated_power',17.2,'hp'],
      ['hitch.rear_lift_capacity',992,'lb'],
    ];
    for (const [key, value, unit] of values) {
      const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
      await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, defId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
    }

    const attachments = [
      { type: 'front-loader', model: '100LC', slug: '100lc-workmaster-25s', details: 'Tailor-made front loader for WORKMASTER 25S.' },
      { type: 'mid-mount-mower', model: '160GMS', slug: '160gms-workmaster-25s', details: '60 in mid-mount mower for WORKMASTER 25S.' },
      { type: 'backhoe', model: '905GBL', slug: '905gbl-workmaster-25s', details: 'Backhoe for WORKMASTER 25S; official page states up to 79.4 in digging depth.' },
    ];

    for (const attachment of attachments) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,configuration_text,data_status)
         VALUES(?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, attachment.type, attachment.model, attachment.slug, attachment.details],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, attachment.slug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, attachmentId, `Official New Holland WORKMASTER 25S compatibility for ${attachment.model}.`, sourceRecordId],
      );
    }
  },
};
