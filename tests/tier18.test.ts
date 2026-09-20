import assert from "node:assert/strict";
import * as mod from "../lib/tier18/final-product-constitution.ts";
console.log("Tier 18 module exports:", Object.keys(mod).join(", "));
assert.ok(Object.keys(mod).length > 0);
