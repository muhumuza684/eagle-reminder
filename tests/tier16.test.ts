import { describe, expect, it } from "vitest";
import { nextAttempt } from "../lib/tier16/notification-&-sync-contract";
import type { DeliveryResult } from "../lib/tier16/notification-&-sync-contract";

function result(status: DeliveryResult["status"], attempt: number): DeliveryResult {
  return { tokenId: "token-1", status, attempt };
}

describe("Tier 16 - notification and sync contract", () => {
  describe("nextAttempt", () => {
    it("schedules the next attempt number for a retry below the limit", () => {
      expect(nextAttempt(result("retry", 0))).toBe(1);
      expect(nextAttempt(result("retry", 1))).toBe(2);
      expect(nextAttempt(result("retry", 3))).toBe(4);
    });

    it("gives up after the fourth attempt", () => {
      expect(nextAttempt(result("retry", 4))).toBeUndefined();
      expect(nextAttempt(result("retry", 9))).toBeUndefined();
    });

    it("never retries a delivery that was sent, invalid or skipped", () => {
      for (const status of ["sent", "invalid", "skipped"] as const) {
        expect(nextAttempt(result(status, 1))).toBeUndefined();
      }
    });

    it("walks attempts 1 -> 2 -> 3 -> 4 and then stops", () => {
      const seen: number[] = [];
      let attempt = 1;
      let next = nextAttempt(result("retry", attempt));
      while (next !== undefined) {
        seen.push(next);
        attempt = next;
        next = nextAttempt(result("retry", attempt));
      }
      expect(seen).toEqual([2, 3, 4]);
    });
  });
});
