import assert from "node:assert/strict";
import * as mod from "../lib/tier12/commitment-graph.ts";
console.log("Tier 12 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
