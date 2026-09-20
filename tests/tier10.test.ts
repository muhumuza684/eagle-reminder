import assert from "node:assert/strict";
import * as mod from "../lib/tier10/review-&-recovery.ts";
console.log("Tier 10 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
