import { describe, expect, it } from "vitest";
import { resolveWarningMuted } from "./warning-overrides";

describe("warning-override precedence", () => {
  it("falls back to the global setting when there is no per-commitment override", () => {
    expect(resolveWarningMuted(true, undefined)).toBe(true);
    expect(resolveWarningMuted(false, undefined)).toBe(false);
  });

  it("lets an explicit per-commitment override always win over the global setting", () => {
    expect(resolveWarningMuted(true, false)).toBe(false);
    expect(resolveWarningMuted(false, true)).toBe(true);
  });
});
