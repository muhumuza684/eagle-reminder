import { describe, expect, it } from "vitest";
import { allowInterruption } from "../lib/tier14/attention-protection";
import type { AttentionPolicy, Interruption } from "../lib/tier14/attention-protection";

function policy(over: Partial<AttentionPolicy> = {}): AttentionPolicy {
  return { quiet: false, maxInterruptionsPerHour: 3, urgentBypass: true, ...over };
}
function interruption(over: Partial<Interruption> = {}): Interruption {
  return { urgent: false, minutesSinceLast: 30, ...over };
}

describe("Tier 14 - attention protection", () => {
  describe("outside quiet time", () => {
    it("allows a normal interruption under the hourly cap after enough time", () => {
      expect(allowInterruption(policy(), interruption(), 0)).toBe(true);
      expect(allowInterruption(policy(), interruption(), 2)).toBe(true);
    });

    it("blocks a normal interruption once the hourly cap is reached", () => {
      expect(allowInterruption(policy(), interruption(), 3)).toBe(false);
      expect(allowInterruption(policy(), interruption(), 10)).toBe(false);
    });

    it("blocks a normal interruption arriving less than 10 minutes after the last", () => {
      expect(allowInterruption(policy(), interruption({ minutesSinceLast: 9 }), 0)).toBe(false);
      expect(allowInterruption(policy(), interruption({ minutesSinceLast: 10 }), 0)).toBe(true);
    });

    it("blocks everything when the cap is zero", () => {
      expect(allowInterruption(policy({ maxInterruptionsPerHour: 0 }), interruption(), 0)).toBe(false);
    });

    it("lets an urgent interruption through the cap and the spacing rule when urgent bypass is on", () => {
      expect(allowInterruption(policy(), interruption({ urgent: true, minutesSinceLast: 0 }), 99)).toBe(true);
    });

    it("treats an urgent interruption as normal when urgent bypass is off", () => {
      const p = policy({ urgentBypass: false });
      expect(allowInterruption(p, interruption({ urgent: true }), 0)).toBe(true);
      expect(allowInterruption(p, interruption({ urgent: true }), 3)).toBe(false);
      expect(allowInterruption(p, interruption({ urgent: true, minutesSinceLast: 2 }), 0)).toBe(false);
    });
  });

  describe("during quiet time", () => {
    it("blocks normal interruptions even when well under the cap", () => {
      expect(allowInterruption(policy({ quiet: true }), interruption(), 0)).toBe(false);
    });

    it("lets an urgent interruption through only when urgent bypass is on", () => {
      const urgent = interruption({ urgent: true, minutesSinceLast: 0 });
      expect(allowInterruption(policy({ quiet: true, urgentBypass: true }), urgent, 99)).toBe(true);
      expect(allowInterruption(policy({ quiet: true, urgentBypass: false }), urgent, 0)).toBe(false);
    });

    it("blocks a non-urgent interruption even with bypass on", () => {
      expect(allowInterruption(policy({ quiet: true, urgentBypass: true }), interruption({ urgent: false }), 0)).toBe(false);
    });
  });
});
