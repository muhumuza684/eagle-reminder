import { describe, expect, it } from "vitest";
import {
  telemetryDecision,
  notificationPreview,
  type PrivacyClass,
} from "../lib/tier03/privacy-by-design";

describe("Tier 03 — Privacy by Design", () => {
  it("allows only approved operational telemetry fields", () => {
    expect(telemetryDecision("event").allowed).toBe(true);
    expect(telemetryDecision("version").allowed).toBe(true);
    expect(telemetryDecision("platform").allowed).toBe(true);
    expect(telemetryDecision("durationMs").allowed).toBe(true);
    expect(telemetryDecision("success").allowed).toBe(true);
  });

  it("rejects unknown or potentially identifying telemetry fields", () => {
    const decision = telemetryDecision("email");

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("unknown");
  });

  it("keeps minimal notification previews free of commitment content", () => {
    const preview = notificationPreview(
      "Pay electricity bill",
      "Your bill is due tomorrow.",
      "minimal",
    );

    expect(preview).toEqual({
      title: "D-Eagle",
      body: "You have a commitment that needs attention.",
    });

    expect(preview.body).not.toContain("electricity");
    expect(preview.body).not.toContain("tomorrow");
  });

  it("preserves content when full notification privacy is explicitly selected", () => {
    expect(
      notificationPreview(
        "Pay electricity bill",
        "Your bill is due tomorrow.",
        "full",
      ),
    ).toEqual({
      title: "Pay electricity bill",
      body: "Your bill is due tomorrow.",
    });
  });

  it("exposes the intended privacy classes", () => {
    const classes: PrivacyClass[] = [
      "public",
      "personal",
      "sensitive",
    ];

    expect(classes).toHaveLength(3);
  });
});
