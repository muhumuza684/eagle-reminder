import { describe, expect, it } from "vitest";
import { inferCategory, parseCommitment } from "../lib/commitment-parser";

describe("D-EAGLE commitment capture", () => {
  it("infers categories without requiring a manual field", () => {
    expect(inferCategory("Pick up my prescription tomorrow")).toBe("Health");
    expect(inferCategory("Call Dad at 7 pm")).toBe("People");
    expect(inferCategory("Pay the bank invoice")).toBe("Finance");
  });

  it("parses time and assigns evening risk", () => {
    const commitment = parseCommitment("Call Dad tomorrow at 7 pm");
    expect(commitment.timeStart).toBe("19:00");
    expect(commitment.timeEnd).toBe("20:00");
    expect(commitment.category).toBe("People");
    expect(commitment.riskState).toBe("at_risk");
  });

  it("uses a calm default when no time is provided", () => {
    const commitment = parseCommitment("Prepare the Q4 presentation tomorrow");
    expect(commitment.timeStart).toBe("09:00");
    expect(commitment.riskState).toBe("stable");
    expect(commitment.status).toBe("active");
  });
});
