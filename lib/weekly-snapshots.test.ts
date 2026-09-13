import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../lib/weekly-snapshots";

describe("weekly completion snapshots", () => {
  it("calculates the completion rate from closed commitments", () => {
    expect(buildSnapshot("2026-08-30", ["completed", "completed", "missed", "active"])).toMatchObject({ completed: 2, closed: 3, rate: 67 });
  });
  it("does not report a rate when nothing is closed", () => {
    expect(buildSnapshot("2026-08-30", ["active", "rescheduled"])).toMatchObject({ completed: 0, closed: 0, rate: 0 });
  });
});
