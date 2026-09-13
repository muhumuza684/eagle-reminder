// MERGED — see MERGE-NOTES.md for the reconciliation decisions:
//  - criticalDeadline column (from c_next_sequence): an explicit deadline
//    field, decoupled from timeStart/timeEnd, since "before Y" is not
//    necessarily the commitment's own scheduled time.
//  - criticalCheckpoints.status enum (from a_section7), not two booleans
//    (c_next_sequence's acknowledged/escalated flags) — a single status
//    field can't represent an invalid combination and matches the state
//    machine in lib/critical-cascade.ts.
//  - stage enum uses "three_hours" (c_next_sequence's naming), since that's
//    what the natural-language parser and both UIs' capture flow reference.
//  - userPreferences.shareTheme defaults to "Signal" (c_next_sequence),
//    matching the real theme names in dashboard.tsx (a_section7 guessed
//    "classic", which isn't one of the app's actual options).

import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  // Tier 2 #5 — the SRS (FR-A2/FR-A3) always required these; they were
  // never actually added. Without a server-known timezone, there's no
  // correct way to compute "8am local" for a scheduled push-delivery job
  // (a known P1 gap) — the app currently only ever infers time from the
  // device's own clock. IANA zone name (e.g. "Africa/Kampala"), not a raw
  // UTC offset, since offsets shift with DST and a name is what every
  // scheduling library actually wants.
  timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
  language: varchar("language", { length: 8 }).default("en").notNull(),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const commitments = mysqlTable("commitments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(),
  timeStart: varchar("timeStart", { length: 5 }).notNull(),
  timeEnd: varchar("timeEnd", { length: 5 }).notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["active", "completed", "rescheduled", "missed"]).default("active").notNull(),
  riskState: mysqlEnum("riskState", ["stable", "at_risk", "rescued", "missed"]).default("stable").notNull(),
  critical: boolean("critical").default(false).notNull(),
  // The deadline the two critical checkpoints (FR-G2) are computed from. Kept
  // separate from timeStart/timeEnd since "before Y" is not necessarily the
  // same as the commitment's own scheduled window.
  criticalDeadline: timestamp("criticalDeadline"),
  meetingProvider: mysqlEnum("meetingProvider", ["zoom", "meet"]),
  meetingUrl: varchar("meetingUrl", { length: 500 }),
  // Per-commitment override for the five-minute meeting warning. Null means
  // "use the global Settings preference"; true/false is an explicit override.
  warningMuted: boolean("warningMuted"),
  // Tier 2 #6 — was a hard delete (Tier 1 #3); a mis-tap on "Delete" or an
  // accidental capture had no recovery path at all. NULL = active row;
  // set = soft-deleted, kept for audit/undo rather than gone forever.
  // Reads throughout db.ts now filter `isNull(commitments.deletedAt)`.
  deletedAt: timestamp("deletedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Exactly two rows are created per critical commitment (FR-G2): one for
// "day_before", one for "three_hours". Kept as its own table (rather than
// flattening onto commitments) so status/acknowledgement state and any
// future stage additions (FR-G2b) don't require another commitments
// migration.
export const criticalCheckpoints = mysqlTable("criticalCheckpoints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  commitmentId: int("commitmentId").notNull(),
  stage: mysqlEnum("stage", ["day_before", "three_hours"]).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  status: mysqlEnum("status", ["pending", "acknowledged", "escalated", "missed"]).default("pending").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  // Tier 2 #6 — used specifically by clearCriticalCheckpoints (removing a
  // critical flag), so there's a record of what a cascade looked like when
  // it was cancelled. NOT used by replaceCriticalCheckpoints (a deadline
  // change) — that's a genuine replace, not a user-facing delete, so the
  // stale rows there are still hard-deleted; keeping them as "soft
  // deleted" would just be clutter with no audit value.
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// One row per user. Centralizes what was previously local-only Settings
// state (ritual times, notification/voice/chime toggles, share theme) so it
// survives a reinstall and follows the user across devices.
export const userPreferences = mysqlTable("userPreferences", {
  userId: int("userId").primaryKey(),
  briefingHour: int("briefingHour").default(8).notNull(),
  reviewHour: int("reviewHour").default(22).notNull(),
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  voiceEnabled: boolean("voiceEnabled").default(true).notNull(),
  meetingChimeMuted: boolean("meetingChimeMuted").default(false).notNull(),
  earlyWarningMuted: boolean("earlyWarningMuted").default(false).notNull(),
  shareTheme: varchar("shareTheme", { length: 32 }).default("Signal").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Tier 3 #12 — production push delivery. The client already calls
// `Notifications.getExpoPushTokenAsync()` (lib/native-services.ts) but
// nothing ever sent that token to the server or stored it — this table and
// the endpoints in routers.ts close that gap. One row per device (not
// folded onto `users`) so a user signed in on two phones gets both, and a
// stale/uninstalled device's token can be pruned without touching the
// other. `lastSentAt` lets the scheduled job (server/pushSchedule.ts) avoid
// double-sending within the same local hour if it runs more than once.
export const pushTokens = mysqlTable("pushTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  platform: mysqlEnum("platform", ["ios", "android", "web"]).notNull(),
  lastBriefingSentAt: timestamp("lastBriefingSentAt"),
  lastReviewSentAt: timestamp("lastReviewSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const weeklySnapshots = mysqlTable("weeklySnapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  snapshotDate: varchar("snapshotDate", { length: 10 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  priority: varchar("priority", { length: 16 }).notNull().default("all"),
  completed: int("completed").notNull().default(0),
  closed: int("closed").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Commitment = typeof commitments.$inferSelect;
export type InsertCommitment = typeof commitments.$inferInsert;
export type WeeklySnapshot = typeof weeklySnapshots.$inferSelect;
export type InsertWeeklySnapshot = typeof weeklySnapshots.$inferInsert;
export type CriticalCheckpoint = typeof criticalCheckpoints.$inferSelect;
export type InsertCriticalCheckpoint = typeof criticalCheckpoints.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
