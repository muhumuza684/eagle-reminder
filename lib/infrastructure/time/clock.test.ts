import { describe, expect, it } from "vitest";
import { localDateKey } from "./clock";

describe("localDateKey", () => {
  it("uses the requested timezone instead of process timezone", () => {
    const instant = new Date("2026-09-13T23:30:00.000Z");
    expect(localDateKey(instant, "Pacific/Auckland")).toBe("2026-09-14");
    expect(localDateKey(instant, "America/Los_Angeles")).toBe("2026-09-13");
  });
});
