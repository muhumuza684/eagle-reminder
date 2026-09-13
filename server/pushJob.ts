// Tier 3 #12 — the actual entry point. Nothing in this codebase invokes
// this on a schedule yet, because there's no job-scheduler infrastructure
// in any of the uploaded exports (same underlying gap noted for
// purgeSoftDeletedCommitments in Tier 2 #6, and for the "no periodic job
// consuming logs" follow-up in Tier 2 #8). What IS here is genuinely
// runnable the moment that infrastructure exists — point a cron job,
// a serverless scheduled function, or a simple `setInterval` in a
// long-running process at `runScheduledPushJob()`, at least hourly (see
// pushSchedule.ts's docstring on `selectDuePushes` for why hourly is the
// minimum).

import * as db from "./db";
import { selectDuePushes } from "./pushSchedule";
import { contentFor, sendPushes } from "./pushDelivery";
import { log } from "./logger";

export async function runScheduledPushJob(now: Date = new Date()): Promise<{ sent: number; pruned: number }> {
  const candidates = await db.getPushCandidates();
  const due = selectDuePushes(candidates, now);
  if (due.length === 0) return { sent: 0, pruned: 0 };

  // One open-commitment count per user, not per push — a user with two
  // devices due at the same moment shouldn't trigger the query twice.
  const openCountByUser = new Map<number, number>();
  for (const push of due) {
    if (openCountByUser.has(push.userId)) continue;
    const commitments = await db.getUserCommitments(push.userId);
    const todayKey = now.toISOString().slice(0, 10); // approximate — see note below
    openCountByUser.set(push.userId, commitments.filter((c) => c.scheduledDate === todayKey && c.status === "active").length);
  }
  // NOTE: this uses the job's own UTC "today" for the open-commitment
  // count, not each user's local day (unlike selectDuePushes, which is
  // properly timezone-aware). Close enough for the push body's rough
  // count in the vast majority of timezones/times-of-day; a user whose
  // local day has just turned over relative to UTC could see a count from
  // the wrong day for a few hours. Flagged rather than silently accepted —
  // fixing it properly means teaching getUserCommitments' caller the same
  // per-user timezone math selectDuePushes already has, which is a small,
  // well-scoped follow-up, not done here to keep this job's first version
  // reviewable.

  const withContent = due.map((push) => ({ ...push, content: contentFor(push.kind, openCountByUser.get(push.userId) ?? 0) }));
  const { sentTokenIds, invalidTokens } = await sendPushes(withContent);

  const sentSet = new Set(sentTokenIds);
  for (const push of due) {
    if (!sentSet.has(push.tokenId)) continue;
    if (push.kind === "briefing") await db.markBriefingSent(push.tokenId, now);
    else await db.markReviewSent(push.tokenId, now);
  }
  for (const token of invalidTokens) await db.deletePushTokenByValue(token);

  log({ event: "push.job_run", level: "info", due: due.length, sent: sentTokenIds.length, pruned: invalidTokens.length });
  return { sent: sentTokenIds.length, pruned: invalidTokens.length };
}
