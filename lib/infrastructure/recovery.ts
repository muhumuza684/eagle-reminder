export type RecoveryCheckpoint = { version: 1; createdAt: string; records: string[] };

export function createRecoveryCheckpoint(records: string[], now = new Date()): RecoveryCheckpoint {
  return { version: 1, createdAt: now.toISOString(), records: [...records] };
}

export function validateRecoveryCheckpoint(value: unknown): value is RecoveryCheckpoint {
  if (!value || typeof value !== "object") return false;
  const v = value as RecoveryCheckpoint;
  return v.version === 1 && typeof v.createdAt === "string" && Array.isArray(v.records) && v.records.every(x => typeof x === "string");
}
