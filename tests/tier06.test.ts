import { describe, expect, it } from "vitest";
import { canTransition, transition } from "../lib/tier06/commitment-engine";
import { eagleId } from "../lib/tier01/foundation";
import type { Commitment, CommitmentState } from "../lib/tier01/foundation";

const STATES: CommitmentState[] = ["planned", "active", "blocked", "completed", "postponed", "cancelled"];

const ALLOWED: Record<CommitmentState, CommitmentState[]> = {
  planned: ["active", "cancelled"],
  active: ["blocked", "completed", "postponed", "cancelled"],
  blocked: ["active", "cancelled"],
  completed: [],
  postponed: ["active", "cancelled"],
  cancelled: [],
};

function commitment(state: CommitmentState): Commitment {
  return {
    id: eagleId("c-1"),
    title: "Write the report",
    kind: "action",
    state,
    createdAt: "2026-01-01T00:00:00.000Z",
    dueAt: "2026-01-05",
    nextAction: "Outline the sections",
  };
}

describe("Tier 06 - commitment engine", () => {
  describe("canTransition", () => {
    for (const from of STATES) {
      for (const to of STATES) {
        const expected = ALLOWED[from].includes(to);
        it(`${from} -> ${to} is ${expected ? "allowed" : "rejected"}`, () => {
          expect(canTransition(from, to)).toBe(expected);
        });
      }
    }

    it("treats completed and cancelled as terminal states", () => {
      for (const to of STATES) {
        expect(canTransition("completed", to)).toBe(false);
        expect(canTransition("cancelled", to)).toBe(false);
      }
    });

    it("never allows a commitment to skip straight from planned to completed", () => {
      expect(canTransition("planned", "completed")).toBe(false);
    });
  });

  describe("transition", () => {
    it("returns a copy in the new state and preserves every other field", () => {
      const before = commitment("planned");
      const after = transition(before, "active");
      expect(after.state).toBe("active");
      expect(after).toEqual({ ...before, state: "active" });
    });

    it("does not mutate the commitment it was given", () => {
      const before = commitment("active");
      const snapshot = { ...before };
      const after = transition(before, "completed");
      expect(before).toEqual(snapshot);
      expect(before.state).toBe("active");
      expect(after).not.toBe(before);
    });

    it("throws a descriptive error for an invalid transition", () => {
      expect(() => transition(commitment("completed"), "active")).toThrow("Invalid transition completed -> active");
      expect(() => transition(commitment("planned"), "completed")).toThrow("Invalid transition planned -> completed");
    });

    it("supports the recovery loop planned -> active -> blocked -> active -> completed", () => {
      let c = commitment("planned");
      for (const next of ["active", "blocked", "active", "completed"] as const) {
        c = transition(c, next);
        expect(c.state).toBe(next);
      }
    });

    it("refuses to reopen a cancelled commitment", () => {
      expect(() => transition(commitment("cancelled"), "active")).toThrow("Invalid transition cancelled -> active");
    });
  });
});
