import { describe, expect, it } from "vitest";
import { proposeCapture } from "../lib/tier05/capture-intelligence";

describe("Tier 05 - capture intelligence", () => {
  it("proposes a project with a due day, a next action and two reasons", () => {
    const p = proposeCapture("Finish the website launch by friday");
    expect(p.kind).toBe("project");
    expect(p.title).toBe("Finish the website launch");
    expect(p.dueAt).toBe("friday");
    expect(p.nextAction).toBe("Define the next concrete step.");
    expect(p.reasons).toEqual([
      "language suggests a multi-step outcome",
      "time expression detected",
    ]);
    expect(p.confidence).toBeCloseTo(0.91, 5);
  });

  it("treats plain input as an action and keeps the due word in the title when no by/before is used", () => {
    const p = proposeCapture("Call mom tomorrow");
    expect(p.kind).toBe("action");
    expect(p.title).toBe("Call mom tomorrow");
    expect(p.dueAt).toBe("tomorrow");
    expect(p.nextAction).toBeUndefined();
    expect(p.reasons).toEqual(["time expression detected"]);
    expect(p.confidence).toBeCloseTo(0.73, 5);
  });

  it("gives the lowest confidence and no reasons when nothing is inferred", () => {
    const p = proposeCapture("Buy milk");
    expect(p.kind).toBe("action");
    expect(p.dueAt).toBeUndefined();
    expect(p.nextAction).toBeUndefined();
    expect(p.reasons).toEqual([]);
    expect(p.confidence).toBeCloseTo(0.55, 5);
  });

  it("strips a 'before <day>' clause from the title and records the day", () => {
    const p = proposeCapture("Pay rent before tomorrow");
    expect(p.title).toBe("Pay rent");
    expect(p.dueAt).toBe("tomorrow");
  });

  it("matches days and keywords case-insensitively and reports the day in lower case", () => {
    const p = proposeCapture("Send report BY Monday");
    expect(p.kind).toBe("project");
    expect(p.title).toBe("Send report");
    expect(p.dueAt).toBe("monday");
  });

  describe("project keywords match whole words", () => {
    it("does not read a keyword inside another word (happy, apples, wrapped)", () => {
      for (const input of ["Call happy customers", "Buy apples", "Pick up the mapped route"]) {
        const p = proposeCapture(input);
        expect(p.kind).toBe("action");
        expect(p.nextAction).toBeUndefined();
        expect(p.reasons).toEqual([]);
      }
    });

    it("still recognises every keyword on its own", () => {
      for (const input of ["Plan the project", "Build the website", "Ship the app", "Prepare the launch", "Write the report"]) {
        expect(proposeCapture(input).kind).toBe("project");
      }
    });

    it("still recognises common inflections", () => {
      for (const input of ["Review the projects", "Update the apps", "Two launches this year", "Finish the reports", "Launching next month", "Reported yesterday"]) {
        expect(proposeCapture(input).kind).toBe("project");
      }
    });

    it("does not match a keyword that is only a prefix of a longer word", () => {
      for (const input of ["Renew my application", "Ask the reporter", "Meet the projectionist"]) {
        expect(proposeCapture(input).kind).toBe("action");
      }
    });
  });

  it("trims surrounding whitespace from the title", () => {
    expect(proposeCapture("   Buy milk  ").title).toBe("Buy milk");
  });

  it("captures the first weekday mentioned", () => {
    expect(proposeCapture("Meet Sam on monday or tuesday").dueAt).toBe("monday");
  });

  it("keeps confidence inside (0, 1) and explains every inference it makes", () => {
    for (const input of [
      "Buy milk",
      "Call mom tomorrow",
      "Launch the app by friday",
      "Finish the website launch by friday",
    ]) {
      const p = proposeCapture(input);
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(0.98);
      if (p.kind === "project") expect(p.reasons).toContain("language suggests a multi-step outcome");
      if (p.dueAt) expect(p.reasons).toContain("time expression detected");
    }
  });
});
