export type AttachmentEvidenceGroup<T extends { id: number }> = {
  attachmentId: number;
  records: T[];
};

export type MachineEvidenceGroup<T extends { machineId: number }> = {
  machineId: number;
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

export function groupMachineEvidence<T extends { machineId: number }>(records: T[]): MachineEvidenceGroup<T>[] {
  const groups = new Map<number, T[]>();

  for (const record of records) {
    const current = groups.get(record.machineId) ?? [];
    current.push(record);
    groups.set(record.machineId, current);
  }

  return Array.from(groups, ([machineId, groupedRecords]) => ({
    machineId,
    records: groupedRecords,
  }));
}

export function uniqueEvidenceValues(values: Array<string | null | undefined>): string[] {
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(normalized));
}
