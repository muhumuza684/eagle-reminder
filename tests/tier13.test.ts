import { describe, expect, it } from "vitest";
import { bestWindow } from "../lib/tier13/personal-rhythm";

describe("Tier 13 - personal rhythm", () => {
  it("returns undefined when there are no completion hours", () => {
    expect(bestWindow([])).toBeUndefined();
  });

  it("describes a morning rhythm around the mean hour", () => {
    // mean 9 -> window 8..10
    expect(bestWindow([8, 9, 10])).toEqual({ label: "morning", startHour: 8, endHour: 10, strength: 3 / 14 });
  });

  it("describes an afternoon rhythm", () => {
    // mean 14 -> window 13..15
    expect(bestWindow([14])).toEqual({ label: "afternoon", startHour: 13, endHour: 15, strength: 1 / 14 });
  });

  it("describes an evening rhythm", () => {
    // mean 21 -> window 20..22
    expect(bestWindow([20, 21, 22])).toEqual({ label: "evening", startHour: 20, endHour: 22, strength: 3 / 14 });
  });

  it("widens a fractional mean to whole hours on both sides", () => {
    // mean 11.5 -> floor 11 - 1 = 10, ceil 12 + 1 = 13, still morning (< 12)
    expect(bestWindow([11, 12])).toEqual({ label: "morning", startHour: 10, endHour: 13, strength: 2 / 14 });
  });

  it("uses 12 as the start of the afternoon and 18 as the start of the evening", () => {
    expect(bestWindow([11])!.label).toBe("morning");
    expect(bestWindow([12])!.label).toBe("afternoon");
    expect(bestWindow([17])!.label).toBe("afternoon");
    expect(bestWindow([18])!.label).toBe("evening");
  });

  it("clamps the window to the 0-23 day", () => {
    expect(bestWindow([0, 0])).toEqual({ label: "morning", startHour: 0, endHour: 1, strength: 2 / 14 });
    expect(bestWindow([23])).toEqual({ label: "evening", startHour: 22, endHour: 23, strength: 1 / 14 });
  });

  it("grows in strength with more data and caps at 1 from 14 samples", () => {
    const hours = (n: number) => Array<number>(n).fill(9);
    expect(bestWindow(hours(7))!.strength).toBe(0.5);
    expect(bestWindow(hours(14))!.strength).toBe(1);
    expect(bestWindow(hours(50))!.strength).toBe(1);
  });

  it("always returns a well-formed window", () => {
    const w = bestWindow([7, 9, 13, 16, 19])!;
    expect(w.startHour).toBeGreaterThanOrEqual(0);
    expect(w.endHour).toBeLessThanOrEqual(23);
    expect(w.startHour).toBeLessThanOrEqual(w.endHour);
    expect(w.strength).toBeGreaterThan(0);
    expect(w.strength).toBeLessThanOrEqual(1);
  });
});
