import { describe, expect, it } from "vitest";
import { enqueueMutation, nextReadyMutation, retryMutation } from "./mutation-queue";

describe("mutation queue", () => {
  it("deduplicates the same client revision", () => {
    const a = { id:"1", clientId:"c", revision:1, operation:"update" as const, payload:{}, };
    expect(enqueueMutation(enqueueMutation([], a), a)).toHaveLength(1);
  });
  it("backs off retries", () => {
    const m = { id:"1", clientId:"c", revision:1, operation:"update" as const, payload:{}, attempts:0, createdAt:"2026-01-01T00:00:00.000Z", nextAttemptAt:"2026-01-01T00:00:00.000Z" };
    expect(new Date(retryMutation(m).nextAttemptAt).getTime()).toBeGreaterThan(new Date(m.nextAttemptAt).getTime());
  });
  it("returns the oldest ready mutation", () => {
    const m = { id:"1", clientId:"c", revision:1, operation:"update" as const, payload:{}, attempts:0, createdAt:"2026-01-01T00:00:00.000Z", nextAttemptAt:"2026-01-01T00:00:00.000Z" };
    expect(nextReadyMutation([m], new Date("2026-01-02T00:00:00.000Z"))?.id).toBe("1");
  });
});
