export type AttachmentEvidenceGroup<T extends { id: number }> = {
  attachmentId: number;
  records: T[];
};

export function groupAttachmentEvidence<T extends { id: number }>(records: T[]): AttachmentEvidenceGroup<T>[] {
  const groups = new Map<number, T[]>();

  for (const record of records) {
    const current = groups.get(record.id) ?? [];
    current.push(record);
    groups.set(record.id, current);
  }

  return Array.from(groups, ([attachmentId, groupedRecords]) => ({
    attachmentId,
    records: groupedRecords,
  }));
}

export function uniqueEvidenceValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}
