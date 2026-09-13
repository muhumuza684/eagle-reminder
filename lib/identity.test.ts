import { describe, expect, it } from "vitest";
import { createClientId, isClientId } from "./identity";

describe("identity", () => {
  it("creates UUIDv4 client identities", () => {
    const id = createClientId();
    expect(isClientId(id)).toBe(true);
    expect(id).not.toBe(createClientId());
  });
});
