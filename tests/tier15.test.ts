import { describe, expect, it } from "vitest";
import { parseVoiceIntent } from "../lib/tier15/voice-intent-layer";

describe("Tier 15 - voice intent layer", () => {
  describe("complete", () => {
    it("recognises done / completed / finished and extracts the target", () => {
      expect(parseVoiceIntent("Buy milk done")).toEqual({ kind: "complete", text: "Buy milk done", target: "Buy milk" });
      expect(parseVoiceIntent("finished the report")).toEqual({ kind: "complete", text: "finished the report", target: "the report" });
      expect(parseVoiceIntent("laundry completed")).toEqual({ kind: "complete", text: "laundry completed", target: "laundry" });
    });

    it("is case-insensitive and trims the text", () => {
      expect(parseVoiceIntent("  Done with laundry  ")).toEqual({ kind: "complete", text: "Done with laundry", target: "with laundry" });
    });
  });

  describe("reschedule", () => {
    it("recognises move / reschedule / postpone", () => {
      for (const phrase of ["move the dentist to friday", "reschedule my review", "postpone the launch"]) {
        const intent = parseVoiceIntent(phrase);
        expect(intent.kind).toBe("reschedule");
        expect(intent.text).toBe(phrase);
      }
    });

    it("does not invent a target or a time", () => {
      const intent = parseVoiceIntent("postpone the launch");
      expect(intent.target).toBeUndefined();
      expect(intent.time).toBeUndefined();
    });
  });

  describe("query", () => {
    it("recognises questions and list requests", () => {
      for (const phrase of ["What is due today?", "show my tasks", "list overdue items", "Which project is blocked"]) {
        const intent = parseVoiceIntent(phrase);
        expect(intent.kind).toBe("query");
        expect(intent.text).toBe(phrase);
      }
    });

    it("is case-insensitive", () => {
      expect(parseVoiceIntent("SHOW me everything").kind).toBe("query");
    });
  });

  describe("create (default)", () => {
    it("treats anything else as a new commitment and keeps the text as spoken", () => {
      expect(parseVoiceIntent("Buy milk")).toEqual({ kind: "create", text: "Buy milk" });
      expect(parseVoiceIntent("  Call the plumber tomorrow ")).toEqual({ kind: "create", text: "Call the plumber tomorrow" });
    });
  });

  it("never returns an intent kind outside the documented four", () => {
    for (const phrase of ["Buy milk", "done", "move it", "what now", "", "   "]) {
      expect(["create", "complete", "reschedule", "query"]).toContain(parseVoiceIntent(phrase).kind);
    }
  });
});
