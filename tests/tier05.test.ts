import assert from "node:assert/strict";
import * as mod from "../lib/tier05/capture-intelligence.ts";
console.log("Tier 05 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
