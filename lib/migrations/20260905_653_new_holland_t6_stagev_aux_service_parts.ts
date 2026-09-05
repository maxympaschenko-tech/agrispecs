import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartDef = {
  number: string;
  name: string;
  category: 'engine-service-filters' | 'brake-system-filters' | 'def-scr-filters' | 'ac-service-filters';
  officialUrl: string;
  officialExternalId: string;
  officialRole: string;
};
type FitmentDef = {
  slug: 't6-175' | 't6-180';
  model: string;
  configuration: string;
  url: string;
  externalId: string;
};

const VERSION_SLUG = 'stage-v-2020-market-unspecified';

const parts: PartDef[] = [
  {
    number: '47760847',
    name: 'Engine Oil Separator',
    category: 'engine-service-filters',
    officialUrl: 'https://www.mycnhstore.com/ie/en/caseih?clear=true&site=ie',
    officialExternalId: 'mycnh-47760847-engine-oil-separator-identity-2026-09',
    officialRole: 'Oil Separator - 71 mm OD x 174 mm L',
  },
  {
    number: '87491693',
    name: 'Brake Fluid Reservoir Filter',
    category: 'brake-system-filters',
    officialUrl: 'https://loja.newhollandag.com.br/category/filtros/filtros-de-leo/filtro/p/87491693',
    officialExternalId: 'new-holland-official-87491693-brake-reservoir-filter-identity-2026-09',
    officialRole: 'Brake Fluid Reservoir Filter',
  },
  {
    number: '87638772',
    name: 'Air Dryer Cartridge',
    category: 'brake-system-filters',
    officialUrl: 'https://www.mycnhstore.com/gb/en/newhollandag/category/filters/filters-components/cartridge/p/87638772',
    officialExternalId: 'mycnh-87638772-air-dryer-cartridge-identity-2026-09',
    officialRole: 'Air Dryer Cartridge - 140 mm OD x 164 mm L',
  },
  {
    number: '48047602',
    name: 'DEF Filler Neck and Filter Assembly',
    category: 'def-scr-filters',
    officialUrl: 'https://www.mycnhstore.com/ca/en/caseih/category/chassis-frame/fenders-hoods-sheet-metal/filter-def/p/48047602',
    officialExternalId: 'mycnh-48047602-def-filler-filter-identity-2026-09',
    officialRole: 'DEF Filler Neck and Filter Assembly; 170-micron filtration rating',
  },
  {
    number: '47580889',
    name: 'A/C Receiver-Drier Dehydrator',
    category: 'ac-service-filters',
    officialUrl: 'https://loja.newhollandag.com.br/category/filtros/filtros-dgua/receptor-secador/p/47580889',
    officialExternalId: 'new-holland-official-47580889-ac-receiver-drier-identity-2026-09',
    officialRole: 'Dehydrator element for the A/C condenser receiver-drier',
  },
  {
    number: '47901601',
    name: 'A/C Filter',
    category: 'ac-service-filters',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/cab-rops/heating-cooling/element/p/47901601',
    officialExternalId: 'mycnh-47901601-ac-filter-identity-2026-09',
    officialRole: 'A/C Filter',
  },
];

const fitments: FitmentDef[] = [
  {
    slug: 't6-175',
    model: 'T6.175',
    configuration: 'Dynamic Command Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-175-dynamic-command-sidewinder-ii-stage-v/ms12927?modelspecuid=12927',
    externalId: 'alg-land-t6-175-dynamic-stagev-aux-service-parts-2026-09',
  },
  {
    slug: 't6-180',
    model: 'T6.180',
    configuration: 'AutoCommand Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-180-auto-command-sidewinder-ii-stage-v/ms12735',
    externalId: 'alg-land-t6-180-autocommand-stagev-aux-service-parts-2026-09',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V auxiliary-service migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`, [name, domain]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
}

async function ensureRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandT6StageVAuxServicePartsMigration: DbMigration = {
  id: '20260905_653_new_holland_t6_stagev_aux_service_parts',
  description: 'Add exact T6.175 Dynamic and T6.180 AutoCommand Stage V auxiliary service parts with corrected OEM roles',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,'Engine Service Filters','engine-service-filters')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,'A/C Service Filters & Driers','ac-service-filters')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );

    const categoryIds = new Map<string, number>();
    for (const slug of ['engine-service-filters', 'brake-system-filters', 'def-scr-filters', 'ac-service-filters']) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const myCnhSourceId = await ensureSource(connection, 'MyCNH Store', 'mycnhstore.com', 'manufacturer', 'official');
    const newHollandPartsSourceId = await ensureSource(connection, 'New Holland Agriculture Parts', 'loja.newhollandag.com.br', 'manufacturer', 'official');
    const fitmentSourceId = await ensureSource(connection, 'Algard Landbrukssenter', 'alg-land.no', 'supplier', 'secondary');

    const partIds = new Map<string, number>();
    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing category ${part.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number, part.name],
      );
      partIds.set(part.number, await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, part.number]));

      const officialSourceId = part.officialUrl.includes('loja.newhollandag.com.br') ? newHollandPartsSourceId : myCnhSourceId;
      await ensureRecord(
        connection,
        officialSourceId,
        part.officialExternalId,
        part.officialUrl,
        `Official CNH ${part.number} ${part.name} identity`,
        {
          role: 'Official OEM part identity and service-system role',
          partNumber: part.number,
          identity: part.officialRole,
          correctionGuardrail: part.number === '87638772'
            ? 'A dealer service page labels this item as a transmission air filter, but official MyCNH identifies it as an Air Dryer Cartridge. The official identity controls categorization.'
            : part.number === '47580889'
              ? 'A dealer page groups this item under AC filters; the official New Holland page identifies it specifically as a dehydrator element for the A/C condenser receiver-drier.'
              : null,
          fitmentScope: 'Identity/function only. Exact T6 Stage V fitment is sourced separately.',
        },
      );
    }

    for (const fitment of fitments) {
      const fitmentRecordId = await ensureRecord(
        connection,
        fitmentSourceId,
        fitment.externalId,
        fitment.url,
        `Algard Landbrukssenter ${fitment.model} Stage V auxiliary service-parts list`,
        {
          role: 'Exact model/configuration service-parts evidence',
          model: fitment.model,
          configuration: fitment.configuration,
          listedParts: parts.map((part) => part.number),
          sourceLabels: {
            '47760847': 'Oljeseperator',
            '87491693': 'Filter bremsevesketank',
            '87638772': 'Luftfilter transmisjon',
            '48047602': 'Filter, DEF',
            '47580889': 'Filterinnsats AC',
            '47901601': 'Filter AC',
          },
          guardrail: 'Dealer grouping/labels establish that the exact configuration lists the part, but official CNH identity records control the service-system role and category. No neighboring T6 configuration is inferred.',
        },
      );

      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.slug],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const part of parts) {
        const partId = partIds.get(part.number);
        if (!partId) throw new Error(`Missing ${part.number} dependency.`);
        const fitmentNote = `${part.number} ${part.name} is directly listed on the exact ${fitment.model} ${fitment.configuration} service page. The normalized role shown here follows the official CNH part identity rather than the dealer heading when those differ. Market is not stated.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, versionId, fitment.configuration],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, fitmentRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, versionId, fitment.configuration, fitmentNote, fitmentRecordId],
          );
        }
      }
    }
  },
};
