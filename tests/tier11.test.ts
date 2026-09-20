import { describe, expect, it } from "vitest";
import { completionRate, detectPatterns } from "../lib/tier11/pattern-intelligence";
import type { HistoryPoint } from "../lib/tier11/pattern-intelligence";

function pts(hours: number[], completed: boolean[]): HistoryPoint[] {
  return hours.map((hour, i) => ({ completed: completed[i % completed.length]!, hour, size: "small" as const }));
}

describe("Tier 11 - pattern intelligence", () => {
  describe("completionRate", () => {
    it("is 0 for an empty history", () => {
      expect(completionRate([])).toBe(0);
    });

    it("is the fraction of completed points", () => {
      expect(completionRate(pts([8, 9, 10, 11], [true, true, true, false]))).toBe(0.75);
      expect(completionRate(pts([8, 9], [true, true]))).toBe(1);
      expect(completionRate(pts([8, 9], [false, false]))).toBe(0);
    });
  });

  describe("detectPatterns", () => {
    it("returns nothing when there are fewer than five data points", () => {
      const four = pts([8, 9, 18, 19], [true, true, false, false]);
      expect(detectPatterns(four)).toEqual([]);
    });

    it("finds no time pattern when morning and evening completion are equal", () => {
      const equal: HistoryPoint[] = [
        { completed: true, hour: 8, size: "small" },
        { completed: true, hour: 9, size: "small" },
        { completed: false, hour: 10, size: "small" },
        { completed: true, hour: 18, size: "medium" },
        { completed: false, hour: 19, size: "medium" },
        { completed: true, hour: 20, size: "large" },
      ];
      expect(completionRate(equal.filter((p) => p.hour < 12))).toBeCloseTo(2 / 3, 10);
      expect(completionRate(equal.filter((p) => p.hour >= 18))).toBeCloseTo(2 / 3, 10);
      expect(detectPatterns(equal)).toEqual([]);
    });

    it("reports a time pattern when morning is completed and evening is not", () => {
      const history = pts([8, 9, 10, 18, 19, 20], [true, true, true, false, false, false]);
      const patterns = detectPatterns(history);
      expect(patterns).toHaveLength(1);
      const p = patterns[0]!;
      expect(p.kind).toBe("time");
      expect(p.statement).toBe("Morning completion differs from evening by 100 percentage points.");
      expect(p.sampleSize).toBe(6);
      expect(p.confidence).toBeCloseTo(0.3, 10);
    });

    it("reports the size of a partial difference in percentage points", () => {
      // morning 4/4 = 100%, evening 2/4 = 50%
      const history = pts([6, 7, 8, 9, 18, 19, 20, 21], [true, true, true, true, true, false, true, false]);
      const [p] = detectPatterns(history);
      expect(p!.statement).toBe("Morning completion differs from evening by 50 percentage points.");
      expect(p!.sampleSize).toBe(8);
      expect(p!.confidence).toBeCloseTo(0.4, 10);
    });

    it("is direction-agnostic: evening being stronger is reported the same way", () => {
      const history = pts([8, 9, 10, 18, 19, 20], [false, false, false, true, true, true]);
      const [p] = detectPatterns(history);
      expect(p!.kind).toBe("time");
      expect(p!.statement).toBe("Morning completion differs from evening by 100 percentage points.");
    });

    it("ignores a difference smaller than 20 percentage points", () => {
      // morning 17/20 = 85%, evening 14/20 = 70%: a 15 point gap over 40 samples
      const morning = pts(Array<number>(20).fill(8), [...Array<boolean>(17).fill(true), ...Array<boolean>(3).fill(false)]);
      const evening = pts(Array<number>(20).fill(19), [...Array<boolean>(14).fill(true), ...Array<boolean>(6).fill(false)]);
      expect(detectPatterns([...morning, ...evening])).toEqual([]);
    });

    it("needs at least three morning and three evening points", () => {
      // 5 points, but only two in the morning
      const fewMorning = pts([8, 9, 18, 19, 20], [true, true, false, false, false]);
      expect(detectPatterns(fewMorning)).toEqual([]);
      // 5 points, but only two in the evening
      const fewEvening = pts([8, 9, 10, 18, 19], [true, true, true, false, false]);
      expect(detectPatterns(fewEvening)).toEqual([]);
    });

    it("does not count afternoon hours as morning or evening", () => {
      // 12..17 are neither morning (<12) nor evening (>=18)
      const afternoon = pts([12, 13, 14, 15, 16, 17], [true, true, true, false, false, false]);
      expect(detectPatterns(afternoon)).toEqual([]);
    });

    it("treats hour 11 as morning and hour 18 as evening", () => {
      const history = pts([9, 10, 11, 18, 19, 20], [true, true, true, false, false, false]);
      expect(detectPatterns(history)).toHaveLength(1);
    });

    it("does not treat hour 12 as morning", () => {
      // only 9 and 10 are morning, so there are too few morning points
      expect(detectPatterns(pts([9, 10, 12, 18, 19, 20], [true, true, true, false, false, false]))).toEqual([]);
    });

    it("does not treat hour 17 as evening", () => {
      // only 19 and 20 are evening, so there are too few evening points
      expect(detectPatterns(pts([8, 9, 10, 17, 19, 20], [true, true, true, false, false, false]))).toEqual([]);
    });

    it("reports a 25-point gap (above the 20-point threshold)", () => {
      // morning 4/4 = 100%, evening 3/4 = 75%
      const history = pts([6, 7, 8, 9, 18, 19, 20, 21], [true, true, true, true, true, true, true, false]);
      const [p] = detectPatterns(history);
      expect(p!.statement).toBe("Morning completion differs from evening by 25 percentage points.");
    });

    it("caps confidence at 0.9 for large samples", () => {
      const hours = [...Array(20).fill(8), ...Array(20).fill(19)] as number[];
      const completed = [...Array(20).fill(true), ...Array(20).fill(false)] as boolean[];
      const [p] = detectPatterns(pts(hours, completed));
      expect(p!.sampleSize).toBe(40);
      expect(p!.confidence).toBe(0.9);
    });

    it("attaches a human-readable statement, a sample size and a confidence to every pattern", () => {
      const history = pts([8, 9, 10, 18, 19, 20], [true, true, true, false, false, false]);
      for (const p of detectPatterns(history)) {
        expect(p.statement.length).toBeGreaterThan(0);
        expect(p.sampleSize).toBeGreaterThan(0);
        expect(p.confidence).toBeGreaterThan(0);
        expect(p.confidence).toBeLessThanOrEqual(0.9);
      }
    });
  });
});
