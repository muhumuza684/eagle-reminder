import { describe, expect, it } from "vitest";
import {
  ready,
  offline,
  failure,
  type ScreenState,
} from "../lib/tier04/ux-state-model";

describe("Tier 04 — UX State Model", () => {
  it("represents loading and empty states", () => {
    const loading: ScreenState<string[]> = { kind: "loading" };
    const empty: ScreenState<string[]> = {
      kind: "empty",
      message: "No commitments yet.",
    };

    expect(loading).toEqual({ kind: "loading" });
    expect(empty).toEqual({
      kind: "empty",
      message: "No commitments yet.",
    });
  });

  it("creates a ready state with data", () => {
    expect(ready(["commitment-1", "commitment-2"])).toEqual({
      kind: "ready",
      data: ["commitment-1", "commitment-2"],
    });
  });

  it("creates a retryable error by default", () => {
    expect(failure("Unable to load commitments.")).toEqual({
      kind: "error",
      message: "Unable to load commitments.",
      retryable: true,
    });
  });

  it("supports non-retryable errors", () => {
    expect(failure("This action cannot be completed.", false)).toEqual({
      kind: "error",
      message: "This action cannot be completed.",
      retryable: false,
    });
  });

  it("creates an offline state with optional cached data", () => {
    expect(offline(["cached-commitment"])).toEqual({
      kind: "offline",
      data: ["cached-commitment"],
    });

    expect(offline()).toEqual({
      kind: "offline",
    });
  });

  it("keeps all product states discriminated by kind", () => {
    const states: ScreenState<null>[] = [
      { kind: "loading" },
      { kind: "empty", message: "Nothing here." },
      ready(null),
      failure("Something went wrong."),
      offline(),
    ];

    expect(states.map((state) => state.kind)).toEqual([
      "loading",
      "empty",
      "ready",
      "error",
      "offline",
    ]);
  });
});
