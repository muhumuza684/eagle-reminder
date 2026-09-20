import { describe, expect, it } from "vitest";
import { blockers, dependents } from "../lib/tier12/commitment-graph";
import type { CommitmentGraph } from "../lib/tier12/commitment-graph";

const graph: CommitmentGraph = {
  nodes: [
    { id: "goal", type: "goal" },
    { id: "project", type: "project" },
    { id: "milestone", type: "milestone" },
    { id: "a1", type: "action" },
    { id: "a2", type: "action" },
    { id: "a3", type: "action" },
  ],
  edges: [
    { from: "goal", to: "project", type: "contains" },
    { from: "project", to: "milestone", type: "contains" },
    { from: "milestone", to: "a1", type: "contains" },
    { from: "a1", to: "a2", type: "blocks" },
    { from: "a3", to: "a2", type: "blocks" },
    { from: "a2", to: "a1", type: "depends_on" },
    { from: "milestone", to: "a2", type: "depends_on" },
  ],
};

const empty: CommitmentGraph = { nodes: [], edges: [] };

describe("Tier 12 - commitment graph", () => {
  describe("blockers", () => {
    it("lists every node that blocks the given node, in edge order", () => {
      expect(blockers(graph, "a2")).toEqual(["a1", "a3"]);
    });

    it("follows 'blocks' edges in their direction only", () => {
      // a1 blocks a2, but nothing blocks a1
      expect(blockers(graph, "a1")).toEqual([]);
    });

    it("ignores 'contains' and 'depends_on' edges", () => {
      expect(blockers(graph, "project")).toEqual([]);
      expect(blockers(graph, "milestone")).toEqual([]);
    });

    it("returns an empty list for an unknown node", () => {
      expect(blockers(graph, "does-not-exist")).toEqual([]);
    });

    it("returns an empty list for an empty graph", () => {
      expect(blockers(empty, "a1")).toEqual([]);
    });
  });

  describe("dependents", () => {
    // Current behaviour: it follows 'depends_on' edges that leave the given node
    // and returns their targets (the edge `{ from: "a2", to: "a1" }` yields "a1" for "a2").
    it("returns the targets of depends_on edges leaving the node, in edge order", () => {
      expect(dependents(graph, "a2")).toEqual(["a1"]);
      expect(dependents(graph, "milestone")).toEqual(["a2"]);
    });

    it("returns nothing for a node that has no outgoing depends_on edge", () => {
      expect(dependents(graph, "a1")).toEqual([]);
    });

    it("ignores 'contains' and 'blocks' edges", () => {
      expect(dependents(graph, "goal")).toEqual([]);
      expect(dependents(graph, "a3")).toEqual([]);
    });

    it("returns an empty list for an unknown node or an empty graph", () => {
      expect(dependents(graph, "does-not-exist")).toEqual([]);
      expect(dependents(empty, "a1")).toEqual([]);
    });

    it("collects several depends_on targets", () => {
      const g: CommitmentGraph = {
        nodes: [
          { id: "x", type: "action" },
          { id: "y", type: "action" },
          { id: "z", type: "action" },
        ],
        edges: [
          { from: "x", to: "y", type: "depends_on" },
          { from: "x", to: "z", type: "depends_on" },
        ],
      };
      expect(dependents(g, "x")).toEqual(["y", "z"]);
    });
  });
});
