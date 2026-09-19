// Tier 3 #12 — scheduled server push entry point.
// This is invoked by the repository's hourly GitHub Actions workflow
// (.github/workflows/push-job.yml), and can also be invoked manually via
// `npm run push:job`. The scheduler should run at least hourly because
// pushSchedule.ts selects candidates whose configured local hour matches
// the current time.

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

    // Use the same local-day interpretation as pushSchedule.ts so the
    // briefing/review body counts commitments for the user's actual day,
    // not the GitHub job's UTC day.
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: push.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    openCountByUser.set(
      push.userId,
      commitments.filter(
        (c) => c.scheduledDate === todayKey && c.status === "active",
      ).length,
    );
  }

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
