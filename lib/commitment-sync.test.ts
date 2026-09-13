import { describe, expect, it } from "vitest";
import { cloudRowToCommitment, mergeCommitments, type CloudCommitmentRow, type SyncableCommitment } from "./commitment-sync";

function local(overrides: Partial<SyncableCommitment> = {}): SyncableCommitment {
  return { id: "5", title: "Local title", category: "work", scheduledDate: "2026-09-08", timeStart: "09:00", timeEnd: "09:30", priority: "medium", status: "active", riskState: "stable", critical: false, ...overrides };
}

function cloudRow(overrides: Partial<CloudCommitmentRow> = {}): CloudCommitmentRow {
  return { id: 5, title: "Cloud title", category: "work", scheduledDate: "2026-09-08", timeStart: "09:00", timeEnd: "09:30", priority: "medium", status: "active", riskState: "stable", critical: false, ...overrides };
}

describe("mergeCommitments — conflict resolution between local and cloud state", () => {
  it("keeps an unsynced local commitment (client-timestamp id) even when the cloud fetch doesn't mention it", () => {
    const unsynced = local({ id: "client_test_unsynced_1", title: "Not yet synced" });
    const merged = mergeCommitments([unsynced], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Not yet synced");
  });

  it("prefers the local version when it's marked syncFailed, even though the cloud has a row with the same id", () => {
    const failedEdit = local({ id: "5", title: "My latest edit", syncFailed: true });
    const staleCloud = cloudRow({ id: 5, title: "Stale server version" });
    const merged = mergeCommitments([failedEdit], [staleCloud]);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("My latest edit");
    expect(merged[0].syncFailed).toBe(true);
  });

  it("accepts the cloud version for a normally-synced item, so a change made on another device shows up", () => {
    const staleLocal = local({ id: "5", title: "Old title from this device" });
    const freshCloud = cloudRow({ id: 5, title: "Updated on my other phone" });
    const merged = mergeCommitments([staleLocal], [freshCloud]);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("Updated on my other phone");
  });

  it("adds a cloud-only row (created on another device) that local doesn't have yet", () => {
    const merged = mergeCommitments([], [cloudRow({ id: 9, title: "From my other phone" })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("9");
  });

  it("drops a local commitment with a real server id that's genuinely missing from a full cloud fetch (deleted elsewhere)", () => {
    const staleSynced = local({ id: "5" });
    const merged = mergeCommitments([staleSynced], []);
    expect(merged).toHaveLength(0);
  });

  it("never resurrects a cloud row whose id was deleted locally this session, even if the cloud delete hasn't completed", () => {
    const merged = mergeCommitments([], [cloudRow({ id: 5 })], new Set(["5"]));
    expect(merged).toHaveLength(0);
  });

  it("a suppressed id also isn't re-added from the local side", () => {
    const merged = mergeCommitments([local({ id: "5" })], [], new Set(["5"]));
    expect(merged).toHaveLength(0);
  });

  it("handles a realistic mixed batch: one unsynced capture, one failed edit, one clean sync, one cloud-only, one suppressed delete", () => {
    const unsynced = local({ id: "client_test_unsynced_2", title: "Captured offline" });
    const failedEdit = local({ id: "2", title: "My edit that failed to sync", syncFailed: true });
    const clean = local({ id: "3", title: "old" });
    const local4 = local({ id: "4" }); // will be suppressed (deleted this session)
    const cloud = [
      cloudRow({ id: 2, title: "Stale — should lose to local" }),
      cloudRow({ id: 3, title: "Fresh from server" }),
      cloudRow({ id: 4, title: "Should stay suppressed" }),
      cloudRow({ id: 6, title: "New from another device" }),
    ];
    const merged = mergeCommitments([unsynced, failedEdit, clean, local4], cloud, new Set(["4"]));
    const byId = Object.fromEntries(merged.map((item) => [item.id, item.title]));
    expect(byId["client_test_unsynced_2"]).toBe("Captured offline");
    expect(byId["2"]).toBe("My edit that failed to sync");
    expect(byId["3"]).toBe("Fresh from server");
    expect(byId["4"]).toBeUndefined();
    expect(byId["6"]).toBe("New from another device");
    expect(merged).toHaveLength(4);
  });
});

describe("cloudRowToCommitment", () => {
  it("normalizes a null criticalDeadline/meetingProvider/meetingUrl/warningMuted to undefined", () => {
    const row = cloudRow({ criticalDeadline: null, meetingProvider: null, meetingUrl: null, warningMuted: null });
    const result = cloudRowToCommitment(row);
    expect(result.criticalDeadline).toBeUndefined();
    expect(result.meetingProvider).toBeUndefined();
    expect(result.meetingUrl).toBeUndefined();
    expect(result.warningMuted).toBeUndefined();
  });

  it("converts a criticalDeadline Date/string to an ISO string", () => {
    const row = cloudRow({ criticalDeadline: "2026-09-20T18:30:00.000Z" });
    expect(cloudRowToCommitment(row).criticalDeadline).toBe("2026-09-20T18:30:00.000Z");
  });
});
