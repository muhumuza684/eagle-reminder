export type SyncState = "local" | "pending" | "syncing" | "synced" | "failed" | "conflict" | "deleted" | "restored";

export type SyncRecord = { clientId: string; revision: number; state: SyncState; updatedAt: string; deletedAt: string | null; error?: string };

export function transitionSync(record: SyncRecord, next: SyncState, error?: string): SyncRecord {
  const allowed: Record<SyncState, SyncState[]> = {
    local: ["pending", "deleted"], pending: ["syncing", "failed", "deleted"], syncing: ["synced", "failed", "conflict", "deleted"],
    synced: ["pending", "deleted", "restored"], failed: ["pending", "deleted"], conflict: ["pending", "deleted"], deleted: ["restored"], restored: ["pending", "deleted"],
  };
  if (!allowed[record.state].includes(next)) throw new Error(`Invalid sync transition ${record.state} -> ${next}`);
  return { ...record, state: next, error, updatedAt: new Date().toISOString() };
}
