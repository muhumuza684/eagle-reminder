import { describe, expect, it } from "vitest";
import { getHourInTimezone, selectDuePushes, type PushCandidate } from "./pushSchedule";

function candidate(overrides: Partial<PushCandidate> = {}): PushCandidate {
  return {
    tokenId: 1,
    userId: 1,
    token: "ExponentPushToken[xxxx]",
    lastBriefingSentAt: null,
    lastReviewSentAt: null,
    timezone: "UTC",
    briefingHour: 8,
    reviewHour: 22,
    notificationsEnabled: true,
    ...overrides,
  };
}

describe("getHourInTimezone", () => {
  it("reads the hour in a specific IANA zone, not the system/UTC hour", () => {
    // 2026-09-08T23:30:00Z is 07:30 the next local day in Kampala (UTC+3)... let's use a clean case instead:
    const utcNoon = new Date("2026-09-08T12:00:00Z");
    expect(getHourInTimezone(utcNoon, "UTC")).toBe(12);
    expect(getHourInTimezone(utcNoon, "Africa/Kampala")).toBe(15); // UTC+3
    expect(getHourInTimezone(utcNoon, "America/New_York")).toBe(8); // UTC-4 (EDT in September)
  });

  it("falls back to the UTC hour on an invalid timezone string rather than throwing", () => {
    const now = new Date("2026-09-08T12:00:00Z");
    expect(() => getHourInTimezone(now, "Not/AZone")).not.toThrow();
    expect(getHourInTimezone(now, "Not/AZone")).toBe(now.getUTCHours());
  });
});

describe("selectDuePushes", () => {
  it("selects a briefing push when it's currently the user's briefing hour and none was sent today", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: 8 })], now);
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("briefing");
  });

  it("does not select anything outside the configured hours", () => {
    const now = new Date("2026-09-08T14:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: 8, reviewHour: 22 })], now);
    expect(due).toHaveLength(0);
  });

  it("does not re-send a briefing already sent earlier the same local day", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const alreadySent = new Date("2026-09-08T08:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: 8, lastBriefingSentAt: alreadySent })], now);
    expect(due).toHaveLength(0);
  });

  it("does send again if the last briefing was a previous local day, even at the same hour", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const yesterday = new Date("2026-09-07T08:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: 8, lastBriefingSentAt: yesterday })], now);
    expect(due).toHaveLength(1);
  });

  it("computes 'due now' per-user in their own timezone, not the server's", () => {
    // 08:00 in Kampala (UTC+3) is 05:00 UTC.
    const now = new Date("2026-09-08T05:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "Africa/Kampala", briefingHour: 8 })], now);
    expect(due).toHaveLength(1);
  });

  it("respects notificationsEnabled = false even during the user's briefing hour", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: 8, notificationsEnabled: false })], now);
    expect(due).toHaveLength(0);
  });

  it("falls back to the product defaults (8/22) when a candidate has no preferences row yet", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const due = selectDuePushes([candidate({ timezone: "UTC", briefingHour: null, reviewHour: null })], now);
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe("briefing");
  });

  it("can select both a briefing and a review for different candidates in one call", () => {
    const now = new Date("2026-09-08T08:00:00Z");
    const briefingUser = candidate({ tokenId: 1, userId: 1, timezone: "UTC", briefingHour: 8 });
    const reviewUser = candidate({ tokenId: 2, userId: 2, timezone: "UTC", briefingHour: 20, reviewHour: 8 });
    const due = selectDuePushes([briefingUser, reviewUser], now);
    expect(due).toHaveLength(2);
    expect(due.find((d) => d.tokenId === 1)?.kind).toBe("briefing");
    expect(due.find((d) => d.tokenId === 2)?.kind).toBe("review");
  });

  it("returns nothing for an empty candidate list", () => {
    expect(selectDuePushes([], new Date())).toEqual([]);
  });
});
