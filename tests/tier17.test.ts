import { describe, expect, it } from "vitest";
import { allowed, shouldGateCore } from "../lib/tier17/ethical-monetization";
import type { Entitlement, Plan } from "../lib/tier17/ethical-monetization";

const ENTITLEMENTS: Entitlement[] = ["core", "advanced_intelligence", "advanced_automation", "extended_history"];
const PLANS: Plan[] = ["free", "plus"];

describe("Tier 17 - ethical monetization", () => {
  it("lets the free plan use core commitment features", () => {
    expect(allowed("free", "core")).toBe(true);
  });

  it("keeps the advanced entitlements off the free plan", () => {
    expect(allowed("free", "advanced_intelligence")).toBe(false);
    expect(allowed("free", "advanced_automation")).toBe(false);
    expect(allowed("free", "extended_history")).toBe(false);
  });

  it("gives the plus plan every entitlement", () => {
    for (const e of ENTITLEMENTS) expect(allowed("plus", e)).toBe(true);
  });

  it("never makes core unavailable on any plan", () => {
    for (const plan of PLANS) expect(allowed(plan, "core")).toBe(true);
  });

  it("never gates core commitment ownership behind payment", () => {
    expect(shouldGateCore()).toBe(false);
    expect(allowed("free", "core")).toBe(!shouldGateCore());
  });

  it("only ever reserves entitlements other than core for paid plans", () => {
    const freeOnly = ENTITLEMENTS.filter((e) => allowed("free", e));
    expect(freeOnly).toEqual(["core"]);
  });
});
