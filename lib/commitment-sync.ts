// Tier 3 #10 — conflict resolution for commitment sync.
//
// Before this, index.tsx did:
//   if (cloudCommitments.data?.length) setCommitments(cloudCommitments.data.map(...))
// — a wholesale replace on every successful refetch. That silently
// discarded two categories of local-only state: (a) a commitment captured
// locally that hadn't reached the server yet (still on its client-
// timestamp id), and (b) a local edit that failed to sync (Tier 1 #1's
// `syncFailed` flag) whose cloud counterpart is now stale. Framework-free
// by design, like lib/critical-cascade.ts, so it's directly unit-testable.

export type SyncableCommitment = {
  id: string;
  clientId?: string;
  serverId?: number;
  revision?: number;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "rescheduled" | "missed";
  riskState: "stable" | "at_risk" | "rescued" | "missed";
  critical: boolean;
  criticalDeadline?: string;
  meetingProvider?: "zoom" | "meet";
  meetingUrl?: string;
  warningMuted?: boolean;
  syncFailed?: boolean;
  // Tier 1-3 reintegration: local soft-delete-with-undo (see index.tsx).
  deletedAt?: string;
};

export type CloudCommitmentRow = {
  id: number;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "rescheduled" | "missed";
  riskState: "stable" | "at_risk" | "rescued" | "missed";
  critical: boolean;
  criticalDeadline?: string | Date | null;
  meetingProvider?: "zoom" | "meet" | null;
  meetingUrl?: string | null;
  warningMuted?: boolean | null;
};

/**
 * Same heuristic already established in index.tsx's Tier 1 #1 retry loop:
 * a 13-digit client timestamp (`Date.now().toString()`) vs. a real, much
 * smaller server autoincrement id. Flagged there as a stopgap, not a real
 * invariant — see FIXES-LOG.md.
 */
function isUnsyncedLocalId(id: string, clientId?: string): boolean {
  return Boolean(clientId) || !/^\d+$/.test(id);
}

export function cloudRowToCommitment(row: CloudCommitmentRow): SyncableCommitment {
  return {
    id: String(row.id),
    title: row.title,
    category: row.category,
    scheduledDate: row.scheduledDate,
    timeStart: row.timeStart,
    timeEnd: row.timeEnd,
    priority: row.priority,
    status: row.status,
    riskState: row.riskState,
    critical: row.critical,
    criticalDeadline: row.criticalDeadline ? new Date(row.criticalDeadline).toISOString() : undefined,
    meetingProvider: row.meetingProvider ?? undefined,
    meetingUrl: row.meetingUrl ?? undefined,
    warningMuted: row.warningMuted ?? undefined,
  };
}

/**
 * Merges a cloud refetch into local state without discarding local-only
 * changes.
 *
 * Rules:
 * - A local commitment that hasn't reached the server yet (still on its
 *   client-timestamp id) is always kept — the cloud has no idea it exists.
 * - A local commitment marked `syncFailed` is kept over its cloud
 *   counterpart — local holds the user's latest intent; accepting cloud
 *   here would silently revert it and leave the Tier 1 #1 retry loop with
 *   nothing left to retry.
 * - Otherwise, cloud wins — this is what actually makes multi-device sync
 *   work (a change made elsewhere shows up here).
 * - A cloud row whose id is in `suppressedIds` (deleted locally earlier
 *   this session — see Tier 1 #3 / Tier 2 #6) is never resurrected, even
 *   if the cloud delete hasn't completed or failed.
 */
export function mergeCommitments(local: SyncableCommitment[], cloud: CloudCommitmentRow[], suppressedIds: ReadonlySet<string> = new Set()): SyncableCommitment[] {
  const localById = new Map(local.map((item) => [item.id, item] as const));
  const merged: SyncableCommitment[] = [];
  const seen = new Set<string>();

  for (const row of cloud) {
    const id = String(row.id);
    if (suppressedIds.has(id)) continue;
    seen.add(id);
    const localMatch = localById.get(id);
    if (localMatch?.deletedAt) { merged.push(localMatch); continue; }
    merged.push(localMatch?.syncFailed ? localMatch : cloudRowToCommitment(row));
  }

  for (const item of local) {
    if (seen.has(item.id) || suppressedIds.has(item.id)) continue;
    // A real server id that's absent from a full, successful cloud fetch
    // means the row genuinely no longer exists server-side (deleted
    // elsewhere) — only an unsynced local id is worth keeping here.
    if (isUnsyncedLocalId(item.id, item.clientId)) merged.push(item);
  }

  return merged;
}
