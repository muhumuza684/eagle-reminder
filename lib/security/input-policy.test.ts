import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, sanitizePlainText } from "./input-policy";

describe("input policy", () => {
  it("removes control characters and bounds text", () => expect(sanitizePlainText(" a\u0000b ",2)).toBe("ab"));
  it("allows only supported HTTPS meeting hosts", () => { expect(isSafeExternalUrl("https://meet.google.com/abc")).toBe(true); expect(isSafeExternalUrl("http://meet.google.com/abc")).toBe(false); expect(isSafeExternalUrl("https://example.com")).toBe(false); });
});
