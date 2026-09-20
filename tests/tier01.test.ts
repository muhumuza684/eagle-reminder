import { describe, expect, it } from "vitest";
import * as mod from "../lib/tier01/foundation";

describe("Tier 01 — Foundation", () => {
  it("exports eagleId", () => {
    expect(typeof mod.eagleId).toBe("function");
  });

  it("exports validateCommitment", () => {
    expect(typeof mod.validateCommitment).toBe("function");
  });
});
