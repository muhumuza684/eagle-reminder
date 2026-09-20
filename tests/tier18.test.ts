import { describe, expect, it } from "vitest";
import { D_EAGLE_PRINCIPLES, assessRelease } from "../lib/tier18/final-product-constitution";
import type { PrincipleCheck } from "../lib/tier18/final-product-constitution";

function check(id: string, pass: boolean): PrincipleCheck {
  return { id, name: id.replace(/-/g, " "), pass, detail: pass ? "verified" : "not satisfied" };
}

describe("Tier 18 - final product constitution", () => {
  describe("D_EAGLE_PRINCIPLES", () => {
    it("lists the ten product principles in order", () => {
      expect([...D_EAGLE_PRINCIPLES]).toEqual([
        "user-sovereignty",
        "local-first",
        "privacy-by-default",
        "explainable-intelligence",
        "context-over-spam",
        "recovery-over-punishment",
        "attention-protection",
        "accessible-by-default",
        "reversible-automation",
        "no-dark-patterns",
      ]);
    });

    it("has no duplicates", () => {
      expect(new Set(D_EAGLE_PRINCIPLES).size).toBe(D_EAGLE_PRINCIPLES.length);
    });
  });

  describe("assessRelease", () => {
    it("is not ready when there are no checks at all", () => {
      expect(assessRelease([])).toEqual({ ready: false, checks: [] });
    });

    it("is ready when every check passes and returns the checks it was given", () => {
      const checks = [check("a", true), check("b", true)];
      const result = assessRelease(checks);
      expect(result.ready).toBe(true);
      expect(result.checks).toEqual(checks);
    });

    it("is not ready when any single check fails", () => {
      const checks = [check("a", true), check("b", false), check("c", true)];
      const result = assessRelease(checks);
      expect(result.ready).toBe(false);
      expect(result.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual(["b"]);
    });

    it("is not ready when every check fails", () => {
      expect(assessRelease([check("a", false), check("b", false)]).ready).toBe(false);
    });

    it("is ready only when every constitutional principle passes", () => {
      const all = D_EAGLE_PRINCIPLES.map((id) => check(id, true));
      expect(assessRelease(all).ready).toBe(true);
    });

    it("blocks the release when any one constitutional principle fails", () => {
      for (const failing of D_EAGLE_PRINCIPLES) {
        const checks = D_EAGLE_PRINCIPLES.map((id) => check(id, id !== failing));
        const result = assessRelease(checks);
        expect(result.ready).toBe(false);
        expect(result.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual([failing]);
      }
    });
  });
});
