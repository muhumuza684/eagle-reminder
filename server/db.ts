// MERGED â€” see MERGE-NOTES.md. Base helpers are unchanged from the
// original project; the "Critical checkpoints" and "User preferences"
// sections below are the reconciled versions of both patches.

import { and, eq, asc, isNull, isNotNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  commitments,
  criticalCheckpoints,
  InsertCommitment,
  InsertCriticalCheckpoint,
  InsertPushToken,
  InsertUser,
  InsertUserPreferences,
  InsertWeeklySnapshot,
  pushTokens,
  userPreferences,
  users,
  weeklySnapshots,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DEFAULT_PREFERENCES } from "../lib/preferences-defaults";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch { _db = null; } } return _db; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn };
  // Tier 2 #5 â€” optional so this call stays backward-compatible with
  // whatever platform-managed login flow already calls upsertUser without
  // knowing about these fields; the column defaults ("UTC"/"en") cover it
  // either way. Only set on INSERT (new user), not on every re-login,
  // because updateUserLocale (below) is the deliberate path for changing
  // an existing user's locale â€” this avoids clobbering it with a stale
  // client-detected value on every sign-in.
  if (user.timezone) values.timezone = user.timezone;
  if (user.language) values.language = user.language;
  if (user.role) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

/**
 * Tier 2 #5 â€” the deliberate path for setting/changing a user's timezone
 * and language, called from the client (e.g. on first launch, via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`) rather than baked
 * into login, so a user who travels can have it refreshed without it
 * fighting the login upsert above.
 */
export async function updateUserLocale(userId: number, patch: { timezone?: string; language?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(users).set(patch).where(eq(users.id, userId));
}

export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function getUserCommitments(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(commitments).where(and(eq(commitments.userId, userId), isNull(commitments.deletedAt))).orderBy(asc(commitments.scheduledDate), asc(commitments.timeStart)); }
export async function createCommitment(data: InsertCommitment) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.insert(commitments).values(data); return Number(result[0].insertId); }
export async function updateUserCommitment(userId: number, id: number, data: Partial<InsertCommitment>) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(commitments).set(data).where(and(eq(commitments.id, id), eq(commitments.userId, userId), isNull(commitments.deletedAt))); }

/**
 * Tier 2 #6 â€” was a hard delete (Tier 1 #3's original version). Now a soft
 * delete: sets `deletedAt` instead of removing the row, so an accidental
 * delete is recoverable and there's an audit trail. Scoped to `userId` so
 * a user can only ever delete their own row.
 */
export async function deleteUserCommitment(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const now = new Date();
  await db.update(criticalCheckpoints).set({ deletedAt: now }).where(and(eq(criticalCheckpoints.userId, userId), eq(criticalCheckpoints.commitmentId, id)));
  await db.update(commitments).set({ deletedAt: now }).where(and(eq(commitments.id, id), eq(commitments.userId, userId)));
}

/** Reverses deleteUserCommitment â€” not currently wired to any client action, kept ready for an "Undo" affordance. */
export async function restoreUserCommitment(userId: number, id: number) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(commitments).set({ deletedAt: null }).where(and(eq(commitments.id, id), eq(commitments.userId, userId)));
  await db.update(criticalCheckpoints).set({ deletedAt: null }).where(and(eq(criticalCheckpoints.userId, userId), eq(criticalCheckpoints.commitmentId, id)));
}

/**
 * Genuinely, permanently removes soft-deleted rows older than `olderThanDays`.
 * Not called anywhere yet â€” intended to be invoked from a periodic job once
 * one exists (see FIXES-LOG.md Tier 2 #8 / structured logging â€” the same
 * "no scheduled job infrastructure yet" gap applies here), so soft-deleted
 * data doesn't accumulate forever without an actual data-retention policy.
 */
export async function purgeSoftDeletedCommitments(olderThanDays = 30) {
  const db = await getDb(); if (!db) return;
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  await db.delete(criticalCheckpoints).where(and(isNotNull(criticalCheckpoints.deletedAt), lt(criticalCheckpoints.deletedAt, cutoff)));
  await db.delete(commitments).where(and(isNotNull(commitments.deletedAt), lt(commitments.deletedAt, cutoff)));
}
export async function getUserSnapshots(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(weeklySnapshots).where(eq(weeklySnapshots.userId, userId)).orderBy(asc(weeklySnapshots.snapshotDate)); }
export async function upsertUserSnapshot(data: InsertWeeklySnapshot) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await db.select().from(weeklySnapshots).where(and(eq(weeklySnapshots.userId, data.userId), eq(weeklySnapshots.snapshotDate, data.snapshotDate), eq(weeklySnapshots.category, data.category), eq(weeklySnapshots.priority, data.priority ?? "all"))).limit(1); if (existing[0]) { await db.update(weeklySnapshots).set({ completed: data.completed, closed: data.closed }).where(eq(weeklySnapshots.id, existing[0].id)); return existing[0].id; } const result = await db.insert(weeklySnapshots).values(data); return Number(result[0].insertId); }

// --- Critical checkpoints (exactly two per critical commitment â€” FR-G2) ----

export async function getCommitmentCheckpoints(userId: number, commitmentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(criticalCheckpoints).where(and(eq(criticalCheckpoints.userId, userId), eq(criticalCheckpoints.commitmentId, commitmentId), isNull(criticalCheckpoints.deletedAt))).orderBy(asc(criticalCheckpoints.dueAt));
}

export async function getUserCheckpoints(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(criticalCheckpoints).where(and(eq(criticalCheckpoints.userId, userId), isNull(criticalCheckpoints.deletedAt))).orderBy(asc(criticalCheckpoints.dueAt));
}

/**
 * Replaces any existing checkpoints for a commitment with exactly the two
 * rows passed in (FR-G2). Called whenever a commitment is flagged critical
 * or its deadline changes, so a commitment never ends up with more or fewer
 * than two checkpoints.
 */
export async function replaceCriticalCheckpoints(userId: number, commitmentId: number, rows: Array<{ stage: "day_before" | "three_hours"; dueAt: Date }>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.delete(criticalCheckpoints).where(and(eq(criticalCheckpoints.userId, userId), eq(criticalCheckpoints.commitmentId, commitmentId)));
  if (rows.length === 0) return [];
  const values: InsertCriticalCheckpoint[] = rows.map((row) => ({ userId, commitmentId, stage: row.stage, dueAt: row.dueAt, status: "pending" }));
  await db.insert(criticalCheckpoints).values(values);
  return getCommitmentCheckpoints(userId, commitmentId);
}

/** Soft-delete (Tier 2 #6) â€” called when a critical flag is removed. See the deletedAt comment on criticalCheckpoints in schema.ts for why replaceCriticalCheckpoints (below/above) stays a hard delete instead. */
export async function clearCriticalCheckpoints(userId: number, commitmentId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(criticalCheckpoints).set({ deletedAt: new Date() }).where(and(eq(criticalCheckpoints.userId, userId), eq(criticalCheckpoints.commitmentId, commitmentId)));
}

/** Sets a checkpoint's status directly â€” used for acknowledge/escalate/expire transitions from lib/critical-cascade.ts. */
export async function updateCheckpoint(userId: number, id: number, data: Partial<InsertCriticalCheckpoint>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  await db.update(criticalCheckpoints).set(data).where(and(eq(criticalCheckpoints.id, id), eq(criticalCheckpoints.userId, userId), isNull(criticalCheckpoints.deletedAt)));
}

// --- User preferences (server-backed, local-fallback â€” see lib/preferences.ts) ---

export async function getUserPreferences(userId: number) {
  const db = await getDb(); if (!db) return { userId, ...DEFAULT_PREFERENCES, nextOfKinWindowMinutes: 120 };
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0] ?? { userId, ...DEFAULT_PREFERENCES, nextOfKinWindowMinutes: 120 };
}

export async function upsertUserPreferences(userId: number, patch: Partial<InsertUserPreferences>) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(userPreferences).set(patch).where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({ userId, ...DEFAULT_PREFERENCES, ...patch });
  }
  return getUserPreferences(userId);
}

// --- Push tokens (Tier 3 #12) -----------------------------------------------

/**
 * Upserts by token (not userId â€” a device can only ever belong to one
 * user's push registration at a time). Re-registering an existing token
 * under a different user (device re-installed, different account signed
 * in) reassigns it rather than creating a duplicate row, since `token` is
 * unique in the schema.
 */
export async function registerPushToken(userId: number, token: string, platform: "ios" | "android" | "web") {
  const db = await getDb(); if (!db) return;
  await db.insert(pushTokens).values({ userId, token, platform }).onDuplicateKeyUpdate({ set: { userId, platform, updatedAt: new Date() } });
}

export async function unregisterPushToken(userId: number, token: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
}

/** Used by the scheduled push job to prune a token Expo's receipt API reports as no longer valid (app uninstalled, etc). Deletes by token value globally â€” deliberately not scoped by userId, since the job discovers invalid tokens from Expo's response, not from a user-initiated action. */
export async function deletePushTokenByValue(token: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}

/**
 * Raw candidate data for the scheduled push job â€” every token paired with
 * its owner's timezone and ritual-hour preferences. Deliberately returns
 * everything and lets server/pushSchedule.ts's pure `selectDuePushes()`
 * decide who's actually due right now â€” keeping the "what does 8am local
 * mean for this user" timezone math out of the data-access layer, matching
 * this project's established pattern (critical-cascade.ts, commitment-sync.ts).
 */
export async function getPushCandidates() {
  const db = await getDb(); if (!db) return [];
  return db
    .select({
      tokenId: pushTokens.id,
      userId: pushTokens.userId,
      token: pushTokens.token,
      lastBriefingSentAt: pushTokens.lastBriefingSentAt,
      lastReviewSentAt: pushTokens.lastReviewSentAt,
      timezone: users.timezone,
      briefingHour: userPreferences.briefingHour,
      reviewHour: userPreferences.reviewHour,
      notificationsEnabled: userPreferences.notificationsEnabled,
    })
    .from(pushTokens)
    .innerJoin(users, eq(users.id, pushTokens.userId))
    .leftJoin(userPreferences, eq(userPreferences.userId, pushTokens.userId));
}

export async function markBriefingSent(tokenId: number, at: Date) {
  const db = await getDb(); if (!db) return;
  await db.update(pushTokens).set({ lastBriefingSentAt: at }).where(eq(pushTokens.id, tokenId));
}

export async function markReviewSent(tokenId: number, at: Date) {
  const db = await getDb(); if (!db) return;
  await db.update(pushTokens).set({ lastReviewSentAt: at }).where(eq(pushTokens.id, tokenId));
}



