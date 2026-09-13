// MERGED — see MERGE-NOTES.md. Uses c_next_sequence's create/update flow
// (client sends an explicit `criticalDeadline`, computed by
// parseCriticalCommitment at capture time) combined with a_section7's
// richer checkpoint status model (a single `status` enum, not two booleans,
// so the client's acknowledge/escalate/expire tick loop has one field to
// read and write instead of reconciling two).

import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { buildCriticalCheckpoints } from "../lib/critical-cascade";
import { rateLimited } from "./rateLimit";
import { log } from "./logger";

const commitmentInput = z.object({
  title: z.string().min(1).max(255),
  category: z.string().max(64),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["active", "completed", "rescheduled", "missed"]).default("active"),
  riskState: z.enum(["stable", "at_risk", "rescued", "missed"]).default("stable"),
  critical: z.boolean().default(false),
  // The "before Y" deadline the two critical checkpoints are computed from (FR-G2).
  criticalDeadline: z.string().datetime().optional(),
  meetingProvider: z.enum(["zoom", "meet"]).optional(),
  meetingUrl: z.string().url().max(500).optional(),
  warningMuted: z.boolean().optional(),
});

const commitmentUpdateInput = z.object({
  id: z.number(),
  status: z.enum(["active", "completed", "rescheduled", "missed"]).optional(),
  riskState: z.enum(["stable", "at_risk", "rescued", "missed"]).optional(),
  critical: z.boolean().optional(),
  criticalDeadline: z.string().datetime().nullable().optional(),
  meetingProvider: z.enum(["zoom", "meet"]).optional(),
  meetingUrl: z.string().url().max(500).optional(),
  warningMuted: z.boolean().nullable().optional(),
});

const preferencesInput = z.object({
  briefingHour: z.number().int().min(0).max(23).optional(),
  reviewHour: z.number().int().min(0).max(23).optional(),
  notificationsEnabled: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
  meetingChimeMuted: z.boolean().optional(),
  earlyWarningMuted: z.boolean().optional(),
  shareTheme: z.string().max(32).optional(),
});

const checkpointStatusInput = z.enum(["pending", "acknowledged", "escalated", "missed"]);

/** Builds the two DB-ready checkpoint rows (stage + dueAt) for a given deadline (FR-G2). */
function computeCheckpointRows(deadline: Date) {
  return buildCriticalCheckpoints(deadline).map((checkpoint) => ({ stage: checkpoint.stage, dueAt: new Date(checkpoint.dueAt) }));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
    // Tier 2 #5 — the client calls this once on launch (and whenever its
    // detected zone changes) with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
    // Loosely rate-limited since it should fire rarely, not on every render.
    updateLocale: rateLimited("auth.updateLocale", 10, 60_000).input(z.object({ timezone: z.string().min(1).max(64), language: z.string().min(2).max(8).optional() })).mutation(({ ctx, input }) => db.updateUserLocale(ctx.user.id, input).then(() => ({ success: true } as const))),
  }),
  quotes: router({
    generate: rateLimited("quotes.generate", 5, 60_000).input(z.object({ completionRate: z.number().int().min(0).max(100), topCategory: z.string().max(64), completed: z.number().int().min(0), closed: z.number().int().min(0) })).mutation(async ({ input }) => { const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "Write one concise, warm, personalized motivational quote. Return only the quote, no quotation marks." }, { role: "user", content: `Recent achievements: ${input.completed} of ${input.closed} closed commitments completed (${input.completionRate}%). Top category: ${input.topCategory}.` }], maxTokens: 80 }); const content = response.choices?.[0]?.message?.content; return { quote: typeof content === "string" && content.trim() ? content.trim().replace(/^['\"]|['\"]$/g, "") : "You kept showing up; that is how momentum becomes yours." }; }),
  }),
  snapshots: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserSnapshots(ctx.user.id)),
    upsert: protectedProcedure.input(z.object({ snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.string().max(64), priority: z.string().max(16).default("all"), completed: z.number().int().min(0), closed: z.number().int().min(0) })).mutation(({ ctx, input }) => db.upsertUserSnapshot({ userId: ctx.user.id, ...input })),
  }),
  commitments: router({
    list: protectedProcedure.query(({ ctx }) => db.getUserCommitments(ctx.user.id)),
    create: rateLimited("commitments.create", 40, 60_000).input(commitmentInput).mutation(async ({ ctx, input }) => {
      const { criticalDeadline, ...rest } = input;
      const id = await db.createCommitment({ userId: ctx.user.id, ...rest, criticalDeadline: criticalDeadline ? new Date(criticalDeadline) : undefined });
      if (input.critical && criticalDeadline) await db.replaceCriticalCheckpoints(ctx.user.id, id, computeCheckpointRows(new Date(criticalDeadline)));
      log({ event: "commitment.created", level: "info", userId: ctx.user.id, commitmentId: id, critical: input.critical });
      return id;
    }),
    update: rateLimited("commitments.update", 90, 60_000).input(commitmentUpdateInput).mutation(async ({ ctx, input }) => {
      const { id, criticalDeadline, ...rest } = input;
      const patch: Record<string, unknown> = { ...rest };
      if (criticalDeadline !== undefined) patch.criticalDeadline = criticalDeadline ? new Date(criticalDeadline) : null;
      await db.updateUserCommitment(ctx.user.id, id, patch);
      if (input.critical === false) await db.clearCriticalCheckpoints(ctx.user.id, id);
      else if (input.critical && criticalDeadline) await db.replaceCriticalCheckpoints(ctx.user.id, id, computeCheckpointRows(new Date(criticalDeadline)));
      return { success: true } as const;
    }),
    // Tier 1 #3 — was previously impossible: a mis-capture could only ever
    // have its status changed, never actually be removed.
    delete: rateLimited("commitments.delete", 30, 60_000).input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteUserCommitment(ctx.user.id, input.id).then(() => { log({ event: "commitment.deleted", level: "info", userId: ctx.user.id, commitmentId: input.id }); return { success: true } as const; })),
  }),
  checkpoints: router({
    listForCommitment: protectedProcedure.input(z.object({ commitmentId: z.number() })).query(({ ctx, input }) => db.getCommitmentCheckpoints(ctx.user.id, input.commitmentId)),
    list: protectedProcedure.query(({ ctx }) => db.getUserCheckpoints(ctx.user.id)),
    // Single status-transition endpoint (pending -> acknowledged / escalated / missed) —
    // the client's 30s tick loop in index.tsx computes the next status locally via
    // lib/critical-cascade.ts (shouldEscalate / expireUnacknowledged) and persists the
    // result here, rather than the server owning separate acknowledge/escalate mutations.
    update: rateLimited("checkpoints.update", 60, 60_000).input(z.object({ id: z.number(), status: checkpointStatusInput })).mutation(({ ctx, input }) => db.updateCheckpoint(ctx.user.id, input.id, { status: input.status, acknowledgedAt: input.status === "acknowledged" ? new Date() : undefined }).then(() => {
      // "acknowledged" is the everything's-fine case and would just be
      // noise at info-level on every tap; escalated/missed are exactly the
      // failures the product's trust-latency thesis depends on being able
      // to prove happened, so those get logged at warn.
      log({ event: "checkpoint.status_changed", level: input.status === "escalated" || input.status === "missed" ? "warn" : "info", userId: ctx.user.id, checkpointId: input.id, status: input.status });
    })),
  }),
  // Tier 3 #12 — the client already fetches an Expo push token
  // (lib/native-services.ts's registerForNotifications) but had nowhere to
  // send it. This is that endpoint.
  notifications: router({
    registerToken: rateLimited("notifications.registerToken", 10, 60_000).input(z.object({ token: z.string().min(1).max(128), platform: z.enum(["ios", "android", "web"]) })).mutation(({ ctx, input }) => db.registerPushToken(ctx.user.id, input.token, input.platform).then(() => ({ success: true } as const))),
    unregisterToken: rateLimited("notifications.unregisterToken", 10, 60_000).input(z.object({ token: z.string().min(1).max(128) })).mutation(({ ctx, input }) => db.unregisterPushToken(ctx.user.id, input.token).then(() => ({ success: true } as const))),
  }),
  preferences: router({
    get: protectedProcedure.query(({ ctx }) => db.getUserPreferences(ctx.user.id)),
    upsert: protectedProcedure.input(preferencesInput).mutation(({ ctx, input }) => db.upsertUserPreferences(ctx.user.id, input)),
  }),
});
export type AppRouter = typeof appRouter;
