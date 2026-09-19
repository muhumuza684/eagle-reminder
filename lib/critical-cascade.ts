// MERGED â€” see MERGE-NOTES.md for how this combines two independent patches
// that each solved one half of "Don't Let Me Forget" (FR-G1â€“FR-G4):
//   - a_section7's lib/critical-checkpoints.ts: the checkpoint status state
//     machine (acknowledge / escalate / expire / cascade rollup).
//   - c_next_sequence's lib/critical-cascade.ts: natural-language deadline
//     parsing with ambiguity detection (FR-G4).
// Framework-free by design (no AsyncStorage, no Expo, no tRPC) so it stays
// directly unit-testable and reusable from both client and server, per SRS
// constraint C2 (swappable logic behind a clean boundary).

export type CheckpointStage = "day_before" | "three_hours";
export type CheckpointStatus = "pending" | "acknowledged" | "escalated" | "missed";
export type CascadeStatus = "none" | "open" | "clear" | "missed";

export type Checkpoint = {
  id?: number;
  stage: CheckpointStage;
  dueAt: string; // ISO timestamp â€” string (not Date) so it round-trips through AsyncStorage/JSON untouched
  status: CheckpointStatus;
  acknowledgedAt?: string;
};

export type CriticalParseResult = {
  title: string;
  deadline: Date | null;
  ambiguous: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOURS_BEFORE_MS = 3 * 60 * 60 * 1000;

/**
 * Builds a commitment's ISO deadline from its scheduled date + start time.
 * Only needed as a fallback when a critical commitment has no explicit
 * `criticalDeadline` (e.g. a legacy record) â€” the normal capture path uses
 * parseCriticalCommitment below, which produces an explicit deadline that
 * may differ from the commitment's own start time (FR-G1: "before Y" is not
 * necessarily the commitment's own scheduled time).
 */
export function commitmentDeadlineIso(scheduledDate: string, timeStart: string): string {
  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = timeStart.split(":").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0).toISOString();
}

/**
 * FR-G2: MVP cascade SHALL use exactly 2 checkpoints â€” 1 day before, and
 * 3 hours before the deadline. (The 4-stage cascade is FR-G2b / Phase 2 and
 * is deliberately not built here â€” add a new exported map instead of
 * mutating this one when that phase starts.)
 */
export function buildCriticalCheckpoints(deadline: Date | string): Checkpoint[] {
  const deadlineMs = typeof deadline === "string" ? new Date(deadline).getTime() : deadline.getTime();
  return [
    { stage: "day_before", dueAt: new Date(deadlineMs - DAY_MS).toISOString(), status: "pending" },
    { stage: "three_hours", dueAt: new Date(deadlineMs - HOURS_BEFORE_MS).toISOString(), status: "pending" },
  ];
}

// --- Natural-language deadline parsing (FR-G1, FR-G4) -----------------------

const TIME_RE = /\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b/i;

/**
 * Extracts a concrete deadline from a "before ..." clause (or the whole
 * phrase, if no "before" keyword is present). Returns ambiguous: true when
 * there isn't one explicit, parseable time â€” per FR-G4, the caller must ask
 * exactly one clarifying question rather than defaulting silently.
 */
export function parseDeadlinePhrase(text: string, now: Date = new Date()): { deadline: Date | null; ambiguous: boolean } {
  const match = text.match(/before\s+(.+)$/i);
  const clause = (match ? match[1] : text).trim();
  if (!clause) return { deadline: null, ambiguous: true };
  const hasTomorrow = /tomorrow/i.test(clause);
  const timeMatch = clause.match(TIME_RE);
  if (!timeMatch) return { deadline: null, ambiguous: true };
  let hour = Number(timeMatch[1]);
  const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  const meridiem = timeMatch[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  const deadline = new Date(now);
  if (hasTomorrow) deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(hour, minute, 0, 0);
  if (!hasTomorrow && deadline.getTime() <= now.getTime()) deadline.setDate(deadline.getDate() + 1);
  return { deadline, ambiguous: false };
}

/** Parses the full "Eagle, don't let me forget X before Y" capture phrase. */
export function parseCriticalCommitment(text: string, now: Date = new Date()): CriticalParseResult {
  const rawTitle = text
    .replace(/^\s*eagle,?\s*/i, "")
    .replace(/don'?t let me forget/i, "")
    .replace(/before\s+.+$/i, "")
    .trim();
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) || "Untitled critical commitment";
  const { deadline, ambiguous } = parseDeadlinePhrase(text, now);
  return { title, deadline, ambiguous };
}

// --- Checkpoint status state machine (FR-G3) --------------------------------

export function acknowledgeCheckpoint(checkpoint: Checkpoint, at: Date = new Date()): Checkpoint {
  if (checkpoint.status === "acknowledged") return checkpoint;
  return { ...checkpoint, status: "acknowledged", acknowledgedAt: at.toISOString() };
}

/**
 * FR-G3: each checkpoint requires acknowledgment; if unacknowledged by its
 * due time, escalate it (the caller uses this to trigger the voice alert).
 * Pure predicate â€” does not mutate.
 */
export function shouldEscalate(checkpoint: Checkpoint, now: number = Date.now()): boolean {
  return checkpoint.status === "pending" && new Date(checkpoint.dueAt).getTime() <= now;
}

export function escalateCheckpoint(checkpoint: Checkpoint): Checkpoint {
  return checkpoint.status === "pending" ? { ...checkpoint, status: "escalated" } : checkpoint;
}

/**
 * A checkpoint that is still open (pending or escalated) once the
 * commitment's own deadline has passed converts to "missed" â€” this is what
 * the Nightly Review reads to decide whether the critical cascade failed.
 */
export function expireUnacknowledged(checkpoint: Checkpoint, deadlineIso: string, now: number = Date.now()): Checkpoint {
  const deadline = new Date(deadlineIso).getTime();
  if ((checkpoint.status === "pending" || checkpoint.status === "escalated") && now >= deadline) {
    return { ...checkpoint, status: "missed" };
  }
  return checkpoint;
}

/**
 * Rolls a set of checkpoints up into a single cascade status for display on
 * Today and in the Nightly Review: "clear" once both are acknowledged,
 * "missed" if either expired unacknowledged, otherwise "open".
 */
export function cascadeStatus(checkpoints: Checkpoint[]): CascadeStatus {
  if (checkpoints.length === 0) return "none";
  if (checkpoints.some((checkpoint) => checkpoint.status === "missed")) return "missed";
  if (checkpoints.every((checkpoint) => checkpoint.status === "acknowledged")) return "clear";
  return "open";
}

