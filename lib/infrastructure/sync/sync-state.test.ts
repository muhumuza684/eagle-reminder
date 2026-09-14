import { describe, expect, it } from "vitest";
import { transitionSync, type SyncRecord } from "./sync-state";

describe("sync state", () => {
  it("supports retry after failure", () => {
    const r: SyncRecord = { clientId: "c", revision: 1, state: "failed", updatedAt: "", deletedAt: null };
    expect(transitionSync(r, "pending").state).toBe("pending");
  });
  it("rejects impossible transitions", () => {
    const r: SyncRecord = { clientId: "c", revision: 1, state: "local", updatedAt: "", deletedAt: null };
    expect(() => transitionSync(r, "synced")).toThrow();
  });
});
