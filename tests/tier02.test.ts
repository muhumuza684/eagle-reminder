import { describe, expect, it } from "vitest";
import {
  enqueueMutation,
  replayMutations,
  type Mutation,
} from "../lib/tier02/local-first-ledger";
import { eagleId, type Commitment } from "../lib/tier01/foundation";

describe("Tier 02 — Local-First Ledger", () => {
  const commitment: Commitment = {
    id: eagleId("commitment-1"),
    title: "Ship D-Eagle",
    kind: "action",
    state: "planned",
    createdAt: "2026-09-20T08:00:00.000Z",
  };

  it("deduplicates mutations by mutation id", () => {
    const mutation: Mutation = {
      id: "mutation-1",
      type: "create",
      commitment,
      createdAt: "2026-09-20T08:01:00.000Z",
    };

    const once = enqueueMutation([], mutation);
    const twice = enqueueMutation(once, mutation);

    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(1);
    expect(twice[0]).toEqual(mutation);
  });

  it("replays create, update, and state mutations", () => {
    const mutations: Mutation[] = [
      {
        id: "mutation-1",
        type: "create",
        commitment,
        createdAt: "2026-09-20T08:01:00.000Z",
      },
      {
        id: "mutation-2",
        type: "update",
        commitmentId: commitment.id,
        patch: {
          title: "Ship D-Eagle Hub",
          nextAction: "Run the release gate",
        },
        createdAt: "2026-09-20T08:02:00.000Z",
      },
      {
        id: "mutation-3",
        type: "state",
        commitmentId: commitment.id,
        state: "active",
        createdAt: "2026-09-20T08:03:00.000Z",
      },
    ];

    const result = replayMutations([], mutations);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: commitment.id,
      title: "Ship D-Eagle Hub",
      nextAction: "Run the release gate",
      state: "active",
    });
  });

  it("does not duplicate an existing commitment during replay", () => {
    const existing: Commitment = {
      ...commitment,
      title: "Existing commitment",
    };

    const create: Mutation = {
      id: "mutation-1",
      type: "create",
      commitment,
      createdAt: "2026-09-20T08:01:00.000Z",
    };

    const result = replayMutations([existing], [create]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Existing commitment");
  });
});
