import assert from "node:assert/strict";
import * as mod from "../lib/tier17/ethical-monetization.ts";
console.log("Tier 17 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
