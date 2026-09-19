// Tier 3 #12 — "who is due for a push right now," kept pure and
// framework-free (no DB, no Expo SDK) so it's directly unit-testable, same
// pattern as lib/critical-cascade.ts and lib/commitment-sync.ts. The actual
// sending lives in pushDelivery.ts; this file only decides.
//
// This is what Tier 2 #5 (timezone on users) was for: "8am local" can now
// actually mean the user's local 8am, computed server-side, instead of
// relying on the device's own clock (which is all local notifications can
// ever do).

export type PushCandidate = {
  tokenId: number;
  userId: number;
  token: string;
  lastBriefingSentAt: Date | null;
  lastReviewSentAt: Date | null;
  timezone: string;
  briefingHour: number | null; // null when the user has no preferences row yet — falls back to the product default (8)
  reviewHour: number | null; // falls back to 22
  notificationsEnabled: boolean | null; // falls back to true (opt-out, not opt-in, matching the client-side default)
};

export type DuePush = {
  tokenId: number;
  userId: number;
  token: string;
  timezone: string;
  kind: "briefing" | "review";
};

/**
 * The hour (0-23) it currently is in `timezone`. Falls back to UTC hour on
 * an invalid/unrecognized IANA zone name rather than throwing — a bad
 * timezone string stored for one user should degrade that user's push
 * timing, not crash the whole scheduled job for everyone.
 */
export function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(date);
    const hour = Number(formatted);
    return Number.isFinite(hour) ? hour : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

function localDateKey(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Decides which (tokenId, kind) pairs are due right now. Intended to be
 * called by a job running roughly hourly (or more often — every run just
 * re-checks "is it this candidate's hour, and have we already sent today")
 * — running it more frequently than hourly is safe and just means less
 * worst-case delay; running it less than hourly risks missing a candidate's
 * exact hour entirely, so the job's own schedule should be at least hourly.
 */
export function selectDuePushes(candidates: PushCandidate[], now: Date = new Date()): DuePush[] {
  const due: DuePush[] = [];
  for (const candidate of candidates) {
    if (candidate.notificationsEnabled === false) continue;
    const hour = getHourInTimezone(now, candidate.timezone);
    const today = localDateKey(now, candidate.timezone);
    const briefingHour = candidate.briefingHour ?? 8;
    const reviewHour = candidate.reviewHour ?? 22;
    if (hour === briefingHour && (!candidate.lastBriefingSentAt || localDateKey(candidate.lastBriefingSentAt, candidate.timezone) !== today)) {
      due.push({
        tokenId: candidate.tokenId,
        userId: candidate.userId,
        token: candidate.token,
        timezone: candidate.timezone,
        kind: "briefing",
      });
    }
    if (hour === reviewHour && (!candidate.lastReviewSentAt || localDateKey(candidate.lastReviewSentAt, candidate.timezone) !== today)) {
      due.push({
        tokenId: candidate.tokenId,
        userId: candidate.userId,
        token: candidate.token,
        timezone: candidate.timezone,
        kind: "review",
      });
    }
  }
  return due;
}
