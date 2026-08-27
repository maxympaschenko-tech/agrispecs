import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Alternative = {
  original: string;
  alternative: string;
  name: string;
  manufacturerName: string;
  manufacturerSlug: string;
  category: string;
  sourceUrl: string;
  sourceExternalId: string;
};

const alternatives: Alternative[] = [
  { original:'M806418', alternative:'A-B1FF186', name:'Engine Oil Filter', manufacturerName:'Sunbelt', manufacturerSlug:'sunbelt', category:'engine-oil-filters', sourceUrl:'https://shop.deere.com/us/product/M806418%253A-Engine-Oil-Filter/p/M806418', sourceExternalId:'jd-shop-m806418-alternatives-2026-08' },
  { original:'M806418', alternative:'PMLF3462', name:'Engine Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'engine-oil-filters', sourceUrl:'https://shop.deere.com/us/product/M806418%253A-Engine-Oil-Filter/p/M806418', sourceExternalId:'jd-shop-m806418-alternatives-2026-08' },
  { original:'M806418', alternative:'PMLF3692', name:'Engine Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'engine-oil-filters', sourceUrl:'https://shop.deere.com/us/product/M806418%253A-Engine-Oil-Filter/p/M806418', sourceExternalId:'jd-shop-m806418-alternatives-2026-08' },
  { original:'RE45864', alternative:'A-RE45864', name:'Hydraulic Oil Filter', manufacturerName:'A&I Products', manufacturerSlug:'a-i-products', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/RE45864%3A-Hydraulic-Oil-Filter/p/RE45864', sourceExternalId:'jd-shop-re45864-alternatives-2026-08' },
  { original:'RE45864', alternative:'PMHF6781', name:'Hydraulic Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/RE45864%3A-Hydraulic-Oil-Filter/p/RE45864', sourceExternalId:'jd-shop-re45864-alternatives-2026-08' },
  { original:'RE45864', alternative:'PMRE45864', name:'Premium Hydraulic Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/RE45864%3A-Hydraulic-Oil-Filter/p/RE45864', sourceExternalId:'jd-shop-re45864-alternatives-2026-08' },
  { original:'LVA10419', alternative:'A-VPK1528', name:'Hydraulic Oil Filter', manufacturerName:'A&I Products', manufacturerSlug:'a-i-products', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/LVA10419%3A-Transmission-Oil-Filter/p/LVA10419', sourceExternalId:'jd-shop-lva10419-alternatives-2026-08' },
  { original:'LVA10419', alternative:'PMHF6550', name:'Hydraulic Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/LVA10419%3A-Transmission-Oil-Filter/p/LVA10419', sourceExternalId:'jd-shop-lva10419-alternatives-2026-08' },
  { original:'LVA10419', alternative:'PMHF6552', name:'Hydraulic Oil Filter', manufacturerName:'Fleetguard', manufacturerSlug:'fleetguard', category:'hydraulic-filters', sourceUrl:'https://shop.deere.com/us/product/LVA10419%3A-Transmission-Oil-Filter/p/LVA10419', sourceExternalId:'jd-shop-lva10419-alternatives-2026-08' },
];

const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during official aftermarket alternatives migration.');
  return Number(rows[0].id);
}

export const officialAftermarketAlternativesMigration: DbMigration = {
  id: '20260827_108_official_aftermarket_alternatives',
  description: 'Add Shop.Deere-listed A&I, Sunbelt and Fleetguard alternatives for selected filters',
  async apply(connection) {
    const johnDeereId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    for (const [name,slug] of [['Sunbelt','sunbelt'],['Fleetguard','fleetguard'],['A&I Products','a-i-products']] as const) {
      await connection.query(`INSERT INTO manufacturers (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [name,slug]);
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const sourceIds = new Map<string,number>();
    for (const alt of alternatives) {
      if (!sourceIds.has(alt.sourceExternalId)) {
        const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [alt.sourceExternalId]);
        let recordId = existing[0]?.id ? Number(existing[0].id) : 0;
        if (!recordId) {
          const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
            [sourceId,alt.sourceUrl,alt.sourceExternalId,`John Deere ${alt.original} - official alternative buying options`],
          );
          recordId = Number(result.insertId);
        }
        sourceIds.set(alt.sourceExternalId,recordId);
      }

      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [alt.category]);
      const altManufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug=? LIMIT 1`, [alt.manufacturerSlug]);
      const originalId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [johnDeereId,normalize(alt.original)]);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
        [altManufacturerId,categoryId,alt.alternative,normalize(alt.alternative),alt.name,`Shop.Deere.com lists this as an alternative buying option for John Deere ${alt.original}.`],
      );
      const alternativeId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [altManufacturerId,normalize(alt.alternative)]);
      const recordId = sourceIds.get(alt.sourceExternalId);
      if (!recordId) throw new Error('Missing alternative source record.');

      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'alternative',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [originalId,alternativeId,recordId],
      );
    }
  },
};
