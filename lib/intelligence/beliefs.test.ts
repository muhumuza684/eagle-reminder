import { describe, it, expect } from "vitest";
import { shrunkMissRate } from "./shrinkage";
import { circularTimeStats, formatMinutesAsClock } from "./circular";
import { getCommitmentBeliefs, correctBelief } from "./beliefs";

describe("shrunkMissRate", () => {
  it("does not report 100% on a single miss", () => {
    expect(shrunkMissRate(1, 1)).toBeLessThan(0.7);
  });
  it("converges toward the raw rate with more evidence", () => {
    expect(shrunkMissRate(8, 10)).toBeGreaterThan(0.7);
  });
});

describe("circularTimeStats", () => {
  it("averages 23:00 and 01:00 to midnight, not noon", () => {
    const result = circularTimeStats([23 * 60, 1 * 60]);
    expect(result?.meanMinutes).toBeLessThanOrEqual(5);
  });
  it("formats minutes as a clock string", () => {
    expect(formatMinutesAsClock(0)).toBe("12:00 AM");
    expect(formatMinutesAsClock(18 * 60 + 30)).toBe("6:30 PM");
  });
});

describe("getCommitmentBeliefs", () => {
  it("ignores categories with too little evidence", () => {
    expect(getCommitmentBeliefs([{ category: "People", timeStartMinutes: 1080, missed: true }])).toHaveLength(0);
  });
  it("surfaces a belief once there is enough evidence", () => {
    const history = Array.from({ length: 5 }, () => ({ category: "People", timeStartMinutes: 1080, missed: true }));
    const beliefs = getCommitmentBeliefs(history);
    expect(beliefs.length).toBeGreaterThan(0);
    expect(beliefs[0].category).toBe("People");
  });
});

describe("correctBelief", () => {
  it("a Not really correction pulls the miss rate down", () => {
    const base = Array.from({ length: 5 }, () => ({ category: "People", timeStartMinutes: 1080, missed: true }));
    const before = getCommitmentBeliefs(base)[0].missRate;
    const after = getCommitmentBeliefs(correctBelief(base, "People", true))[0].missRate;
    expect(after).toBeLessThan(before);
  });
});
