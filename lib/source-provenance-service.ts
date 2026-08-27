import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type SourceType = 'manufacturer' | 'manual' | 'test' | 'supplier' | 'government' | 'reference' | 'other';
export type SourceAuthorityLevel = 'official' | 'primary' | 'secondary';

export type SourceProvenance = {
  url: string;
  sourceName: string;
  sourceType: SourceType;
  authorityLevel: SourceAuthorityLevel;
};

type SourceProvenanceRow = RowDataPacket & {
  url: string;
  source_name: string;
  source_type: SourceType;
  authority_level: SourceAuthorityLevel;
};

export async function getSourceProvenanceByUrls(urls: string[]): Promise<SourceProvenance[]> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  if (uniqueUrls.length === 0) return [];

  try {
    const db = await getDbReady();
    const placeholders = uniqueUrls.map(() => '?').join(',');
    const [rows] = await db.query<SourceProvenanceRow[]>(`
      SELECT DISTINCT
        sr.url,
        s.name AS source_name,
        s.source_type,
        s.authority_level
      FROM source_records sr
      INNER JOIN sources s ON s.id = sr.source_id
      WHERE sr.url IN (${placeholders})
        AND sr.url IS NOT NULL
    `, uniqueUrls);

    return rows.map((row) => ({
      url: row.url,
      sourceName: row.source_name,
      sourceType: row.source_type,
      authorityLevel: row.authority_level,
    }));
  } catch (error) {
    console.error('Unable to load source provenance:', error);
    return [];
  }
}
