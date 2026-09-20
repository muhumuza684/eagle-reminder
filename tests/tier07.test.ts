import { describe, expect, it } from "vitest";
import { explain, observation } from "../lib/tier07/explainable-intelligence";

describe("Tier 07 - explainable intelligence", () => {
  describe("observation", () => {
    it("keeps the supplied fields and an in-range confidence unchanged", () => {
      const o = observation("o-1", "You finish more in the morning", ["8 of 10 morning tasks done"], 0.42, "2026-01-01T00:00:00.000Z");
      expect(o).toEqual({
        id: "o-1",
        text: "You finish more in the morning",
        evidence: ["8 of 10 morning tasks done"],
        confidence: 0.42,
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });

    it("clamps confidence above 1 down to 1", () => {
      expect(observation("o", "t", ["e"], 1.5).confidence).toBe(1);
    });

    it("clamps negative confidence up to 0", () => {
      expect(observation("o", "t", ["e"], -0.2).confidence).toBe(0);
    });

    it("keeps the boundary values 0 and 1", () => {
      expect(observation("o", "t", ["e"], 0).confidence).toBe(0);
      expect(observation("o", "t", ["e"], 1).confidence).toBe(1);
    });

    it("defaults createdAt to the current time as an ISO-8601 string", () => {
      const before = Date.now();
      const o = observation("o", "t", ["e"], 0.5);
      const after = Date.now();
      expect(new Date(o.createdAt).toISOString()).toBe(o.createdAt);
      expect(Date.parse(o.createdAt)).toBeGreaterThanOrEqual(before);
      expect(Date.parse(o.createdAt)).toBeLessThanOrEqual(after);
    });
  });

  describe("explain", () => {
    it("states the text, the rounded confidence percentage and all evidence", () => {
      const o = observation(
        "o-1",
        "You complete more tasks in the morning",
        ["8 of 10 morning tasks completed", "3 of 10 evening tasks completed"],
        0.8,
        "2026-01-01T00:00:00.000Z",
      );
      expect(explain(o)).toBe(
        "You complete more tasks in the morning (80% confidence). Evidence: 8 of 10 morning tasks completed; 3 of 10 evening tasks completed.",
      );
    });

    it("rounds the confidence percentage to the nearest whole number", () => {
      expect(explain(observation("o", "Pattern", ["a"], 0.756))).toContain("(76% confidence)");
      expect(explain(observation("o", "Pattern", ["a"], 0.004))).toContain("(0% confidence)");
    });

    it("reports clamped confidence, never more than 100%", () => {
      expect(explain(observation("o", "Pattern", ["a"], 7))).toContain("(100% confidence)");
    });

    it("includes every evidence item so the claim can be checked", () => {
      const evidence = ["first", "second", "third"];
      const text = explain(observation("o", "Pattern", evidence, 0.5));
      for (const item of evidence) expect(text).toContain(item);
    });
  });
});
