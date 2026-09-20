import { describe, expect, it } from "vitest";
import { chooseReminder } from "../lib/tier09/adaptive-reminders";
import type { ReminderContext, ReminderPolicy } from "../lib/tier09/adaptive-reminders";

const POLICIES: ReminderPolicy[] = ["none", "single", "advance", "at_time", "recovery", "adaptive"];

function ctx(over: Partial<ReminderContext> = {}): ReminderContext {
  return { policy: "adaptive", minutesUntilDue: 30, missedRecently: 0, quiet: false, userEnabled: true, ...over };
}

describe("Tier 09 - adaptive reminders", () => {
  describe("user control and quiet time", () => {
    for (const policy of POLICIES) {
      it(`${policy}: never reminds when the user has disabled reminders`, () => {
        expect(chooseReminder(ctx({ policy, userEnabled: false, minutesUntilDue: 0, missedRecently: 5 }))).toBe(false);
      });

      it(`${policy}: never reminds during quiet time`, () => {
        expect(chooseReminder(ctx({ policy, quiet: true, minutesUntilDue: 0, missedRecently: 5 }))).toBe(false);
      });
    }

    it("none never reminds", () => {
      expect(chooseReminder(ctx({ policy: "none", minutesUntilDue: 0, missedRecently: 5 }))).toBe(false);
    });
  });

  describe("recovery", () => {
    it("reminds only when something was missed recently", () => {
      expect(chooseReminder(ctx({ policy: "recovery", missedRecently: 1 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "recovery", missedRecently: 0 }))).toBe(false);
    });

    it("ignores how close the due time is", () => {
      expect(chooseReminder(ctx({ policy: "recovery", missedRecently: 0, minutesUntilDue: 0 }))).toBe(false);
      expect(chooseReminder(ctx({ policy: "recovery", missedRecently: 2, minutesUntilDue: 5000 }))).toBe(true);
    });
  });

  describe("at_time", () => {
    it("reminds at or after the due time", () => {
      expect(chooseReminder(ctx({ policy: "at_time", minutesUntilDue: 0 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "at_time", minutesUntilDue: -15 }))).toBe(true);
    });

    it("waits while the commitment is still in the future", () => {
      expect(chooseReminder(ctx({ policy: "at_time", minutesUntilDue: 1 }))).toBe(false);
    });
  });

  describe("advance", () => {
    it("reminds within the two hours before the due time", () => {
      expect(chooseReminder(ctx({ policy: "advance", minutesUntilDue: 1 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "advance", minutesUntilDue: 120 }))).toBe(true);
    });

    it("does not remind more than two hours ahead", () => {
      expect(chooseReminder(ctx({ policy: "advance", minutesUntilDue: 121 }))).toBe(false);
    });

    it("does not remind once the due time has arrived (that is what at_time is for)", () => {
      expect(chooseReminder(ctx({ policy: "advance", minutesUntilDue: 0 }))).toBe(false);
      expect(chooseReminder(ctx({ policy: "advance", minutesUntilDue: -10 }))).toBe(false);
    });
  });

  describe("single", () => {
    it("reminds within the final hour", () => {
      expect(chooseReminder(ctx({ policy: "single", minutesUntilDue: 60 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "single", minutesUntilDue: 1 }))).toBe(true);
    });

    it("also reminds when the commitment is already overdue", () => {
      expect(chooseReminder(ctx({ policy: "single", minutesUntilDue: -30 }))).toBe(true);
    });

    it("stays quiet beyond one hour", () => {
      expect(chooseReminder(ctx({ policy: "single", minutesUntilDue: 61 }))).toBe(false);
    });
  });

  describe("adaptive", () => {
    it("reminds within two hours of the due time", () => {
      expect(chooseReminder(ctx({ policy: "adaptive", minutesUntilDue: 120 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "adaptive", minutesUntilDue: -5 }))).toBe(true);
    });

    it("stays quiet further out when nothing was missed", () => {
      expect(chooseReminder(ctx({ policy: "adaptive", minutesUntilDue: 121, missedRecently: 0 }))).toBe(false);
    });

    it("reminds earlier when something was missed recently", () => {
      expect(chooseReminder(ctx({ policy: "adaptive", minutesUntilDue: 121, missedRecently: 1 }))).toBe(true);
      expect(chooseReminder(ctx({ policy: "adaptive", minutesUntilDue: 10000, missedRecently: 3 }))).toBe(true);
    });
  });
});
