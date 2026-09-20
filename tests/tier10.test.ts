import { describe, expect, it } from "vitest";
import { applyRecovery, recoveryPrompt } from "../lib/tier10/review-&-recovery";
import type { RecoveryChoice } from "../lib/tier10/review-&-recovery";

describe("Tier 10 - review and recovery", () => {
  describe("recoveryPrompt", () => {
    it("asks what is blocking the commitment when it is blocked", () => {
      expect(recoveryPrompt("blocked")).toBe("What is blocking this?");
    });

    it("asks a neutral 'what next' question for missed and overdue commitments", () => {
      expect(recoveryPrompt("missed")).toBe("What should happen next?");
      expect(recoveryPrompt("overdue")).toBe("What should happen next?");
    });

    it("never uses punitive wording", () => {
      for (const state of ["missed", "blocked", "overdue"] as const) {
        expect(recoveryPrompt(state)).not.toMatch(/fail|late|shame|behind|should have/i);
      }
    });
  });

  describe("applyRecovery", () => {
    const expected: Record<RecoveryChoice, "active" | "postponed" | "cancelled" | "blocked"> = {
      resume: "active",
      split: "active",
      reschedule: "postponed",
      cancel: "cancelled",
      blocked: "blocked",
    };

    for (const choice of Object.keys(expected) as RecoveryChoice[]) {
      it(`${choice} -> ${expected[choice]}`, () => {
        expect(applyRecovery(choice)).toBe(expected[choice]);
      });
    }

    it("offers a non-destructive path for every choice except an explicit cancel", () => {
      const choices = Object.keys(expected) as RecoveryChoice[];
      const cancelling = choices.filter((c) => applyRecovery(c) === "cancelled");
      expect(cancelling).toEqual(["cancel"]);
    });
  });
});
