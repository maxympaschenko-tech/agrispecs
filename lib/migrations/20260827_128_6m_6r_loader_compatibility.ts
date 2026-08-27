import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type LoaderSeed = {
  model: string;
  slug: string;
  liftCapacity: string;
  liftHeight: string;
  leveling: string;
};

type FitmentSeed = {
  tractor: string;
  loader: string;
  source: 'current-6-series' | '660r-pricebook';
  note: string;
};

const CURRENT_6_SERIES_EXTERNAL_ID = 'jd-6-series-loader-compat-current-2026-08';
const CURRENT_6_SERIES_URL = 'https://www.deere.com/en/tractors/utility-tractors/6-family-utility-tractors/';
const FRONT_LOADERS_EXTERNAL_ID = 'jd-front-loader-specs-current-2026-08';
const FRONT_LOADERS_URL = 'https://www.deere.com/en/loaders/front-end-loaders-for-tractors/';
const PRICEBOOK_660R_EXTERNAL_ID = 'jd-660r-loader-pricebook-2024-08-01';
const PRICEBOOK_660R_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/1%20Tractors_Ag_Attach_and_Implements_01Aug2024.pdf';

const loaders: LoaderSeed[] = [
  {
    model: '600R', slug: '600r',
    liftCapacity: 'NSL 5068 lb (2299 kg); MSL 4134 lb (1875 kg)',
    liftHeight: '154 in (3900 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '620R', slug: '620r',
    liftCapacity: 'NSL 3479 lb (1578 kg); MSL 4289-4306 lb (1946-1953 kg)',
    liftHeight: 'NSL 159 in (4042 mm); MSL 162 in (4121 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '640R', slug: '640r',
    liftCapacity: 'NSL 3832-3874 lb (1738-1757 kg); MSL 4736-4826 lb (2148-2189 kg)',
    liftHeight: '163.4-169.3 in (4151-4300 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '660R', slug: '660r',
    liftCapacity: '5701 lb (2586 kg)',
    liftHeight: '178 in (4520 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
];

const fitments: FitmentSeed[] = [
  { tractor:'6m-95', loader:'600r', source:'current-6-series', note:'John Deere US lists the 6M 95 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-95', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 95 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-105', loader:'600r', source:'current-6-series', note:'John Deere US lists the 6M 105 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-105', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 105 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-115', loader:'600r', source:'current-6-series', note:'John Deere US lists the 6M 115 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-115', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 115 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-125', loader:'600r', source:'current-6-series', note:'John Deere US lists the 6M 125 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-125', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 125 as compatible with the 600R or 620R front loader.' },
  { tractor:'6m-130', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 130 as compatible with the 620R or 640R front loader.' },
  { tractor:'6m-130', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6M 130 as compatible with the 620R or 640R front loader.' },
  { tractor:'6m-140', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 140 as compatible with the 620R or 640R front loader.' },
  { tractor:'6m-140', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6M 140 as compatible with the 620R or 640R front loader.' },
  { tractor:'6m-150', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6M 150 as compatible with the 620R or 640R front loader.' },
  { tractor:'6m-150', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6M 150 as compatible with the 620R or 640R front loader.' },

  { tractor:'6r-110', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6R 110 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-110', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6R 110 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-120', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6R 120 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-120', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6R 120 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-130', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6R 130 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-130', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6R 130 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-140', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6R 140 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-140', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6R 140 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-150', loader:'620r', source:'current-6-series', note:'John Deere US lists the 6R 150 as compatible with the 620R or 640R front loader.' },
  { tractor:'6r-150', loader:'640r', source:'current-6-series', note:'John Deere US lists the 6R 150 as compatible with the 620R or 640R front loader.' },

  { tractor:'6r-175', loader:'660r', source:'660r-pricebook', note:'John Deere 660R price-book configuration explicitly lists MY22.5 and newer 6R 175 tractors for field-installed or loader-ready 660R configurations.' },
  { tractor:'6r-195', loader:'660r', source:'660r-pricebook', note:'John Deere 660R price-book configuration explicitly lists MY22.5 and newer 6R 195 tractors for field-installed or loader-ready 660R configurations.' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 6M/6R loader compatibility dependency.');
  return Number(rows[0].id);
}

export const johnDeere6M6RLoaderCompatibilityMigration: DbMigration = {
  id: '20260827_128_6m_6r_loader_compatibility',
  description: 'Add official John Deere 6M and 6R compatibility for 600R, 620R, 640R and 660R loaders',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    async function ensureSource(externalId: string, url: string, title: string, publishedDate: string | null = null) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
      if (existing[0]) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,url,externalId,title,publishedDate],
      );
      return Number(result.insertId);
    }

    const current6SeriesSourceId = await ensureSource(
      CURRENT_6_SERIES_EXTERNAL_ID,
      CURRENT_6_SERIES_URL,
      'John Deere US 6 Series Utility Tractors - loader compatibility',
    );
    await ensureSource(
      FRONT_LOADERS_EXTERNAL_ID,
      FRONT_LOADERS_URL,
      'John Deere US Front End Loaders - loader specifications',
    );
    const pricebook660RSourceId = await ensureSource(
      PRICEBOOK_660R_EXTERNAL_ID,
      PRICEBOOK_660R_URL,
      'John Deere 660R Standard Farm Loader price book - 1 August 2024',
      '2024-08-01',
    );

    for (const loader of loaders) {
      await connection.query(
        `INSERT INTO attachments (
          manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status
        ) VALUES (?,'front-loader',?,?,?,?,?,'verified')
        ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),
          lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,loader.model,loader.slug,loader.liftCapacity,loader.liftHeight,loader.leveling],
      );
    }

    for (const fitment of fitments) {
      const machineId = await selectId(connection, `
        SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1
      `, [fitment.tractor]);
      const attachmentId = await selectId(connection, `
        SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug=? LIMIT 1
      `, [manufacturerId,fitment.loader]);
      const sourceRecordId = fitment.source === '660r-pricebook' ? pricebook660RSourceId : current6SeriesSourceId;

      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),confidence='official'`,
        [machineId,attachmentId,fitment.note,sourceRecordId],
      );
    }
  },
};
