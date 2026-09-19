import { describe, it, expect } from "vitest";
import { nextScheduledDate, needsRegeneration } from "./recurrence";

describe("nextScheduledDate", () => {
  it("adds one day for daily", () => {
    expect(nextScheduledDate("2026-09-15", "daily")).toBe("2026-09-16");
  });
  it("adds seven days for weekly", () => {
    expect(nextScheduledDate("2026-09-15", "weekly")).toBe("2026-09-22");
  });
});

describe("needsRegeneration", () => {
  it("is false for non-recurring commitments", () => {
    expect(needsRegeneration({ scheduledDate: "2026-09-14", status: "completed" }, "2026-09-15")).toBe(false);
  });
  it("is true for a closed-out daily commitment from a past date", () => {
    expect(needsRegeneration({ recurrence: "daily", scheduledDate: "2026-09-14", status: "completed" }, "2026-09-15")).toBe(true);
  });
  it("is false while the commitment is still active", () => {
    expect(needsRegeneration({ recurrence: "daily", scheduledDate: "2026-09-14", status: "active" }, "2026-09-15")).toBe(false);
  });
  it("is false once deleted", () => {
    expect(needsRegeneration({ recurrence: "daily", scheduledDate: "2026-09-14", status: "completed", deletedAt: "2026-09-14T10:00:00Z" }, "2026-09-15")).toBe(false);
  });
});
