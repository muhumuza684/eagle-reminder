import { describe, expect, it } from "vitest";
import { formatHHMM, greeting, relativeTime } from "./format";

const NOW = new Date(2026, 9, 1, 15, 0, 0, 0);
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60000);

describe("relativeTime", () => {
  it("speaks in minutes, hours and days", () => {
    expect(relativeTime(at(0), NOW)).toBe("right now");
    expect(relativeTime(at(25), NOW)).toBe("in 25 min");
    expect(relativeTime(at(60), NOW)).toBe("in 1 h");
    expect(relativeTime(at(135), NOW)).toBe("in 2 h 15 min");
    expect(relativeTime(at(3 * 1440), NOW)).toBe("in 3 d");
  });
});

describe("greeting and clock text", () => {
  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 9, 1, 8))).toBe("Good morning");
    expect(greeting(new Date(2026, 9, 1, 15))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 9, 1, 21))).toBe("Good evening");
  });

  it("formats HH:MM with leading zeros", () => {
    expect(formatHHMM(new Date(2026, 9, 1, 7, 5))).toBe("07:05");
  });
});
