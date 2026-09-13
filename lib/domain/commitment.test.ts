import { describe, expect, it } from "vitest";
import { applyCommitmentPatch, type Commitment } from "./commitment";

const base: Commitment = { clientId: "c", revision: 2, title: "A", category: "Work", scheduledDate: "2026-09-13", timeStart: "09:00", timeEnd: "10:00", priority: "medium", status: "active", riskState: "stable", critical: false, updatedAt: "2026-09-13T00:00:00.000Z" };

describe("commitment domain", () => {
  it("increments revision on a domain change", () => {
    const next = applyCommitmentPatch(base, { status: "completed" }, "2026-09-13T01:00:00.000Z");
    expect(next.status).toBe("completed");
    expect(next.revision).toBe(3);
    expect(next.clientId).toBe("c");
  });
});
