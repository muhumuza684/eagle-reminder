import { describe, expect, it } from "vitest";
import { shouldFire } from "../lib/tier08/contextual-cues";
import type { Cue } from "../lib/tier08/contextual-cues";

function cue(over: Partial<Cue> = {}): Cue {
  return { id: "cue-1", event: "before_due", enabled: true, ...over };
}

describe("Tier 08 - contextual cues", () => {
  it("fires when enabled and the event matches", () => {
    expect(shouldFire(cue(), "before_due")).toBe(true);
  });

  it("never fires while disabled, even on a matching event", () => {
    expect(shouldFire(cue({ enabled: false }), "before_due")).toBe(false);
  });

  it("does not fire for a different event", () => {
    expect(shouldFire(cue({ event: "morning_review" }), "app_open")).toBe(false);
    expect(shouldFire(cue({ event: "app_open" }), "before_due")).toBe(false);
  });

  it("fires only for a matching event out of every event kind", () => {
    const events: Cue["event"][] = ["app_open", "morning_review", "before_due", "after_completion", "custom"];
    for (const event of events) {
      for (const other of events) {
        expect(shouldFire(cue({ event }), other)).toBe(event === other);
      }
    }
  });

  describe("cues scoped to a commitment", () => {
    it("fires for the same commitment", () => {
      expect(shouldFire(cue({ commitmentId: "c-1" }), "before_due", "c-1")).toBe(true);
    });

    it("does not fire for a different commitment", () => {
      expect(shouldFire(cue({ commitmentId: "c-1" }), "before_due", "c-2")).toBe(false);
    });

    it("does not fire when no commitment is supplied", () => {
      expect(shouldFire(cue({ commitmentId: "c-1" }), "before_due")).toBe(false);
    });

    it("stays silent when disabled even for the right commitment", () => {
      expect(shouldFire(cue({ commitmentId: "c-1", enabled: false }), "before_due", "c-1")).toBe(false);
    });
  });

  describe("global cues (no commitment)", () => {
    it("fires for any commitment", () => {
      expect(shouldFire(cue(), "before_due", "c-1")).toBe(true);
      expect(shouldFire(cue(), "before_due", "c-99")).toBe(true);
    });

    it("fires when no commitment is supplied", () => {
      expect(shouldFire(cue(), "before_due")).toBe(true);
    });
  });
});
