import assert from "node:assert/strict";
import * as mod from "../lib/tier14/attention-protection.ts";
console.log("Tier 14 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
